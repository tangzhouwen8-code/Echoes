import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { saveMomentAudio, saveMomentImage } from "@/lib/uploads";
import { addMoment, readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const { moments } = await readStore();
  const sorted = [...moments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return NextResponse.json({ moments: sorted });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const content = String(formData.get("content") ?? "").trim();
  const imageField = formData.get("image");
  const audioField = formData.get("audio");
  const imageFile = imageField instanceof File && imageField.size > 0 ? imageField : null;
  const audioFile = audioField instanceof File && audioField.size > 0 ? audioField : null;

  if (!content && !imageFile && !audioFile) {
    return NextResponse.json(
      { error: "至少写下文字、上传图片或录制一段声音" },
      { status: 400 },
    );
  }

  const momentId = randomUUID();
  let image;
  let audio;
  try {
    if (imageFile) image = await saveMomentImage(momentId, imageFile);
    if (audioFile) audio = await saveMomentAudio(momentId, audioFile);
  } catch (e) {
    const message = e instanceof Error ? e.message : "上传失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const moment = await addMoment({
    id: momentId,
    content,
    image,
    audio,
  });
  return NextResponse.json({ moment }, { status: 201 });
}
