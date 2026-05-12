"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { MomentMedia } from "@/components/moment-media";
import { isInCurrentWeek } from "@/lib/week";
import type { Moment } from "@/types";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function fileFromRecordedBlob(blob: Blob): File {
  const rawType = blob.type || "audio/webm";
  const type = rawType.startsWith("video/webm") ? "audio/webm" : rawType;
  let ext = "webm";
  if (type.includes("mp4") || type.includes("m4a") || type.includes("aac")) {
    ext = "m4a";
  } else if (type.includes("mpeg") || type.includes("mp3")) {
    ext = "mp3";
  } else if (type.includes("wav")) {
    ext = "wav";
  } else if (type.includes("ogg")) {
    ext = "ogg";
  }
  return new File([blob], `recording.${ext}`, { type });
}

type Props = {
  initialMoments: Moment[];
};

export function HomeShell({ initialMoments }: Props) {
  const router = useRouter();
  const [moments, setMoments] = useState(initialMoments);
  const [draft, setDraft] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [echoPending, setEchoPending] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const weekCount = useMemo(
    () => moments.filter((m) => isInCurrentWeek(m.createdAt)).length,
    [moments],
  );

  const canSubmit = Boolean(draft.trim() || imageFile || audioFile);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (audioPreview) URL.revokeObjectURL(audioPreview);
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [audioPreview, imagePreview]);

  const clearImage = useCallback(() => {
    setImageFile(null);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const clearAudio = useCallback(() => {
    setAudioFile(null);
    setAudioPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const resetComposer = useCallback(() => {
    setDraft("");
    clearImage();
    clearAudio();
  }, [clearAudio, clearImage]);

  const onImageChange = useCallback((file: File | null) => {
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (!file) {
      setImageFile(null);
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }, []);

  const onAudioChange = useCallback(
    (file: File | null) => {
      clearAudio();
      if (!file) return;
      setAudioFile(file);
      setAudioPreview(URL.createObjectURL(file));
    },
    [clearAudio],
  );

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const file = fileFromRecordedBlob(blob);
        setAudioFile(file);
        setAudioPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(file);
        });
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError("无法访问麦克风，请检查浏览器权限。");
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }, []);

  const submitMoment = useCallback(() => {
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const form = new FormData();
      form.append("content", draft.trim());
      if (imageFile) form.append("image", imageFile);
      if (audioFile) form.append("audio", audioFile);

      const res = await fetch("/api/moments", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "保存失败");
        return;
      }
      const data = (await res.json()) as { moment: Moment };
      setMoments((prev) => [data.moment, ...prev]);
      resetComposer();
      router.refresh();
    });
  }, [audioFile, canSubmit, draft, imageFile, resetComposer, router]);

  const generateEcho = useCallback(async () => {
    setError(null);
    setEchoPending(true);
    try {
      const res = await fetch("/api/echoes", { method: "POST" });
      const data = (await res.json()) as { echo?: { id: string }; error?: string };
      if (!res.ok) {
        setError(data.error ?? "生成失败");
        return;
      }
      if (data.echo?.id) {
        router.push(`/echoes/${data.echo.id}`);
      }
    } finally {
      setEchoPending(false);
    }
  }, [router]);

  return (
    <div className="echoes-page mx-auto flex min-h-full w-full max-w-md flex-col px-5 pb-20 pt-10 md:max-w-lg md:px-8 md:pt-14">
      <header className="relative mb-10 space-y-4 text-center">
        <p className="font-display text-[0.72rem] tracking-[0.55em] text-stone-500">
          E C H O E S
        </p>
        <h1 className="font-display text-5xl font-medium tracking-[0.08em] text-stone-900 md:text-6xl">
          回声
        </h1>
        <p className="mx-auto max-w-xs text-sm leading-7 text-stone-600">
          用碎片记录世界 感官重启计划ing
        </p>
      </header>

      <section className="mb-12 space-y-5">
        <label htmlFor="moment" className="sr-only">
          记录文字
        </label>
        <div className="echoes-paper px-5 py-5 md:px-6 md:py-6">
          <textarea
            id="moment"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                submitMoment();
              }
            }}
            rows={6}
            placeholder="此刻……"
            className="font-display w-full resize-none border-0 bg-transparent text-[1.05rem] leading-[2.35rem] text-stone-800 outline-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <label className="echoes-sketch-btn cursor-pointer px-2 py-2.5 text-center text-sm">
            添加图片
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onImageChange(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="echoes-sketch-btn cursor-pointer px-2 py-2.5 text-center text-sm">
            上传录音
            <input
              type="file"
              accept="audio/*,.m4a,.mp3,.wav,.webm,.aac,.caf"
              className="hidden"
              onChange={(e) => onAudioChange(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            className={`echoes-sketch-btn px-2 py-2.5 text-sm ${
              recording ? "bg-amber-50/80" : ""
            }`}
          >
            {recording ? "停止录音" : "录制声音"}
          </button>
        </div>

        {imagePreview ? (
          <div className="space-y-2 rounded-sm border border-stone-300/70 bg-white/55 p-3">
            <img
              src={imagePreview}
              alt="待上传图片预览"
              className="max-h-56 w-full rounded-sm object-cover"
            />
            <button
              type="button"
              onClick={clearImage}
              className="text-xs text-stone-500 transition-colors duration-500 hover:text-stone-700"
            >
              移除图片
            </button>
          </div>
        ) : null}

        {audioPreview ? (
          <div className="space-y-2 rounded-sm border border-stone-300/70 bg-white/55 p-3">
            <audio className="w-full" controls src={audioPreview} />
            <button
              type="button"
              onClick={clearAudio}
              className="text-xs text-stone-500 transition-colors duration-500 hover:text-stone-700"
            >
              移除录音
            </button>
          </div>
        ) : null}

        <div className="flex flex-col items-center gap-4 pt-2">
          <div className="flex w-full items-center justify-center gap-4">
            <button
              type="button"
              onClick={generateEcho}
              disabled={echoPending || weekCount === 0}
              className="echoes-generate-btn font-display px-8 py-3 text-base tracking-[0.12em] transition-opacity duration-500 hover:opacity-90"
            >
              {echoPending ? "正在聆听…" : "生成本周回声"}
            </button>
            <span className="text-xs text-stone-500">
              本周已记 {weekCount} 条
            </span>
          </div>
          <button
            type="button"
            onClick={submitMoment}
            disabled={pending || !canSubmit}
            className="echoes-sketch-btn px-6 py-2 text-sm disabled:cursor-not-allowed"
          >
            {pending ? "保存中…" : "记下"}
          </button>
        </div>
        {error ? (
          <p className="text-center text-sm text-amber-800/90">{error}</p>
        ) : null}
      </section>

      <section className="flex flex-col gap-8">
        <h2 className="font-display text-center text-xs tracking-[0.35em] text-stone-500">
          时间流
        </h2>
        {moments.length === 0 ? (
          <p className="text-center text-sm text-stone-500">
            还没有记录。从一行字开始。
          </p>
        ) : (
          <ul className="echoes-timeline flex flex-col gap-10 pl-5">
            {moments.map((m) => (
              <li key={m.id} className="relative">
                <span className="absolute -left-[21px] top-2 h-2 w-2 rounded-full bg-stone-400" />
                <time
                  dateTime={m.createdAt}
                  className="mb-2 block text-xs tracking-wide text-stone-500"
                >
                  {formatWhen(m.createdAt)}
                </time>
                <MomentMedia moment={m} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-auto pt-16 text-center">
        <Link
          href="/echoes"
          className="text-xs text-stone-500 transition-colors duration-500 hover:text-stone-700"
        >
          历史回声
        </Link>
      </footer>
    </div>
  );
}
