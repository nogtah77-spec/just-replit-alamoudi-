import { Router, type IRouter } from "express";

const router: IRouter = Router();

const THUMB_HOST_RE = /(^|\.)(tiktokcdn(-us)?\.com|tiktokcdn-eu\.com|ttwstatic\.com|tiktok\.com)$/i;
const MAX_BYTES = 5 * 1024 * 1024;

router.get("/tiktok/resolve", async (req, res) => {
  let videoUrl = typeof req.query.url === "string" ? req.query.url.trim() : "";
  if (!videoUrl) {
    res.status(400).json({ error: "missing url" });
    return;
  }
  if (!/^https?:\/\//i.test(videoUrl)) videoUrl = `https://${videoUrl}`;
  let videoHost: string;
  try {
    videoHost = new URL(videoUrl).hostname.toLowerCase();
  } catch {
    res.status(400).json({ error: "invalid url" });
    return;
  }
  if (!/(^|\.)tiktok\.com$/.test(videoHost)) {
    res.status(400).json({ error: "not a tiktok url" });
    return;
  }

  try {
    let url = videoUrl;
    for (let hop = 0; hop < 5; hop++) {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        res.status(400).json({ error: "invalid redirect url" });
        return;
      }
      if (parsed.protocol !== "https:" || !/(^|\.)tiktok\.com$/.test(parsed.hostname.toLowerCase())) {
        res.status(400).json({ error: "untrusted redirect target" });
        return;
      }

      const direct = url.match(/\/video\/(\d{6,})/);
      if (direct) {
        res.setHeader("Cache-Control", "public, max-age=86400");
        res.json({ videoId: direct[1], canonicalUrl: url });
        return;
      }

      const r = await fetch(url, {
        method: "GET",
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(8000),
      });
      const location = r.headers.get("location");
      if (r.status >= 300 && r.status < 400 && location) {
        url = new URL(location, url).toString();
        continue;
      }
      break;
    }
    res.status(404).json({ error: "no video id" });
  } catch (err) {
    req.log.error({ err }, "tiktok resolve failed");
    res.status(502).json({ error: "resolve error" });
  }
});

router.get("/tiktok/thumbnail", async (req, res) => {
  let videoUrl = typeof req.query.url === "string" ? req.query.url.trim() : "";
  if (!videoUrl) {
    res.status(400).json({ error: "missing url" });
    return;
  }
  if (!/^https?:\/\//i.test(videoUrl)) videoUrl = `https://${videoUrl}`;
  let videoHost: string;
  try {
    videoHost = new URL(videoUrl).hostname.toLowerCase();
  } catch {
    res.status(400).json({ error: "invalid url" });
    return;
  }
  if (!/(^|\.)tiktok\.com$/.test(videoHost)) {
    res.status(400).json({ error: "not a tiktok url" });
    return;
  }
  try {
    const oembedRes = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`,
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) },
    );
    if (!oembedRes.ok) {
      res.status(502).json({ error: "oembed failed" });
      return;
    }
    const data = (await oembedRes.json()) as { thumbnail_url?: string };
    const thumb = data.thumbnail_url;
    if (!thumb) {
      res.status(404).json({ error: "no thumbnail" });
      return;
    }

    let thumbHost: string;
    try {
      const parsed = new URL(thumb);
      if (parsed.protocol !== "https:" || !THUMB_HOST_RE.test(parsed.hostname)) {
        res.status(502).json({ error: "untrusted thumbnail host" });
        return;
      }
      thumbHost = parsed.hostname;
    } catch {
      res.status(502).json({ error: "bad thumbnail url" });
      return;
    }

    const imgRes = await fetch(thumb, {
      headers: { "User-Agent": "Mozilla/5.0", Referer: "https://www.tiktok.com/" },
      signal: AbortSignal.timeout(8000),
    });
    if (!imgRes.ok) {
      res.status(502).json({ error: "image fetch failed" });
      return;
    }
    const contentType = imgRes.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      res.status(502).json({ error: "not an image" });
      return;
    }
    const buf = Buffer.from(await imgRes.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) {
      res.status(502).json({ error: "image too large" });
      return;
    }

    req.log.info({ thumbHost, bytes: buf.byteLength }, "tiktok thumbnail served");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", buf.byteLength);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.end(buf);
  } catch (err) {
    req.log.error({ err }, "tiktok thumbnail proxy failed");
    res.status(502).json({ error: "proxy error" });
  }
});

export default router;
