import Link from "next/link";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EchoesIndexPage() {
  const { echoes } = await readStore();

  return (
    <div className="mx-auto max-w-lg px-6 py-16 md:px-8 md:py-24">
      <Link
        href="/"
        className="mb-12 inline-block text-xs text-zinc-600 transition-colors duration-500 hover:text-zinc-400"
      >
        ← 返回
      </Link>
      <h1 className="font-display mb-10 text-2xl font-light text-zinc-100">
        历史回声
      </h1>
      {echoes.length === 0 ? (
        <p className="text-sm text-zinc-600">尚无回声。先在首页生成本周回声。</p>
      ) : (
        <ul className="flex flex-col gap-8">
          {echoes.map((e) => (
            <li key={e.id}>
              <Link
                href={`/echoes/${e.id}`}
                className="group block rounded-sm border border-transparent px-1 py-2 transition-colors duration-500 hover:border-zinc-800"
              >
                <time
                  dateTime={e.createdAt}
                  className="block text-xs text-zinc-600 group-hover:text-zinc-500"
                >
                  {new Intl.DateTimeFormat("zh-CN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }).format(new Date(e.createdAt))}
                </time>
                <p className="mt-2 line-clamp-2 font-display text-lg leading-snug text-zinc-400">
                  {e.poem.split("\n")[0]}
                  …
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
