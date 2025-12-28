/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  Download,
  ExternalLink,
  Loader2,
  Mic,
  MonitorPlay,
  Podcast,
  Sparkles,
} from "lucide-react";

type DialogueLine = {
  speaker: string;
  line: string;
};

type PodcastSegment = {
  title: string;
  summary: string;
  durationMinutes: number;
  dialogue: DialogueLine[];
  soundDesign: string;
};

type PodcastBlueprint = {
  podcastTitle: string;
  tagline: string;
  intro: string;
  outro: string;
  hosts: {
    name: string;
    persona: string;
    style: string;
  }[];
  segments: PodcastSegment[];
  transitionCues: string[];
  showNotes: string[];
  keyTakeaways: string[];
  callToAction: string;
  resources: {
    label: string;
    url: string;
  }[];
};

type ApiSuccess = {
  success: true;
  data: {
    video: {
      title: string;
      channel: string;
      description: string;
      thumbnail: string;
      durationSeconds: number;
      uploadDate?: string;
      viewCount?: string;
      url: string;
    };
    transcriptAvailable: boolean;
    podcast: PodcastBlueprint;
    audio: {
      base64: string;
      mimeType: string;
      fileName: string;
    } | null;
  };
};

type ApiError = { success: false; error: string };

const steps = [
  {
    label: "Diagnose the source",
    description: "Validate the link, pull metadata & transcripts.",
  },
  {
    label: "Design the episode",
    description: "Map segments, hosts, energy, and narrative arcs.",
  },
  {
    label: "Write the script",
    description: "Draft dialogue, transitions, and supporting cues.",
  },
  {
    label: "Record narration",
    description: "Synthesize multi-host podcast-ready audio.",
  },
  {
    label: "Package the show",
    description: "Assemble show notes, resources, and downloads.",
  },
];

const voices = [
  { id: "alloy", label: "Alloy (Crisp & Versatile)" },
  { id: "verse", label: "Verse (Warm Storyteller)" },
  { id: "sage", label: "Sage (Calm Analyst)" },
  { id: "coral", label: "Coral (Documentary Warmth)" },
];

const stylePresets = [
  { id: "storytelling", label: "Storytelling Thriller" },
  { id: "documentary", label: "Documentary Deep Dive" },
  { id: "roundtable", label: "Roundtable Debate" },
  { id: "newsroom", label: "Newsroom Briefing" },
];

function formatDuration(secs: number) {
  if (!secs || Number.isNaN(secs)) return "—";
  const minutes = Math.floor(secs / 60);
  const seconds = secs % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export default function Home() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [openAiKey, setOpenAiKey] = useState("");
  const [persistKey, setPersistKey] = useState(false);
  const [voice, setVoice] = useState(voices[0]!.id);
  const [stylePreset, setStylePreset] = useState(stylePresets[0]!.id);
  const [activeStep, setActiveStep] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedKey = window.localStorage.getItem("agentic-openai-key");
    if (!storedKey) return;
    const frame = window.requestAnimationFrame(() => {
      setOpenAiKey(storedKey);
      setPersistKey(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!persistKey) {
      window.localStorage.removeItem("agentic-openai-key");
      return;
    }
    if (openAiKey) {
      window.localStorage.setItem("agentic-openai-key", openAiKey);
    }
  }, [persistKey, openAiKey]);

  const mutation = useMutation<ApiSuccess["data"], Error, void>({
    mutationFn: async () => {
      setStatusMessage("Bootstrapping agent pipeline…");
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          youtubeUrl,
          openaiKey: openAiKey,
          voice,
          stylePreset,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ApiError | null;
        throw new Error(payload?.error ?? "Generation failed. Please try another video.");
      }

      const json = (await response.json()) as ApiSuccess | ApiError;
      if (!json.success) {
        throw new Error(json.error ?? "Unexpected error.");
      }

      return json.data;
    },
    onMutate: () => {
      setActiveStep(0);
      setStatusMessage(null);
    },
    onSuccess: () => {
      setActiveStep(steps.length);
      setStatusMessage("Podcast ready. Listen, download, or iterate.");
    },
    onError: (error) => {
      setStatusMessage(error.message);
    },
  });

  useEffect(() => {
    if (!mutation.isPending) return;

    let stepIndex = 0;
    const treadmill = window.setInterval(() => {
      stepIndex = Math.min(steps.length - 1, stepIndex + 1);
      setActiveStep(stepIndex);
    }, 2400);

    return () => window.clearInterval(treadmill);
  }, [mutation.isPending]);

  const audioUrl = useMemo(() => {
    if (!mutation.data?.audio) return null;
    return `data:${mutation.data.audio.mimeType};base64,${mutation.data.audio.base64}`;
  }, [mutation.data?.audio]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!youtubeUrl || !openAiKey) {
      setStatusMessage("Add a YouTube URL and valid OpenAI API key to continue.");
      return;
    }
    await mutation.mutateAsync();
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 pb-16 pt-10 sm:px-6 lg:flex-row">
      <section className="w-full rounded-3xl border border-zinc-200/70 bg-white/75 p-8 shadow-lg shadow-sky-100 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/70 dark:shadow-none lg:sticky lg:top-10 lg:max-w-sm lg:self-start">
        <header className="mb-8 space-y-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-sky-600 dark:border-sky-500/40 dark:bg-sky-900/40 dark:text-sky-200">
            <Sparkles className="h-3.5 w-3.5" /> Agentic Podcast Studio
          </span>
          <h1 className="text-3xl font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
            Turn any YouTube link into a studio-grade podcast episode.
          </h1>
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            Paste a public video, choose a production style, and let the AI showrunner pull
            transcripts, engineer hosts, and ship an audio-first experience with notes and downloads.
          </p>
        </header>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">YouTube URL</label>
            <div className="relative">
              <MonitorPlay className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <input
                value={youtubeUrl}
                onChange={(event) => setYoutubeUrl(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full rounded-xl border border-zinc-200 bg-white px-11 py-3 text-sm font-medium text-zinc-800 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-950/70 dark:text-zinc-100 dark:focus:border-sky-400"
                type="url"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">OpenAI API key</label>
            <div className="relative">
              <Mic className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <input
                value={openAiKey}
                onChange={(event) => setOpenAiKey(event.target.value)}
                placeholder="sk-..."
                className="w-full rounded-xl border border-zinc-200 bg-white px-11 py-3 text-sm font-medium text-zinc-800 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-950/70 dark:text-zinc-100 dark:focus:border-sky-400"
                type="password"
                required
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <input
                type="checkbox"
                checked={persistKey}
                onChange={(event) => setPersistKey(event.target.checked)}
                className="h-4 w-4 rounded border border-zinc-300 text-sky-500 focus:ring-sky-400 dark:border-zinc-600 dark:bg-zinc-900"
              />
              Remember this key in this browser.
            </label>
          </div>

  <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Production style</label>
              <select
                value={stylePreset}
                onChange={(event) => setStylePreset(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-800 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-950/70 dark:text-zinc-100 dark:focus:border-sky-400"
              >
                {stylePresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Narrator voice</label>
              <select
                value={voice}
                onChange={(event) => setVoice(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-800 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-950/70 dark:text-zinc-100 dark:focus:border-sky-400"
              >
                {voices.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:scale-[1.01] hover:shadow-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-70 dark:shadow-none dark:hover:scale-100 dark:focus:ring-sky-700/60"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Building your podcast
              </>
            ) : (
              <>
                Launch the studio <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="space-y-5 rounded-2xl border border-zinc-200/70 bg-zinc-50/80 p-5 text-xs leading-5 text-zinc-600 shadow-inner shadow-zinc-100 dark:border-zinc-700/70 dark:bg-zinc-900/60 dark:text-zinc-300">
            <p className="font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              What you get
            </p>
            <ul className="space-y-3">
              <li className="flex gap-3">
                <Podcast className="mt-1 h-4 w-4 flex-none text-sky-500" />
                <span>Segmented host dialogue engineered from transcript &amp; metadata.</span>
              </li>
              <li className="flex gap-3">
                <Sparkles className="mt-1 h-4 w-4 flex-none text-indigo-500" />
                <span>Actionable show notes, key takeaways, and resource links ready to publish.</span>
              </li>
              <li className="flex gap-3">
                <Download className="mt-1 h-4 w-4 flex-none text-purple-500" />
                <span>AI-synthesized narration in MP3 format, prepped for your podcast feed.</span>
              </li>
            </ul>
          </div>

          {statusMessage && (
            <p
              className={`text-xs font-medium ${
                mutation.isError ? "text-rose-500" : "text-sky-600 dark:text-sky-300"
              }`}
            >
              {statusMessage}
            </p>
          )}
        </form>
      </section>

      <section className="flex-1 space-y-8 rounded-3xl border border-transparent bg-white/70 p-0 shadow-sm shadow-sky-100 backdrop-blur-md dark:border-zinc-800/50 dark:bg-zinc-950/40 dark:shadow-none">
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="order-2 rounded-3xl border border-zinc-200/80 bg-zinc-50/80 p-6 shadow-inner shadow-zinc-100 dark:border-zinc-800/60 dark:bg-zinc-900/60 dark:shadow-none lg:order-1 lg:col-span-3">
            <h2 className="mb-6 text-sm font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Agent pipeline
            </h2>
            <ol className="space-y-5">
              {steps.map((step, index) => {
                const state =
                  activeStep > index
                    ? "done"
                    : activeStep === index
                    ? "active"
                    : "upcoming";
                return (
                  <li
                    key={step.label}
                    className={`flex items-start gap-4 rounded-2xl border px-4 py-4 transition ${
                      state === "done"
                        ? "border-emerald-200 bg-emerald-50/80 text-emerald-600 dark:border-emerald-700/40 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : state === "active"
                        ? "border-sky-200 bg-sky-50/80 text-sky-600 shadow-sm shadow-sky-100 dark:border-sky-700/50 dark:bg-sky-900/40 dark:text-sky-200"
                        : "border-zinc-200/70 bg-white/40 text-zinc-500 dark:border-zinc-800/60 dark:bg-zinc-950/40 dark:text-zinc-400"
                    }`}
                  >
                    <span className="mt-1 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-white text-xs font-semibold shadow-sm shadow-zinc-200 dark:bg-zinc-950">
                      {index + 1}
                    </span>
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">{step.label}</p>
                      <p className="text-xs leading-5">{step.description}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="order-1 flex flex-col gap-4 rounded-3xl border border-zinc-200/80 bg-white/90 p-6 shadow-sm shadow-zinc-100 dark:border-zinc-800/60 dark:bg-zinc-950/60 dark:shadow-none lg:order-2 lg:col-span-2">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Source intelligence
            </h2>
            {mutation.data ? (
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 shadow-inner shadow-zinc-100 dark:border-zinc-800/60 dark:shadow-none">
                  <img
                    src={mutation.data.video.thumbnail}
                    alt={mutation.data.video.title}
                    className="h-40 w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                    <p className="text-xs uppercase tracking-widest text-white/80">YouTube source</p>
                    <p className="text-sm font-semibold leading-tight">{mutation.data.video.title}</p>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-xs text-zinc-500 dark:text-zinc-300">
                  <div>
                    <dt className="uppercase tracking-widest text-[10px]">Channel</dt>
                    <dd className="font-semibold text-zinc-700 dark:text-zinc-100">
                      {mutation.data.video.channel}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-widest text-[10px]">Runtime</dt>
                    <dd className="font-semibold text-zinc-700 dark:text-zinc-100">
                      {formatDuration(mutation.data.video.durationSeconds)}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-widest text-[10px]">Transcript</dt>
                    <dd className="font-semibold text-zinc-700 dark:text-zinc-100">
                      {mutation.data.transcriptAvailable ? "Captured" : "Unavailable"}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-widest text-[10px]">View count</dt>
                    <dd className="font-semibold text-zinc-700 dark:text-zinc-100">
                      {mutation.data.video.viewCount
                        ? Number(mutation.data.video.viewCount).toLocaleString()
                        : "—"}
                    </dd>
                  </div>
                </dl>
                <a
                  href={mutation.data.video.url}
                  target="_blank"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-sky-600 transition hover:text-sky-700 dark:text-sky-300"
                >
                  Watch original <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-zinc-300/70 p-6 text-center text-xs text-zinc-500 dark:border-zinc-700/70 dark:text-zinc-400">
                <MonitorPlay className="h-10 w-10 text-zinc-400 dark:text-zinc-600" />
                Drop a YouTube link to surface creator intel, transcripts, and pacing clues.
              </div>
            )}
          </div>
        </div>

        {mutation.data && (
          <article className="space-y-10 rounded-3xl border border-zinc-200/80 bg-white/95 p-8 shadow-lg shadow-sky-100 dark:border-zinc-800/60 dark:bg-zinc-950/70 dark:shadow-none">
            <header className="flex flex-col gap-3 border-b border-zinc-200/70 pb-6 dark:border-zinc-800/70">
              <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-widest text-sky-500 dark:text-sky-300">
                <Podcast className="h-4 w-4" /> Episode blueprint
              </div>
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {mutation.data.podcast.podcastTitle}
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {mutation.data.podcast.tagline}
              </p>
            </header>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="space-y-6">
                <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/80 p-6 text-sm text-zinc-600 shadow-inner shadow-zinc-100 dark:border-zinc-800/60 dark:bg-zinc-900/50 dark:text-zinc-200">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                    Cold open
                  </h3>
                  <p>{mutation.data.podcast.intro}</p>
                </div>

                <div className="space-y-5">
                  {mutation.data.podcast.segments.map((segment, index) => (
                    <div
                      key={segment.title}
                      className="space-y-3 rounded-2xl border border-zinc-200/70 bg-white/80 p-6 shadow-sm shadow-zinc-100 dark:border-zinc-800/60 dark:bg-zinc-950/60 dark:shadow-none"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                            Segment {index + 1}
                          </p>
                          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                            {segment.title}
                          </h3>
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200/70 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-700/70 dark:bg-zinc-900/60 dark:text-zinc-200">
                          {segment.durationMinutes} minutes
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-300">{segment.summary}</p>
                      <div className="rounded-xl border border-dashed border-zinc-300/70 bg-zinc-50/90 p-4 text-xs text-zinc-600 dark:border-zinc-700/70 dark:bg-zinc-900/50 dark:text-zinc-300">
                        <p className="mb-2 font-semibold uppercase tracking-widest text-[10px] text-zinc-500 dark:text-zinc-400">
                          Host dialogue
                        </p>
                        <div className="space-y-2 leading-5">
                          {segment.dialogue.map((line, idx) => (
                            <p key={`${line.speaker}-${idx}`}>
                              <span className="font-semibold text-zinc-700 dark:text-zinc-100">
                                {line.speaker}:
                              </span>{" "}
                              {line.line}
                            </p>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-zinc-200/70 bg-gradient-to-r from-sky-50/80 to-indigo-50/80 p-4 text-xs text-zinc-600 dark:border-zinc-700/70 dark:from-sky-900/40 dark:to-indigo-900/40 dark:text-zinc-300">
                        <span className="font-semibold uppercase tracking-widest text-[10px] text-sky-600 dark:text-sky-300">
                          Sound design note
                        </span>
                        <p className="mt-1">{segment.soundDesign}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/80 p-6 text-sm text-zinc-600 shadow-inner shadow-zinc-100 dark:border-zinc-800/60 dark:bg-zinc-900/50 dark:text-zinc-200">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                    Closing moment
                  </h3>
                  <p>{mutation.data.podcast.outro}</p>
                </div>
              </div>

              <aside className="space-y-5">
                <div className="rounded-2xl border border-zinc-200/70 bg-white/80 p-5 shadow-inner shadow-zinc-100 dark:border-zinc-800/60 dark:bg-zinc-950/50 dark:shadow-none">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                    Host roster
                  </h3>
                  <ul className="space-y-3 text-xs text-zinc-600 dark:text-zinc-300">
                    {mutation.data.podcast.hosts.map((host) => (
                      <li key={host.name} className="rounded-xl border border-zinc-200/70 bg-zinc-50/90 p-3 dark:border-zinc-700/70 dark:bg-zinc-900/60">
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                          {host.name}
                        </p>
                        <p className="leading-5">{host.persona}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-widest text-zinc-400">
                          Delivery: {host.style}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-zinc-200/70 bg-white/80 p-5 shadow-inner shadow-zinc-100 dark:border-zinc-800/60 dark:bg-zinc-950/50 dark:shadow-none">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                    Transition cues
                  </h3>
                  <ul className="list-disc space-y-2 pl-4 text-xs text-zinc-600 dark:text-zinc-300">
                    {mutation.data.podcast.transitionCues.map((cue, idx) => (
                      <li key={`${cue}-${idx}`}>{cue}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-zinc-200/70 bg-white/80 p-5 shadow-inner shadow-zinc-100 dark:border-zinc-800/60 dark:bg-zinc-950/50 dark:shadow-none">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                    Show notes &amp; takeaways
                  </h3>
                  <div className="space-y-4 text-xs text-zinc-600 dark:text-zinc-300">
                    <div>
                      <p className="mb-2 font-semibold uppercase tracking-widest text-[10px] text-zinc-500 dark:text-zinc-400">
                        Highlights
                      </p>
                      <ul className="list-disc space-y-2 pl-4">
                        {mutation.data.podcast.keyTakeaways.map((item, idx) => (
                          <li key={`${idx}-takeaway`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-2 font-semibold uppercase tracking-widest text-[10px] text-zinc-500 dark:text-zinc-400">
                        Notes
                      </p>
                      <ul className="list-disc space-y-2 pl-4">
                        {mutation.data.podcast.showNotes.map((item, idx) => (
                          <li key={`${idx}-note`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-2 font-semibold uppercase tracking-widest text-[10px] text-zinc-500 dark:text-zinc-400">
                        Call to action
                      </p>
                      <p>{mutation.data.podcast.callToAction}</p>
                    </div>
                  </div>
                </div>

                {mutation.data.podcast.resources.length > 0 && (
                  <div className="rounded-2xl border border-zinc-200/70 bg-white/80 p-5 shadow-inner shadow-zinc-100 dark:border-zinc-800/60 dark:bg-zinc-950/50 dark:shadow-none">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                      Resources &amp; references
                    </h3>
                    <ul className="space-y-2 text-xs text-sky-600 dark:text-sky-300">
                      {mutation.data.podcast.resources.map((resource) => (
                        <li key={`${resource.label}-${resource.url}`}>
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 hover:underline"
                          >
                            {resource.label} <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </aside>
            </section>

            {mutation.data.audio && (
              <section className="rounded-2xl border border-sky-200/60 bg-gradient-to-r from-sky-50 via-indigo-50 to-purple-50 p-6 shadow-inner shadow-sky-100 dark:border-sky-700/50 dark:from-sky-900/40 dark:via-indigo-900/40 dark:to-purple-900/40">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-sky-600 dark:text-sky-200">
                  Synthesized narration
                </h3>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {audioUrl ? (
                    <audio controls className="w-full max-w-2xl rounded-xl bg-white/80 p-2 shadow-sm shadow-sky-100 dark:bg-zinc-950/70 dark:shadow-none">
                      <source src={audioUrl} type={mutation.data.audio.mimeType} />
                      Your browser does not support audio playback.
                    </audio>
                  ) : (
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                      Audio synthesis skipped. Re-run with a shorter video or different voice.
                    </p>
                  )}
                  {audioUrl && (
                    <a
                      download={mutation.data.audio.fileName}
                      href={audioUrl}
                      className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-200 dark:bg-sky-500 dark:hover:bg-sky-400 dark:focus:ring-sky-800"
                    >
                      <Download className="h-4 w-4" />
                      Download MP3
                    </a>
                  )}
                </div>
              </section>
            )}
          </article>
        )}

        {!mutation.data && (
          <div className="flex flex-col items-center justify-center gap-6 rounded-3xl border border-dashed border-zinc-300/70 bg-white/80 p-16 text-center text-sm text-zinc-600 shadow-inner shadow-zinc-100 dark:border-zinc-700/70 dark:bg-zinc-950/50 dark:text-zinc-300">
            <Sparkles className="h-12 w-12 text-sky-500" />
            <div className="space-y-3">
              <p className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
                Your creative studio is standing by.
              </p>
              <p className="max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-300">
                Drop a YouTube link and this agent will design a multi-host episode, craft show notes,
                and render narration in one pass. Great for newsletter repackaging, knowledge capture,
                and keeping your podcast pipeline evergreen.
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
