import policies from "./previewCapabilities.json" with { type: "json" };
import type { PreviewCapability, SearchResult } from "./types";

export function providerCapability(id: string): PreviewCapability {
  return (
    (policies.find((p) => p.id === id)?.capability as
      PreviewCapability | undefined) ?? "NativeCard"
  );
}
export function providerForUrl(url: string) {
  try {
    if (typeof url !== "string" || /[\u0000-\u0020\u007f\\]/u.test(url))
      return undefined;
    const parsed = new URL(url);
    if (
      !["https:", "http:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.port
    )
      return undefined;
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    return policies.find((p) => p.hosts.includes(host));
  } catch {
    return undefined;
  }
}
export function previewCapability(
  result: Pick<SearchResult, "source_id" | "url">,
): PreviewCapability {
  // Validate both declared provider and destination; a stale/corrupt result cannot
  // use an Embed provider ID to load an unrelated origin.
  const provider = providerForUrl(result.url);
  if (!provider || provider.id !== result.source_id) return "NativeCard";
  const capability = providerCapability(provider.id);
  // New embeddable providers also need an explicitly approved static origin.
  return capability === "Embed" && provider.id !== "falstad"
    ? "NativeCard"
    : capability;
}
export function resourceForUrl(url: string): SearchResult {
  const provider = providerForUrl(url);
  return {
    id: url,
    url,
    source_id: provider?.id ?? "unknown",
    source_name: provider?.id ?? "Resource",
    title: url,
    description: null,
    result_type: "unknown",
    tags: [],
    score: 0,
    thumbnail: null,
  };
}

/** Build the iframe destination from a static origin, never from a raw result URL.
 * URL property setters cannot turn a path/query/fragment into a different origin.
 * Parent frame-src CSP also rejects off-origin server/script redirects.
 */
export function resourceFrameUrl(
  result: Pick<SearchResult, "source_id" | "url">,
): string | null {
  if (previewCapability(result) !== "Embed") return null;
  const input = new URL(result.url);
  const destination = new URL("https://www.falstad.com/");
  destination.pathname = input.pathname;
  destination.search = input.search;
  destination.hash = input.hash;
  return destination.href;
}
