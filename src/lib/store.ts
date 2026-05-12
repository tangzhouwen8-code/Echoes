import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import type { Echo, Moment } from "@/types";

const DATA_PATH = path.join(process.cwd(), "data", "store.json");

export type StoreData = {
  moments: Moment[];
  echoes: Echo[];
};

async function ensureStore(): Promise<void> {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  try {
    await fs.access(DATA_PATH);
  } catch {
    const empty: StoreData = { moments: [], echoes: [] };
    await fs.writeFile(DATA_PATH, JSON.stringify(empty, null, 2), "utf-8");
  }
}

export async function readStore(): Promise<StoreData> {
  await ensureStore();
  const raw = await fs.readFile(DATA_PATH, "utf-8");
  return JSON.parse(raw) as StoreData;
}

export async function writeStore(data: StoreData): Promise<void> {
  await ensureStore();
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function addMoment(input: {
  id?: string;
  content: string;
  image?: Moment["image"];
  audio?: Moment["audio"];
}): Promise<Moment> {
  const store = await readStore();
  const moment: Moment = {
    id: input.id ?? randomUUID(),
    content: input.content.trim(),
    createdAt: new Date().toISOString(),
  };
  if (input.image) moment.image = input.image;
  if (input.audio) moment.audio = input.audio;
  store.moments.unshift(moment);
  await writeStore(store);
  return moment;
}

export async function addEcho(echo: Echo): Promise<void> {
  const store = await readStore();
  store.echoes.unshift(echo);
  await writeStore(store);
}

export async function getEchoById(id: string): Promise<Echo | undefined> {
  const store = await readStore();
  return store.echoes.find((e) => e.id === id);
}
