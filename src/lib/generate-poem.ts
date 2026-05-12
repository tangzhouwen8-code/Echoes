const MOCK_POEM = `本周的回声，落在安静的纸上，
字句很轻，却挨得很近。
把它们折成一行雾，
晚风读过，便各自散开。`;

const SYSTEM_PROMPT =
  "你是一位含蓄的现代汉语诗人。根据用户本周的生活片段写一首短诗（8～16行），意象克制、留白多、不要用标题、不要解释创作过程。只用正文。";

type ChatResponse = {
  choices?: { message?: { content?: string | null } }[];
};

async function chatComplete(
  url: string,
  apiKey: string,
  model: string,
  userContent: string,
  providerLabel: string,
): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.85,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `以下是我本周写下的一些瞬间，请写成一首诗：\n\n${userContent}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    await res.text();
    if (res.status === 401 || res.status === 403) {
      throw new Error(`${providerLabel} 密钥无效或未开通`);
    }
    if (res.status === 402) {
      throw new Error(`${providerLabel} 账户余额不足，请充值后再试`);
    }
    if (res.status === 429) {
      throw new Error(`${providerLabel} 请求过于频繁，请稍后再试`);
    }
    throw new Error(`${providerLabel} 服务暂时不可用（${res.status}）`);
  }

  const data = (await res.json()) as ChatResponse;
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error(`${providerLabel}: empty response`);
  return text;
}

export type MomentInput = {
  text: string;
  hasImage: boolean;
  hasAudio: boolean;
};

function formatFragment(fragment: MomentInput): string {
  const lines: string[] = [];
  if (fragment.text) lines.push(fragment.text);
  const tags: string[] = [];
  if (fragment.hasImage) tags.push("附照片");
  if (fragment.hasAudio) tags.push("附环境录音");
  if (tags.length) lines.push(`（${tags.join("，")}）`);
  return lines.join("\n");
}

export async function generatePoemFromMoments(
  fragments: MomentInput[],
): Promise<string> {
  const joined = fragments.map(formatFragment).join("\n——\n");

  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (deepseekKey) {
    const base =
      process.env.DEEPSEEK_API_BASE?.replace(/\/$/, "") ??
      "https://api.deepseek.com/v1";
    const url = `${base}/chat/completions`;
    const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
    return chatComplete(url, deepseekKey, model, joined, "DeepSeek");
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    return chatComplete(
      "https://api.openai.com/v1/chat/completions",
      openaiKey,
      model,
      joined,
      "OpenAI",
    );
  }

  await new Promise((r) => setTimeout(r, 600));
  return [MOCK_POEM, "", `（基于 ${fragments.length} 条记录 · mock）`].join(
    "\n",
  );
}
