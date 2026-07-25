import { NextRequest, NextResponse } from "next/server";

/**
 * Firmware download proxy.
 *
 * Browsers cannot fetch firmware binaries directly from micropython.org
 * (the server sends no CORS headers). This route fetches the binary
 * server-side — where CORS does not apply — and streams it back to the
 * client from the same origin.
 *
 * Only an explicit allow-list of hosts is permitted to avoid turning this
 * into an open proxy / SSRF vector.
 */

const ALLOWED_HOSTS = new Set(["micropython.org", "www.micropython.org"]);

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "Invalid 'url' parameter" }, { status: 400 });
  }

  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json({ error: "Requested host is not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: { Accept: "application/octet-stream" },
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `Upstream responded ${upstream.status} ${upstream.statusText}` },
        { status: upstream.status || 502 }
      );
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      upstream.headers.get("content-type") ?? "application/octet-stream"
    );
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);
    headers.set("Cache-Control", "public, max-age=86400");

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Proxy fetch failed: ${message}` }, { status: 502 });
  }
}
