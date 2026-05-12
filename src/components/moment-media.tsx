import type { Moment } from "@/types";
import { mediaUrl } from "@/lib/media";

type Props = {
  moment: Moment;
};

export function MomentMedia({ moment }: Props) {
  return (
    <>
      {moment.content ? (
        <p className="whitespace-pre-wrap text-[15px] leading-[1.75] text-stone-700">
          {moment.content}
        </p>
      ) : null}
      {moment.image ? (
        <img
          src={mediaUrl(moment.image.filename)}
          alt="片刻照片"
          className="mt-3 max-h-64 w-full rounded-sm border border-stone-300/80 object-cover"
        />
      ) : null}
      {moment.audio ? (
        <audio
          className="mt-3 w-full"
          controls
          preload="metadata"
          src={mediaUrl(moment.audio.filename)}
        />
      ) : null}
    </>
  );
}
