import { unzipSync, zipSync, strToU8, strFromU8 } from "fflate";
import { safePath, validateMetadata, type SceneMetadata } from "./contracts.ts";

const MAX_FILE = 128 * 1024 * 1024,
  MAX_TOTAL = 512 * 1024 * 1024,
  MAX_FILES = 128;
export type Role = "video" | "thumbnail" | "frame" | "source" | "notice";
export interface ShareFile {
  path: string;
  role: Role;
  size: number;
  sha256: string;
  mime: string;
}
export interface ShareManifest {
  format: "panostem-share";
  version: 1;
  scene: SceneMetadata;
  files: ShareFile[];
}
export interface Share {
  manifest: ShareManifest;
  files: Record<string, Uint8Array>;
}
const mimeFor = (path: string) =>
  path.endsWith(".mp4")
    ? "video/mp4"
    : path.endsWith(".png")
      ? "image/png"
      : path.endsWith(".gif")
        ? "image/gif"
        : path.endsWith(".mov")
          ? "video/quicktime"
          : "text/plain";
const hash = async (data: Uint8Array) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new Uint8Array(data).buffer),
    ),
  )
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");

/** Read declared sizes before inflation. ZIP64/encryption/symlinks are rejected. */
function preflight(bytes: Uint8Array) {
  if (bytes.length > MAX_TOTAL || bytes.length < 22)
    throw new Error("Share ZIP is empty or exceeds 512 MiB");
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (
      v.getUint32(i, true) === 0x06054b50 &&
      i + 22 + v.getUint16(i + 20, true) === bytes.length
    ) {
      end = i;
      break;
    }
  if (
    end < 0 ||
    v.getUint16(end + 4, true) ||
    v.getUint16(end + 6, true) ||
    v.getUint16(end + 8, true) !== v.getUint16(end + 10, true)
  )
    throw new Error("Invalid/multi-disk ZIP");
  const count = v.getUint16(end + 10, true),
    offset = v.getUint32(end + 16, true),
    size = v.getUint32(end + 12, true);
  if (!count || count > MAX_FILES || offset + size !== end)
    throw new Error("Invalid ZIP directory or too many files");
  let pos = offset,
    total = 0;
  const names = new Set<string>();
  for (let i = 0; i < count; i++) {
    if (pos + 46 > end || v.getUint32(pos, true) !== 0x02014b50)
      throw new Error("Invalid ZIP directory entry");
    const packed = v.getUint32(pos + 20, true),
      unpacked = v.getUint32(pos + 24, true),
      len = v.getUint16(pos + 28, true),
      extra = v.getUint16(pos + 30, true),
      comment = v.getUint16(pos + 32, true),
      flags = v.getUint16(pos + 8, true),
      method = v.getUint16(pos + 10, true),
      local = v.getUint32(pos + 42, true);
    if (
      pos + 46 + len + extra + comment > end ||
      flags & 1 ||
      ![0, 8].includes(method) ||
      ((v.getUint32(pos + 38, true) >>> 16) & 0xf000) === 0xa000 ||
      v.getUint16(pos + 34, true)
    )
      throw new Error("Unsupported, encrypted or symbolic ZIP entry");
    const name = new TextDecoder("utf-8", { fatal: true }).decode(
      bytes.subarray(pos + 46, pos + 46 + len),
    );
    safePath(name);
    if (names.has(name.toLowerCase()))
      throw new Error("Duplicate or case-conflicting ZIP path");
    names.add(name.toLowerCase());
    total += unpacked;
    if (
      unpacked > MAX_FILE ||
      total > MAX_TOTAL ||
      packed === 0xffffffff ||
      unpacked === 0xffffffff ||
      local + 30 > offset ||
      v.getUint32(local, true) !== 0x04034b50
    )
      throw new Error("Invalid size or ZIP64 entry");
    const localLen = v.getUint16(local + 26, true),
      localExtra = v.getUint16(local + 28, true);
    if (
      local + 30 + localLen + localExtra + packed > offset ||
      v.getUint16(local + 6, true) !== flags ||
      v.getUint16(local + 8, true) !== method ||
      new TextDecoder().decode(
        bytes.subarray(local + 30, local + 30 + localLen),
      ) !== name
    )
      throw new Error("ZIP local header mismatch");
    pos += 46 + len + extra + comment;
  }
  if (pos !== end) throw new Error("Unexpected ZIP directory data");
  for (const name of names) {
    const parts = name.split("/");
    for (let i = 1; i < parts.length; i++)
      if (names.has(parts.slice(0, i).join("/")))
        throw new Error("Conflicting file/directory path");
  }
}
function validateFile(file: ShareFile) {
  safePath(file.path);
  if (
    file.path === "manifest.json" ||
    !Number.isInteger(file.size) ||
    file.size < 0 ||
    file.size > MAX_FILE ||
    !/^[a-f0-9]{64}$/.test(file.sha256)
  )
    throw new Error("Invalid manifest file entry");
  const ext = file.path.split(".").pop();
  const allowed: Record<Role, string[]> = {
    video: ["mp4", "gif", "mov"],
    thumbnail: ["png"],
    frame: ["png"],
    source: ["py"],
    notice: ["txt", "md"],
  };
  if (
    !Object.prototype.hasOwnProperty.call(allowed, file.role) ||
    !allowed[file.role].includes(ext!) ||
    file.mime !== mimeFor(file.path)
  )
    throw new Error("Unsupported media/source type");
}
export async function importShare(bytes: Uint8Array): Promise<Share> {
  preflight(bytes);
  const files = unzipSync(bytes, { filter: (f) => f.originalSize <= MAX_FILE });
  if (!files["manifest.json"] || files["manifest.json"].length > 256 * 1024)
    throw new Error("Missing or oversized manifest.json");
  const manifest = JSON.parse(
    strFromU8(files["manifest.json"]),
  ) as ShareManifest;
  if (manifest.format !== "panostem-share" || manifest.version !== 1)
    throw new Error("Unsupported Panostem share version");
  validateMetadata(manifest.scene);
  if (!Array.isArray(manifest.files) || manifest.files.length >= MAX_FILES)
    throw new Error("Invalid share file list");
  const names = new Set<string>();
  for (const file of manifest.files) {
    validateFile(file);
    if (names.has(file.path.toLowerCase()))
      throw new Error("Duplicate manifest path");
    names.add(file.path.toLowerCase());
    const data = files[file.path];
    if (
      !data ||
      data.length !== file.size ||
      (await hash(data)) !== file.sha256
    )
      throw new Error(`Missing or corrupted file: ${file.path}`);
  }
  if (Object.keys(files).length !== manifest.files.length + 1)
    throw new Error("Unlisted files in share ZIP");
  return { manifest, files };
}
export async function exportShare(
  scene: SceneMetadata,
  items: { path: string; role: Role; data: Uint8Array }[],
): Promise<Uint8Array> {
  validateMetadata(scene);
  const files: Record<string, Uint8Array> = Object.create(null);
  const manifest: ShareManifest = {
    format: "panostem-share",
    version: 1,
    scene,
    files: [],
  };
  for (const item of items) {
    const entry: ShareFile = {
      path: item.path,
      role: item.role,
      size: item.data.length,
      sha256: await hash(item.data),
      mime: mimeFor(item.path),
    };
    validateFile(entry);
    if (
      Object.keys(files).some(
        (n) => n.toLowerCase() === item.path.toLowerCase(),
      )
    )
      throw new Error("Duplicate export path");
    files[item.path] = item.data;
    manifest.files.push(entry);
  }
  files["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));
  const bytes = zipSync(files, { level: 0 });
  preflight(bytes);
  return bytes;
}
export const shareMime = mimeFor;
