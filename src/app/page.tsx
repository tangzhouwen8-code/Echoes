import { HomeShell } from "@/components/home-shell";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { moments } = await readStore();
  const sorted = [...moments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return <HomeShell initialMoments={sorted} />;
}
