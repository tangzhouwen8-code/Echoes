import fs from "fs/promises";
import path from "path";

export const UPLOAD_ROOT = path.join(process.cwd(), "data", "uploads");

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/ogg",
  "audio/x-m4a",
  "audio/aac",
  "audio/x-caf",
  "video/webm",
]);

const AUDIO_EXT_TYPES: Record<string, string> = {
  webm: "audio/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  caf: "audio/x-caf",
};

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const AUDIO_MAX_BYTES = 10 * 1024 * 1024;

export function resolveUploadPath(relativePath: string): string {
  const normalized = path
    .normalize(relativePath)
    .replace(/^(\.\.(\/|\\|$))+/, "");
  const full = path.join(UPLOAD_ROOT, normalized);
  if (!full.startsWith(UPLOAD_ROOT)) {
    throw new Error("Invalid media path");
  }
  return full;
}

export async function saveUpload(
  relativePath: string,
  data: Buffer,
): Promise<void> {
  const full = resolveUploadPath(relativePath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, data);
}

function extFromMime(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "audio/webm":
      return "webm";
    case "audio/mpeg":
      return "mp3";
    case "audio/wav":
      return "wav";
    case "audio/mp4":
    case "audio/x-m4a":
    case "audio/aac":
      return "m4a";
    case "audio/x-caf":
      return "caf";
    case "audio/ogg":
      return "ogg";
    default:
      return "bin";
  }
}

export async function saveMomentImage(
  momentId: string,
  file: File,
): Promise<{ filename: string; mimeType: string }> {
  if (!IMAGE_TYPES.has(file.type)) {
    throw new Error("仅支持 JPG、PNG、WebP、GIF 图片");
  }
  if (file.size > IMAGE_MAX_BYTES) {
    throw new Error("图片不能超过 5MB");
  }
  const ext = extFromMime(file.type);
  const filename = `moments/${momentId}/image.${ext}`;
  const data = Buffer.from(await file.arrayBuffer());
  await saveUpload(filename, data);
  return { filename, mimeType: file.type };
}

function resolveAudioMeta(file: File): { mimeType: string; ext: string } {
  const rawType = file.type.toLowerCase().split(";")[0].trim();
  if (rawType && AUDIO_TYPES.has(rawType)) {
    return { mimeType: rawType === "video/webm" ? "audio/webm" : rawType, ext: extFromMime(rawType === "video/webm" ? "audio/webm" : rawType) };
  }

  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  const mimeFromExt = AUDIO_EXT_TYPES[ext];
  if (mimeFromExt) {
    return { mimeType: mimeFromExt, ext };
  }

  throw new Error("录音格式暂不支持，请使用 WebM、MP3、WAV、M4A 或 OGG");
}

export async function saveMomentAudio(
  momentId: string,
  file: File,
): Promise<{ filename: string; mimeType: string }> {
  const { mimeType, ext } = resolveAudioMeta(file);
  if (file.size > AUDIO_MAX_BYTES) {
    throw new Error("录音不能超过 10MB");
  }
  const filename = `moments/${momentId}/audio.${ext}`;
  const data = Buffer.from(await file.arrayBuffer());
  await saveUpload(filename, data);
  return { filename, mimeType };
}

export async function saveEchoIllustration(
  echoId: string,
  data: Buffer,
  mimeType: string,
): Promise<{ filename: string; mimeType: string }> {
  const ext = extFromMime(mimeType);
  const filename = `echoes/${echoId}/illustration.${ext}`;
  await saveUpload(filename, data);
  return { filename, mimeType };
}
