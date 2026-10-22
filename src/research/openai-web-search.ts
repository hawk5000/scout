import type {
  SourceRequest,
  SourceResponse,
  SourceTransport,
} from "./source-adapters";
import { z } from "zod";
import {
  limits,
  providerHttpRequest,
  SourceError,
  sourceUrl,
  type BoundedSources,
} from "./source-adapters";
import { rateCard } from "./source-adapters";

const endpoint = "https://api.openai.com/v1/responses";

/** Worker-only adapter. Construct with the Worker secret; never with browser input. */
export class OpenAIWebSearchTransport implements SourceTransport {
  readonly mode = "live" as const;

  constructor(
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    if (!apiKey || /[\r\n]/.test(apiKey))
      throw new SourceError("OPENAI_NOT_CONFIGURED");
  }

  async exchange(
    request: SourceRequest,
    signal?: AbortSignal,
  ): Promise<SourceResponse> {
    if (
      request.url !== endpoint ||
      request.method !== "POST" ||
      request.credential !== "openai" ||
      !request.body
    )
      throw new SourceError("PROVIDER_ENDPOINT_INVALID");
    const init = providerHttpRequest(request, this.apiKey);
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) controller.abort();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const response = await Promise.race([
        this.fetcher(init, { signal: controller.signal }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new SourceError("SOURCE_TIMEOUT"));
          }, limits.timeoutMs);
        }),
      ]);
      if (response.redirected || (response.url && response.url !== endpoint))
        throw new SourceError("SOURCE_REDIRECT_DENIED");
      const contentType = response.headers.get("content-type") ?? "";
      if (response.status !== 200)
        return { status: response.status, contentType, body: "" };
      if (!contentType.toLowerCase().includes("application/json"))
        throw new SourceError("SOURCE_CONTENT_TYPE");
      const reader = response.body?.getReader();
      if (!reader) throw new SourceError("SOURCE_EMPTY");
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > limits.bytes) {
            await reader.cancel();
            throw new SourceError("SOURCE_TOO_LARGE");
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      const body = new TextDecoder("utf-8", { fatal: true }).decode(
        BufferConcat(chunks, size),
      );
      return { status: response.status, contentType, body };
    } catch (error) {
      if (error instanceof SourceError) throw error;
      throw new SourceError("SOURCE_INVALID_RESPONSE");
    } finally {
      controller.abort();
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  }
}

function BufferConcat(chunks: Uint8Array[], size: number) {
  const out = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

/**
 * Hard reserve for one Responses web-search request at GPT-6 Luna Standard.
 * Includes the documented long-context uplift and one search call. The caller
 * must reserve before dispatch and settle actual usage from the API response.
 */
export const openAiSearchMaximumMicros = 221_500;
export const openAiCycleMaximumMicros = openAiSearchMaximumMicros * 5;

/**
 * Builds only the fixed-host request. Domain filters come from server-owned
 * source grants; requireWebSearch prevents a model-only answer without a search.
 */
export function openAiWebSearchRequest(input: {
  model: string;
  prompt: string;
  allowedDomains: readonly string[];
  maxOutputTokens?: number;
}): SourceRequest {
  if (
    !input.prompt.trim() ||
    new TextEncoder().encode(input.prompt).byteLength > 12_000 ||
    !input.allowedDomains.length ||
    input.allowedDomains.length > 100 ||
    input.allowedDomains.some(
      (host) =>
        !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(
          host,
        ),
    )
  )
    throw new SourceError("SOURCE_SETUP_REQUIRED");
  const body = JSON.stringify({
    model: input.model,
    store: false,
    service_tier: "default",
    reasoning: { effort: "none" },
    max_output_tokens: Math.min(
      2000,
      Math.max(100, input.maxOutputTokens ?? 2000),
    ),
    max_tool_calls: 1,
    tool_choice: "required",
    tools: [
      {
        type: "web_search",
        search_context_size: "low",
        external_web_access: true,
        filters: { allowed_domains: [...new Set(input.allowedDomains)] },
      },
    ],
    include: ["web_search_call.action.sources"],
    input: input.prompt,
  });
  if (new TextEncoder().encode(body).byteLength > limits.requestBytes)
    throw new SourceError("INPUT_TOO_LARGE");
  return { url: endpoint, method: "POST", credential: "openai", body };
}

const webResponse = z.object({
  status: z.string(),
  usage: z.object({
    input_tokens: z.number().int().nonnegative(),
    output_tokens: z.number().int().nonnegative(),
  }),
  output: z.array(z.record(z.string(), z.unknown())).max(20),
});
const citationSource = z.object({
  url: z.url().max(2048),
  title: z.string().max(2000).optional(),
  type: z.string().optional(),
});

/** One bounded Responses web-search call. Results remain a draft until review. */
export async function searchWithOpenAI(input: {
  sources: BoundedSources;
  callKey: string;
  prompt: string;
  allowedDomains: readonly string[];
}) {
  const request = openAiWebSearchRequest({
    model: rateCard.model,
    prompt: input.prompt,
    allowedDomains: input.allowedDomains,
  });
  const response = await input.sources.request(
    input.callKey,
    request,
    openAiSearchMaximumMicros,
    openAiActualCostMicros,
  );
  if (!response.contentType.toLowerCase().includes("application/json"))
    throw new SourceError("SOURCE_CONTENT_TYPE");
  const parsed = webResponse.parse(JSON.parse(response.body));
  if (parsed.status !== "completed") throw new SourceError("SOURCE_INCOMPLETE");
  const allowed = [...new Set(input.allowedDomains)];
  const calls = parsed.output.filter((item) => item.type === "web_search_call");
  if (calls.length !== 1) throw new SourceError("SEARCH_NOT_PERFORMED");
  const action = calls[0].action as Record<string, unknown> | undefined;
  const actionSources = z
    .array(citationSource)
    .max(50)
    .parse(action?.sources ?? []);
  const sources = new Map<string, { url: string; title: string }>();
  for (const source of actionSources) {
    const url = sourceUrl(source.url, allowed);
    sources.set(url, { url, title: source.title ?? new URL(url).hostname });
  }
  const messages = parsed.output.filter((item) => item.type === "message");
  if (messages.length !== 1) throw new SourceError("RESEARCH_RESPONSE_INVALID");
  const content = z
    .array(z.record(z.string(), z.unknown()))
    .parse(messages[0].content ?? []);
  const text = content.find((part) => part.type === "output_text")?.text;
  if (typeof text !== "string" || text.length > 24_000)
    throw new SourceError("RESEARCH_RESPONSE_INVALID");
  const annotations = z
    .array(
      z
        .object({
          type: z.literal("url_citation"),
          url: z.url().max(2048),
          title: z.string().max(2000).optional(),
        })
        .passthrough(),
    )
    .parse(
      content.flatMap((part) =>
        Array.isArray(part.annotations) ? part.annotations : [],
      ),
    );
  const citations = annotations.map((annotation) => {
    const url = sourceUrl(annotation.url, allowed);
    if (!sources.has(url))
      throw new SourceError("CITATION_NOT_IN_SEARCH_RECEIPT");
    return { url, title: annotation.title ?? sources.get(url)!.title };
  });
  return {
    text,
    sources: [...sources.values()],
    citations: [...new Map(citations.map((c) => [c.url, c])).values()],
    usage: parsed.usage,
    status: citations.length
      ? ("review-required" as const)
      : sources.size
        ? ("uncited-summary" as const)
        : ("no-verifiable-sources" as const),
  };
}

/** Exact usage reconciliation: a missing/unknown tool count is not guessed. */
export function openAiActualCostMicros(raw: string) {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new SourceError("SOURCE_INVALID_RESPONSE");
  }
  if (!data || typeof data !== "object")
    throw new SourceError("SOURCE_INVALID_RESPONSE");
  const response = data as Record<string, unknown>;
  const usage = response.usage as Record<string, unknown> | undefined;
  const output = response.output;
  if (
    response.status !== "completed" ||
    !usage ||
    !Number.isSafeInteger(usage.input_tokens) ||
    !Number.isSafeInteger(usage.output_tokens) ||
    !Array.isArray(output)
  )
    return null;
  const searches = output.filter(
    (item) =>
      !!item &&
      typeof item === "object" &&
      (item as Record<string, unknown>).type === "web_search_call",
  ).length;
  if (
    searches > 1 ||
    (usage.input_tokens as number) > 1_050_000 ||
    (usage.output_tokens as number) > 2_000
  )
    throw new SourceError("USAGE_EXCEEDS_RESERVATION");
  const longContext = (usage.input_tokens as number) > 272_000;
  const inputRate = longContext ? 200_000 : 100_000;
  const outputRate = longContext ? 750_000 : 500_000;
  const tokens =
    (usage.input_tokens as number) * inputRate +
    (usage.output_tokens as number) * outputRate;
  // The API usage is authoritative; search charges count actual web-search items.
  return Math.ceil(tokens / 1_000_000) + searches * 10_000;
}

export function openAiConnectionRequest(apiKey: string) {
  if (!apiKey || /[\r\n]/.test(apiKey))
    throw new SourceError("OPENAI_NOT_CONFIGURED");
  return {
    request: new Request("https://api.openai.com/v1/models/gpt-6-luna", {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    }),
  };
}

export async function verifyOpenAiConnection(
  apiKey: string | undefined,
  fetcher: typeof fetch = fetch,
): Promise<"not_configured" | "valid" | "denied" | "unavailable"> {
  if (!apiKey) return "not_configured";
  try {
    const { request } = openAiConnectionRequest(apiKey);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), limits.timeoutMs);
    try {
      const response = await fetcher(request, { signal: controller.signal });
      return response.status === 200
        ? "valid"
        : response.status === 401 || response.status === 403
          ? "denied"
          : "unavailable";
    } finally {
      controller.abort();
      clearTimeout(timer);
    }
  } catch {
    return "unavailable";
  }
}
