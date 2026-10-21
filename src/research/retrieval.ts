import { createHash } from "node:crypto";
import { policy } from "./contracts";
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex").slice(0, 24);
export function normalize(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}
export function canonicalUrl(value: string) {
  const url = new URL(value);
  // This adapter has NO network capability. Only fixture-owned HTTPS hosts are allowed.
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !/^sources\.example$/.test(url.hostname)
  )
    throw Error("Source URL is outside the offline fixture registry.");
  url.hash = "";
  for (const key of [...url.searchParams.keys()])
    if (key.startsWith("utm_") || key === "ref") url.searchParams.delete(key);
  url.searchParams.sort();
  return url.toString();
}
export interface FixtureSource {
  body: string;
  status?: number;
  redirect?: string;
  latencyMs?: number;
}
export class FixtureRetriever {
  readonly mode = "synthetic";
  calls = 0;
  bytes = 0;
  elapsedMs = 0;
  constructor(
    private registry: Record<string, FixtureSource>,
    private limits: {
      maxSources: number;
      maxBytes: number;
      maxRedirects: number;
      maxRuntimeMs: number;
    } = {
      maxSources: policy.maxSources,
      maxBytes: policy.maxBytes,
      maxRedirects: policy.maxRedirects,
      maxRuntimeMs: policy.maxRuntimeMs,
    },
  ) {}
  retrieve(input: string) {
    let url = canonicalUrl(input);
    const seen = new Set<string>();
    for (let hop = 0; hop <= this.limits.maxRedirects; hop++) {
      if (this.calls >= this.limits.maxSources)
        throw Error("Source limit reached.");
      if (seen.has(url)) throw Error("Source redirect loop.");
      seen.add(url);
      this.calls++;
      const source = this.registry[url];
      if (!source) throw Error("Source unavailable in fixture registry.");
      this.elapsedMs += source.latencyMs ?? 0;
      if (this.elapsedMs > this.limits.maxRuntimeMs)
        throw Error("Retrieval runtime limit reached.");
      if (source.redirect) {
        url = canonicalUrl(new URL(source.redirect, url).toString());
        continue;
      }
      if ((source.status ?? 200) !== 200)
        throw Error("Source unavailable in fixture registry.");
      const bytes = Buffer.byteLength(source.body, "utf8");
      if (bytes > this.limits.maxBytes)
        throw Error("Source size limit reached.");
      this.bytes += bytes;
      return { url, body: source.body, hash: digest(source.body) };
    }
    throw Error("Source redirect limit reached.");
  }
}
