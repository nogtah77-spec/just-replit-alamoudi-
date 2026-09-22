import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { File, Storage } from "@google-cloud/storage";
import { getObjectAclPolicy, setObjectAclPolicy, type ObjectAclPolicy } from "./objectAcl";

const SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: { url: `${SIDECAR_ENDPOINT}/credential`, format: { type: "json", subject_token_field_name: "access_token" } },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
  }
}

export class ObjectStorageService {
  private privateDir() {
    const value = process.env.PRIVATE_OBJECT_DIR;
    if (!value) throw new Error("PRIVATE_OBJECT_DIR is not configured");
    return value.replace(/\/$/, "");
  }

  async getUploadUrl() {
    const objectName = `${this.privateDir()}/contracts/${randomUUID()}`;
    const { bucketName, objectName: path } = parseObjectPath(objectName);
    const uploadURL = await signObjectUrl({ bucketName, objectName: path, method: "PUT", ttlSec: 900 });
    return { uploadURL, objectPath: this.normalizeObjectEntityPath(uploadURL) };
  }

  normalizeObjectEntityPath(rawPath: string) {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) return rawPath;
    const pathname = new URL(rawPath).pathname;
    const prefix = `/${this.privateDir()}/`;
    return pathname.startsWith(prefix) ? `/objects/${pathname.slice(prefix.length)}` : pathname;
  }

  async getFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const { bucketName, objectName } = parseObjectPath(`${this.privateDir()}/${objectPath.slice("/objects/".length)}`);
    const file = objectStorageClient.bucket(bucketName).file(objectName);
    const [exists] = await file.exists();
    if (!exists) throw new ObjectNotFoundError();
    return file;
  }

  async download(file: File) {
    const [metadata] = await file.getMetadata();
    const stream = Readable.toWeb(file.createReadStream()) as ReadableStream;
    return new Response(stream, {
      headers: {
        "Content-Type": String(metadata.contentType || "application/octet-stream"),
        "Content-Length": String(metadata.size || 0),
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": "inline",
      },
    });
  }

  async setPrivatePolicy(objectPath: string, owner: string) {
    const file = await this.getFile(objectPath);
    const policy: ObjectAclPolicy = { owner, visibility: "private" };
    await setObjectAclPolicy(file, policy);
  }

  async canRead(file: File) {
    const policy = await getObjectAclPolicy(file);
    return policy?.visibility === "private";
  }
}

function parseObjectPath(value: string) {
  const normalized = value.startsWith("/") ? value : `/${value}`;
  const parts = normalized.split("/");
  if (parts.length < 3 || !parts[1] || !parts.slice(2).join("/")) throw new Error("Invalid object path");
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
}

async function signObjectUrl({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "PUT" | "GET";
  ttlSec: number;
}) {
  const response = await fetch(`${SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucketName,
      object_name: objectName,
      method,
      expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Failed to sign object URL: ${response.status}`);
  const body = await response.json() as { signed_url?: string };
  if (!body.signed_url) throw new Error("Storage signer returned no URL");
  return body.signed_url;
}