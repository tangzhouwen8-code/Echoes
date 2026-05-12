import { saveEchoIllustration } from "@/lib/uploads";
import type { MediaRef } from "@/types";

const ILLUSTRATION_SYSTEM =
  "你是一位插画导演。根据一首现代汉语短诗，写一段用于生成插画的英文画面描述：50词以内，意象克制、留白、低饱和、无文字、无人物面部特写。";

type ChatResponse = {
  choices?: { message?: { content?: string | null } }[];
};

async function illustrationPromptFromPoem(poem: string): Promise<string> {
  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (deepseekKey) {
    const base =
      process.env.DEEPSEEK_API_BASE?.replace(/\/$/, "") ??
      "https://api.deepseek.com/v1";
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${deepseekKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
        temperature: 0.7,
        messages: [
          { role: "system", content: ILLUSTRATION_SYSTEM },
          { role: "user", content: poem },
        ],
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as ChatResponse;
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) return text;
    }
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: ILLUSTRATION_SYSTEM },
          { role: "user", content: poem },
        ],
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as ChatResponse;
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) return text;
    }
  }

  const line = poem.split("\n").find((l) => l.trim())?.trim() ?? "quiet evening";
  return `minimal poetic illustration, muted palette, ${line}`;
}

async function fetchRemoteIllustration(prompt: string): Promise<Buffer | null> {
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        size: "1024x1024",
        response_format: "b64_json",
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        data?: { b64_json?: string }[];
      };
      const b64 = data.data?.[0]?.b64_json;
      if (b64) return Buffer.from(b64, "base64");
    }
  }

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=1024&nologo=true`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function fallbackSvg(poem: string): Buffer {
  const line =
    poem
      .split("\n")
      .find((l) => l.trim())
      ?.trim()
      .slice(0, 28) ?? "回声";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="1024" viewBox="0 0 768 1024">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#111114"/>
      <stop offset="55%" stop-color="#1b1b22"/>
      <stop offset="100%" stop-color="#2a2a33"/>
    </linearGradient>
  </defs>
  <rect width="768" height="1024" fill="url(#g)"/>
  <circle cx="620" cy="180" r="90" fill="#3f3f46" opacity="0.35"/>
  <path d="M0 760 C 180 700, 300 820, 520 760 S 768 860, 768 860 L 768 1024 L 0 1024 Z" fill="#27272a" opacity="0.8"/>
  <text x="72" y="900" fill="#a1a1aa" font-family="Georgia, serif" font-size="28">${escapeXml(line)}</text>
</svg>`;
  return Buffer.from(svg, "utf-8");
}

export async function generateIllustrationFromPoem(
  poem: string,
  echoId: string,
): Promise<MediaRef> {
  const prompt = await illustrationPromptFromPoem(poem);
  const remote = await fetchRemoteIllustration(prompt);
  if (remote) {
    return saveEchoIllustration(echoId, remote, "image/png");
  }
  return saveEchoIllustration(echoId, fallbackSvg(poem), "image/svg+xml");
}
