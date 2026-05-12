import Link from "next/link";
import { notFound } from "next/navigation";
import { MomentMedia } from "@/components/moment-media";
import { mediaUrl } from "@/lib/media";
import { getEchoById, readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EchoPage({ params }: Props) {
  const { id } = await params;
  const echo = await getEchoById(id);
  if (!echo) notFound();

  const store = await readStore();
  const moments = store.moments.filter((m) => echo.momentIds.includes(m.id));

  return (
    <div className="mx-auto max-w-lg px-6 py-16 md:max-w-xl md:px-8 md:py-24">
      <Link
        href="/"
        className="mb-16 inline-block text-xs text-zinc-600 transition-colors duration-500 hover:text-zinc-400"
      >
        ← 首页
      </Link>

      <p className="font-display mb-4 text-xs tracking-[0.35em] text-zinc-600">
        本周回声
      </p>
      <time
        dateTime={echo.weekStart}
        className="mb-16 block text-sm text-zinc-500"
      >
        周始{" "}
        {new Intl.DateTimeFormat("zh-CN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }).format(new Date(echo.weekStart))}
      </time>

      {echo.illustration ? (
        <figure className="mb-16 overflow-hidden rounded-sm border border-zinc-800/80">
          <img
            src={mediaUrl(echo.illustration.filename)}
            alt="本周回声插画"
            className="h-auto w-full object-cover"
          />
        </figure>
      ) : null}

      <article className="mb-24">
        <pre className="font-display whitespace-pre-wrap text-xl font-light leading-[1.85] tracking-wide text-zinc-200 md:text-2xl">
          {echo.poem}
        </pre>
      </article>

      <section className="border-t border-zinc-800/80 pt-12">
        <h2 className="mb-8 font-display text-xs tracking-[0.25em] text-zinc-600">
          来源片刻
        </h2>
        <ul className="flex flex-col gap-6">
          {moments.map((m) => (
            <li key={m.id}>
              <MomentMedia moment={m} />
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-16 text-center">
        <Link
          href="/echoes"
          className="text-xs text-zinc-600 transition-colors duration-500 hover:text-zinc-400"
        >
          历史回声
        </Link>
      </footer>
    </div>
  );
}
