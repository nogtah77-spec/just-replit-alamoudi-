import { Readable } from "node:stream";
import { Router, type IRouter, type Request, type Response } from "express";
import { requireStaff } from "../lib/auth";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();

router.post("/storage/uploads/request-url", requireStaff, async (req: Request, res: Response): Promise<void> => {
  const { name, size, contentType } = req.body ?? {};
  if (typeof name !== "string" || !name.trim() || typeof size !== "number" || size < 1 || size > 25 * 1024 * 1024 || typeof contentType !== "string") {
    res.status(400).json({ error: "اسم الملف وحجمه ونوعه مطلوبة، والحد الأقصى 25MB" });
    return;
  }
  try {
    const result = await storage.getUploadUrl();
    res.json({ ...result, metadata: { name, size, contentType } });
  } catch (error) {
    req.log.error({ err: error }, "Failed to generate contract upload URL");
    res.status(500).json({ error: "تعذر تجهيز رفع الملف" });
  }
});

router.get("/storage/objects/*path", requireStaff, async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = req.params.path;
    const objectPath = `/objects/${Array.isArray(raw) ? raw.join("/") : raw}`;
    const response = await storage.download(await storage.getFile(objectPath));
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
    else res.end();
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "file_not_found" });
      return;
    }
    req.log.error({ err: error }, "Failed to serve private object");
    res.status(500).json({ error: "تعذر فتح الملف" });
  }
});

export default router;