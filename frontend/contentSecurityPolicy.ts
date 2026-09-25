import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// Hash only the owned pre-paint bootstrap, with HTML parser newline normalization.
const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const theme = html.match(/<script id="theme-bootstrap">([\s\S]*?)<\/script>/)?.[1];
if (!theme) throw new Error("The local theme bootstrap is missing.");
const themeHash = createHash("sha256").update(theme.replace(/\r\n?/g, "\n")).digest("base64");

export function contentSecurityPolicy(hmrHost?: string): string {
  if (hmrHost !== undefined && !/^(?:127\.0\.0\.1|localhost):[1-9][0-9]{0,4}$/.test(hmrHost)) {
    throw new Error("The local HMR destination is invalid.");
  }
  return [
    "default-src 'none'",
    `script-src 'self' 'sha256-${themeHash}'`,
    // Vite and MathLive inject CSS; layout also uses inline style attributes.
    // This exception applies to styles only, never scripts or network hosts.
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data:",
    `connect-src 'self'${hmrHost ? ` ws://${hmrHost}` : ""}`,
    "media-src 'none'", "object-src 'none'", "frame-src 'none'",
    "worker-src 'none'", "base-uri 'none'", "form-action 'none'",
  ].join("; ") + ";";
}

/** Embedding restrictions require an HTTP header; browsers ignore them in meta. */
export function localContentSecurityPolicy(hmrHost?: string): string {
  return contentSecurityPolicy(hmrHost) + " frame-ancestors 'none';";
}
