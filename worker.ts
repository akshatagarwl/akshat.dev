import handler from "vinext/server/fetch-handler";

// Security headers live here rather than in next.config.mjs, because the mere
// existence of a next.config file makes `wrangler deploy` autodetect a Next.js
// project and fail looking for the uninstalled `next` package. They cannot live
// in public/_headers either: that only reaches static assets, never
// Worker-rendered HTML.
const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src * blob: data:; media-src 'none'; connect-src *; font-src 'self' data:; frame-src 'self';",
  "Referrer-Policy": "origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-DNS-Prefetch-Control": "on",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

export default {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
    const response = await handler.fetch(request, env, ctx);
    const withHeaders = new Response(response.body, response);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      withHeaders.headers.set(name, value);
    }
    return withHeaders;
  },
};
