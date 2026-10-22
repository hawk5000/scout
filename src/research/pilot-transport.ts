import {
  SourceError,
  limits,
  providerHttpRequest,
  type SourceRequest,
  type SourceTransport,
} from "./source-adapters";

export type SourceGrant = { host: string; paths: string[] };
// A future real connector must pin DNS answers to the socket and validate TLS for
// the original hostname. No implementation using ordinary fetch is supplied.
export interface PinnedFixtureConnector {
  readonly mode: "synthetic";
  resolve(host: string): Promise<string[]>;
  open(
    request: SourceRequest,
    addresses: readonly string[],
    signal: AbortSignal,
  ): Promise<{
    status: number;
    contentType: string;
    chunks: AsyncIterable<Uint8Array>;
  }>;
}
export function publicV4(address: string) {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(address)) return false;
  const p = address.split(".").map(Number);
  if (p.some((n, i) => n > 255 || String(n) !== address.split(".")[i]))
    return false;
  const [a, b] = p;
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0)
  );
}
export class PilotTransport implements SourceTransport {
  readonly mode = "synthetic";
  constructor(
    private connector: PinnedFixtureConnector,
    private grants: SourceGrant[],
    private guard: () => Promise<void>,
  ) {}
  async exchange(request: SourceRequest, signal?: AbortSignal) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) controller.abort();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        this.read(request, controller.signal),
        new Promise<never>((_, reject) => {
          const fail = () => reject(new SourceError("SOURCE_TIMEOUT"));
          if (controller.signal.aborted) fail();
          else
            controller.signal.addEventListener("abort", fail, { once: true });
          timer = setTimeout(abort, limits.timeoutMs);
        }),
      ]);
    } finally {
      controller.abort();
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  }
  private async read(request: SourceRequest, signal: AbortSignal) {
    if (this.connector.mode !== "synthetic")
      throw new SourceError("LIVE_DISABLED");
    await this.guard();
    if (signal.aborted) throw new SourceError("SOURCE_TIMEOUT");
    const url = new URL(request.url);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.hash
    )
      throw new SourceError("SOURCE_NOT_GRANTED");
    if (request.credential)
      providerHttpRequest(request, "fixture-not-a-credential");
    else {
      if (
        request.method !== "GET" ||
        request.body ||
        !this.grants.some(
          (g) =>
            g.host === url.hostname &&
            g.paths.some(
              (p) =>
                p.startsWith("/") &&
                (url.pathname === p ||
                  url.pathname.startsWith(p.endsWith("/") ? p : p + "/")),
            ),
        )
      )
        throw new SourceError("SOURCE_NOT_GRANTED");
      if (/%2f|%5c|%2e/i.test(url.pathname))
        throw new SourceError("SOURCE_NOT_GRANTED");
    }
    const addresses = await this.connector.resolve(url.hostname);
    if (!addresses.length || addresses.some((a) => !publicV4(a)))
      throw new SourceError("SOURCE_ADDRESS_DENIED");
    await this.guard();
    if (signal.aborted) throw new SourceError("SOURCE_TIMEOUT");
    const response = await this.connector.open(
      request,
      Object.freeze([...addresses]),
      signal,
    );
    if (response.status !== 200)
      throw new SourceError(
        response.status >= 300 && response.status < 400
          ? "SOURCE_REDIRECT_DENIED"
          : "SOURCE_UNAVAILABLE",
      );
    let size = 0;
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let body = "";
    for await (const chunk of response.chunks) {
      if (signal.aborted) throw new SourceError("SOURCE_TIMEOUT");
      size += chunk.byteLength;
      if (size > limits.bytes) throw new SourceError("SOURCE_TOO_LARGE");
      body += decoder.decode(chunk, { stream: true });
    }
    if (signal.aborted) throw new SourceError("SOURCE_TIMEOUT");
    body += decoder.decode();
    return {
      status: response.status,
      contentType: response.contentType,
      body,
    };
  }
}
