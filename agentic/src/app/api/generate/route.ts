import { NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import ytdl from "ytdl-core";
import { YoutubeTranscript } from "youtube-transcript";
import { Buffer } from "node:buffer";

const requestSchema = z.object({
  youtubeUrl: z.string().url(),
  openaiKey: z.string().min(20, "OpenAI API key is required for generation"),
  voice: z.string().default("alloy"),
  stylePreset: z
    .enum(["documentary", "roundtable", "storytelling", "newsroom"])
    .default("documentary"),
});

const podcastSchema = z.object({
  podcastTitle: z.string(),
  tagline: z.string(),
  intro: z.string(),
  outro: z.string(),
  hosts: z
    .array(
      z.object({
        name: z.string(),
        persona: z.string(),
        style: z.string(),
      }),
    )
    .min(2),
  segments: z
    .array(
      z.object({
        title: z.string(),
        summary: z.string(),
        durationMinutes: z.number(),
        dialogue: z
          .array(
            z.object({
              speaker: z.string(),
              line: z.string(),
            }),
          )
          .min(2),
        soundDesign: z.string(),
      }),
    )
    .min(3),
  transitionCues: z.array(z.string()),
  showNotes: z.array(z.string()),
  keyTakeaways: z.array(z.string()),
  callToAction: z.string(),
  resources: z.array(
    z.object({
      label: z.string(),
      url: z.string(),
    }),
  ),
});

type JsonSchemaDefinition = {
  name: string;
  schema: Record<string, unknown>;
};

const podcastJsonSchema: JsonSchemaDefinition = {
  name: "podcast_blueprint",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "podcastTitle",
      "tagline",
      "intro",
      "outro",
      "hosts",
      "segments",
      "transitionCues",
      "showNotes",
      "keyTakeaways",
      "callToAction",
      "resources",
    ],
    properties: {
      podcastTitle: { type: "string" },
      tagline: { type: "string" },
      intro: { type: "string" },
      outro: { type: "string" },
      hosts: {
        type: "array",
        minItems: 2,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "persona", "style"],
          properties: {
            name: { type: "string" },
            persona: { type: "string" },
            style: { type: "string" },
          },
        },
      },
      segments: {
        type: "array",
        minItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "summary", "durationMinutes", "dialogue", "soundDesign"],
          properties: {
            title: { type: "string" },
            summary: { type: "string" },
            durationMinutes: { type: "number" },
            dialogue: {
              type: "array",
              minItems: 2,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["speaker", "line"],
                properties: {
                  speaker: { type: "string" },
                  line: { type: "string" },
                },
              },
            },
            soundDesign: { type: "string" },
          },
        },
      },
      transitionCues: {
        type: "array",
        items: { type: "string" },
      },
      showNotes: {
        type: "array",
        items: { type: "string" },
      },
      keyTakeaways: {
        type: "array",
        items: { type: "string" },
      },
      callToAction: { type: "string" },
      resources: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["label", "url"],
          properties: {
            label: { type: "string" },
            url: { type: "string" },
          },
        },
      },
    },
  },
};

const MAX_TRANSCRIPT_CHARS = 8000;

async function fetchVideoDetails(youtubeUrl: string) {
  try {
    const info = await ytdl.getInfo(youtubeUrl);
    const details = info.videoDetails;

    return {
      id: details.videoId,
      title: details.title,
      author: details.author?.name ?? "Unknown Creator",
      description: details.description,
      thumbnails: details.thumbnails,
      lengthSeconds: Number(details.lengthSeconds ?? 0),
      uploadDate: details.uploadDate,
      viewCount: details.viewCount,
      url: youtubeUrl,
    };
  } catch (error) {
    console.error("Failed to fetch base video details", error);
    throw new Error("Unable to fetch YouTube metadata. Check that the link is public.");
  }
}

async function fetchTranscript(videoId: string) {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" });

    const transcriptText = transcript
      .map((entry) => entry.text)
      .join(" ")
      .replace(/\s+/g, " ");

    return transcriptText.slice(0, MAX_TRANSCRIPT_CHARS);
  } catch (error) {
    console.warn("No transcript found, continuing with fallback summary.", error);
    return "";
  }
}

function buildPromptPayload({
  details,
  transcript,
  stylePreset,
}: {
  details: Awaited<ReturnType<typeof fetchVideoDetails>>;
  transcript: string;
  stylePreset: z.infer<typeof requestSchema>["stylePreset"];
}) {
  const safeTranscript = transcript || "Transcript unavailable. Rely on the metadata to infer the themes and craft a compelling narrative.";
  const durationMinutes = Math.max(5, Math.round((details.lengthSeconds || 0) / 60));

  const styleInstructions: Record<string, string> = {
    documentary:
      "Structure the conversation as a documentary-style breakdown with rich context, narrative bridges, and thoughtful commentary.",
    roundtable:
      "Structure the conversation as a vibrant roundtable debate with multiple perspectives, friendly disagreement, and expert insights.",
    storytelling:
      "Structure the conversation as a cinematic storytelling experience, weaving narrative arcs, character moments, and evocative imagery.",
    newsroom:
      "Structure the conversation as an investigative newsroom briefing with crisp pacing, breaking updates, and actionable analysis.",
  };

  return {
    system: `You are an award-winning podcast showrunner trusted to convert online videos into binge-worthy podcast episodes. You excel at narrative design, factual accuracy, and pacing.`,
    user: `
Create a podcast episode blueprint extracted from a YouTube video.

Video metadata:
- Title: ${details.title}
- Creator: ${details.author}
- Duration (approx): ${durationMinutes} minutes
- Description: ${details.description?.slice(0, 600) ?? "No description available."}

Transcript snippet (may be partial):
${safeTranscript}

Creative direction:
- Podcast tone preset: ${stylePreset}
- Detailed tone directions: ${styleInstructions[stylePreset]}
- Ensure factual alignment with the source.
- Provide tight pacing, vivid hooks, and keep listeners engaged.
- Always craft at least 3 substantial segments.
- Use two recurring hosts with complementary viewpoints.
- Add tasteful sound design cues without relying on stock phrases.
`,
  };
}

function assembleNarrationScript(podcast: z.infer<typeof podcastSchema>) {
  const intro = `Host ${podcast.hosts[0]?.name ?? "A"}: ${podcast.intro}`;
  const segments = podcast.segments
    .map((segment) => {
      const dialogue = segment.dialogue
        .map((line) => `${line.speaker}: ${line.line}`)
        .join("\n");
      return `\n[Segment: ${segment.title}]\n${dialogue}\n`;
    })
    .join("\n");
  const outro = `${podcast.hosts[1]?.name ?? "B"}: ${podcast.outro}`;

  return `${intro}\n${segments}\n${outro}`.slice(0, 8000);
}

async function synthesizeNarration(params: {
  script: string;
  apiKey: string;
  voice: string;
}) {
  const { script, apiKey, voice } = params;
  if (!script.trim()) return null;

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice,
      response_format: "mp3",
      input: script,
    });

    const audioArrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(audioArrayBuffer);

    return buffer.toString("base64");
  } catch (error) {
    console.error("Narration synthesis failed", error);
    return null;
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { youtubeUrl, openaiKey, voice, stylePreset } = requestSchema.parse(payload);

    const videoDetails = await fetchVideoDetails(youtubeUrl);
    const transcript = await fetchTranscript(videoDetails.id);

    const prompt = buildPromptPayload({
      details: videoDetails,
      transcript,
      stylePreset,
    });

    const client = new OpenAI({ apiKey: openaiKey });
    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      text: {
        format: {
          type: "json_schema",
          name: podcastJsonSchema.name,
          schema: podcastJsonSchema.schema,
          strict: true,
        },
      },
      max_output_tokens: 2000,
    });

    const outputText = response.output_text?.trim();
    if (!outputText) {
      console.error("AI returned empty response", response);
      return NextResponse.json(
        { success: false, error: "AI response was empty. Please retry with a different voice or style." },
        { status: 502 },
      );
    }

    const parsedPodcast = podcastSchema.safeParse(JSON.parse(outputText));
    if (!parsedPodcast.success) {
      console.error("Failed to parse podcast payload", parsedPodcast.error);
      return NextResponse.json(
        { success: false, error: "AI response malformed. Try again with a different video." },
        { status: 502 },
      );
    }

    const narrationScript = assembleNarrationScript(parsedPodcast.data);
    const audioBase64 = await synthesizeNarration({
      script: narrationScript,
      apiKey: openaiKey,
      voice,
    });

    return NextResponse.json({
      success: true,
      data: {
        video: {
          title: videoDetails.title,
          channel: videoDetails.author,
          description: videoDetails.description,
          thumbnail:
            videoDetails.thumbnails?.[videoDetails.thumbnails.length - 1]?.url ??
            `https://img.youtube.com/vi/${videoDetails.id}/hqdefault.jpg`,
          durationSeconds: videoDetails.lengthSeconds,
          uploadDate: videoDetails.uploadDate,
          viewCount: videoDetails.viewCount,
          url: youtubeUrl,
        },
        transcriptAvailable: Boolean(transcript),
        podcast: parsedPodcast.data,
        audio: audioBase64
          ? {
              base64: audioBase64,
              mimeType: "audio/mpeg",
              fileName: `${parsedPodcast.data.podcastTitle.replace(/[^\w\d]+/g, "-").toLowerCase() || "podcast"}-ai.mp3`,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Podcast generation failed", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error. Please verify your API key and try again.",
      },
      { status: 500 },
    );
  }
}
