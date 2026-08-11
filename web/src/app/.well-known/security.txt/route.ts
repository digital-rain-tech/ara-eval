/**
 * GET /.well-known/security.txt
 *
 * RFC 9116 security contact record. Served from a route handler rather than a
 * static file so `Expires` is computed per request — a hardcoded date silently
 * lapses and reads as an abandoned project.
 */
export const dynamic = "force-dynamic";

const EXPIRES_DAYS = 90;

export async function GET() {
  const expires = new Date(Date.now() + EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  const body = [
    "Contact: mailto:security@digitalrain.studio",
    "Contact: https://github.com/digital-rain-tech/ara-eval/security/advisories/new",
    `Expires: ${expires.toISOString()}`,
    "Preferred-Languages: en",
    "Canonical: https://app.ara-eval.org/.well-known/security.txt",
    "Policy: https://github.com/digital-rain-tech/ara-eval/blob/main/SECURITY.md",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
