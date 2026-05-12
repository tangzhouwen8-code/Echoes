import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { generateIllustrationFromPoem } from "@/lib/generate-illustration";
import { generatePoemFromMoments } from "@/lib/generate-poem";
import { addEcho, readStore } from "@/lib/store";
import { startOfWeekMonday } from "@/lib/week";
import type { Echo } from "@/types";

export const dynamic = "force-dynamic";

export async function POST() {
  const now = new Date();
  const weekStart = startOfWeekMonday(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const { moments } = await readStore();
  const weekMoments = moments.filter((m) => {
    const t = new Date(m.createdAt).getTime();
    return t >= weekStart.getTime() && t < weekEnd.getTime();
  });

  if (weekMoments.length === 0) {
    return NextResponse.json(
      { error: "本周还没有记录，先写下片刻吧。" },
      { status: 400 },
    );
  }

  const fragments = weekMoments.map((m) => ({
    text: m.content,
    hasImage: Boolean(m.image),
    hasAudio: Boolean(m.audio),
  }));

  let poem: string;
  try {
    poem = await generatePoemFromMoments(fragments);
  } catch (e) {
    const message = e instanceof Error ? e.message : "生成失败";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const echoId = randomUUID();
  let illustration: Echo["illustration"];
  try {
    illustration = await generateIllustrationFromPoem(poem, echoId);
  } catch {
    illustration = undefined;
  }

  const echo: Echo = {
    id: echoId,
    weekStart: weekStart.toISOString(),
    poem,
    illustration,
    momentIds: weekMoments.map((m) => m.id),
    createdAt: new Date().toISOString(),
  };
  await addEcho(echo);

  return NextResponse.json({ echo }, { status: 201 });
}
