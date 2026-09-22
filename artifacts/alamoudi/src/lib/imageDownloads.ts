const textEncoder = new TextEncoder();

function safeFileName(value: string): string {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "property";
}

function imageExtension(url: string, contentType?: string): string {
  const mimeExtension: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
  };
  if (contentType && mimeExtension[contentType.split(";")[0].trim()]) {
    return mimeExtension[contentType.split(";")[0].trim()];
  }
  try {
    const pathname = new URL(url, window.location.href).pathname;
    const match = pathname.match(/\.([a-z0-9]{2,5})$/i);
    if (match?.[1]) return match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
  } catch {
    // Fall through to a safe default.
  }
  return "jpg";
}

function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export async function downloadImage(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url, { credentials: "omit" });
    if (!response.ok) throw new Error(`image request failed: ${response.status}`);
    const blob = await response.blob();
    downloadBlob(blob, `${safeFileName(filename)}.${imageExtension(url, response.headers.get("content-type") ?? undefined)}`);
  } catch {
    // A cross-origin image may not allow fetch. The native fallback still
    // works for sources that explicitly support the download attribute.
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeFileName(filename)}.jpg`;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeU16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true);
}

function writeU32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value >>> 0, true);
}

interface ZipEntry {
  name: string;
  bytes: Uint8Array;
}

function createStoredZip(entries: ZipEntry[]): Blob {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  for (const entry of entries) {
    const nameBytes = textEncoder.encode(entry.name);
    const crc = crc32(entry.bytes);
    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    writeU32(localView, 0, 0x04034b50);
    writeU16(localView, 4, 20);
    writeU16(localView, 6, 0);
    writeU16(localView, 8, 0);
    writeU16(localView, 10, dosTime);
    writeU16(localView, 12, dosDate);
    writeU32(localView, 14, crc);
    writeU32(localView, 18, entry.bytes.length);
    writeU32(localView, 22, entry.bytes.length);
    writeU16(localView, 26, nameBytes.length);
    writeU16(localView, 28, 0);
    local.set(nameBytes, 30);
    localParts.push(local, entry.bytes);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    writeU32(centralView, 0, 0x02014b50);
    writeU16(centralView, 4, 20);
    writeU16(centralView, 6, 20);
    writeU16(centralView, 8, 0);
    writeU16(centralView, 10, 0);
    writeU16(centralView, 12, dosTime);
    writeU16(centralView, 14, dosDate);
    writeU32(centralView, 16, crc);
    writeU32(centralView, 20, entry.bytes.length);
    writeU32(centralView, 24, entry.bytes.length);
    writeU16(centralView, 28, nameBytes.length);
    writeU16(centralView, 30, 0);
    writeU16(centralView, 32, 0);
    writeU16(centralView, 34, 0);
    writeU16(centralView, 36, 0);
    writeU32(centralView, 38, 0);
    writeU32(centralView, 42, offset);
    central.set(nameBytes, 46);
    centralParts.push(central);

    offset += local.length + entry.bytes.length;
  }

  const localSize = localParts.reduce((total, part) => total + part.length, 0);
  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  writeU32(endView, 0, 0x06054b50);
  writeU16(endView, 4, 0);
  writeU16(endView, 6, 0);
  writeU16(endView, 8, entries.length);
  writeU16(endView, 10, entries.length);
  writeU32(endView, 12, centralSize);
  writeU32(endView, 16, localSize);
  writeU16(endView, 20, 0);

  const totalSize = localSize + centralSize + end.length;
  const combined = new Uint8Array(totalSize);
  let cursor = 0;
  for (const part of [...localParts, ...centralParts, end]) {
    combined.set(part, cursor);
    cursor += part.length;
  }
  return new Blob([combined.buffer as ArrayBuffer], { type: "application/zip" });
}

export async function downloadImagesAsZip(
  urls: string[],
  archiveName: string,
): Promise<{ downloaded: number; failed: number }> {
  const entries: ZipEntry[] = [];
  let failed = 0;

  for (const [index, url] of urls.entries()) {
    try {
      const response = await fetch(url, { credentials: "omit" });
      if (!response.ok) throw new Error(`image request failed: ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      const extension = imageExtension(url, response.headers.get("content-type") ?? undefined);
      entries.push({
        name: `image-${String(index + 1).padStart(2, "0")}.${extension}`,
        bytes,
      });
    } catch {
      failed += 1;
    }
  }

  if (entries.length > 0) {
    downloadBlob(createStoredZip(entries), `${safeFileName(archiveName)}.zip`);
  }
  return { downloaded: entries.length, failed };
}