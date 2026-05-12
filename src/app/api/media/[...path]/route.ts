import fs from "fs/promises";
import { NextResponse } from "next/server";
import { resolveUploadPath } from "@/lib/uploads";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ path: string[] }> };

export async function GET(_request: Request, { params }: Params) {
  const { path: segments } = await params;
  const relativePath = segments.join("/");
  let fullPath: string;
  try {
    fullPath = resolveUploadPath(relativePath);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const data = await fs.readFile(fullPath);
    const ext = relativePath.split(".").pop()?.toLowerCase();
    const mime =
      ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "png"
          ? "image/png"
          : ext === "webp"
            ? "image/webp"
            : ext === "gif"
              ? "image/gif"
              : ext === "svg"
                ? "image/svg+xml"
                : ext === "webm"
                  ? "audio/webm"
                  : ext === "mp3"
                    ? "audio/mpeg"
                    : ext === "wav"
                      ? "audio/wav"
                      : ext === "m4a"
                        ? "audio/mp4"
                        : ext === "caf"
                        ? "audio/x-caf"
                        : ext === "ogg"
                          ? "audio/ogg"
                          : "application/octet-stream";

    return new NextResponse(data, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
