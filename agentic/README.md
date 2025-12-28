## Agentic Podcast Studio

Agentic Podcast Studio converts any public YouTube link into a fully packaged, podcast-ready episode. The agent orchestrates transcript extraction, multi-host script writing, narration synthesis, and production-ready show notes in one pass.

### ✨ Capabilities

- Pulls YouTube metadata & transcripts directly from the link you provide.
- Crafts a multi-segment podcast script with named hosts, dialogue, and sound design cues.
- Generates show notes, key takeaways, resources, and ready-to-publish copy.
- Synthesizes narration via OpenAI Text-to-Speech and delivers an MP3 download.
- Offers production style presets (storytelling, documentary, roundtable, newsroom) and voice selection.

### 🚀 Quickstart

1. Install dependencies:
   ```bash
   npm install
   ```
2. Launch the development server:
   ```bash
   npm run dev
   ```
3. Visit [http://localhost:3000](http://localhost:3000) and provide:
   - A public YouTube video URL
   - An OpenAI API key with access to `gpt-4o-mini` and `gpt-4o-mini-tts`
4. Pick a production preset and narrator voice, then generate your podcast bundle.

> **Note:** API keys are only stored locally in your browser storage if you opt in. Keys are never persisted server-side.

### 🧰 Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript, Tailwind)
- **AI Runtime:** OpenAI Responses API + TTS
- **Video Intelligence:** `ytdl-core` for metadata, `youtube-transcript` for captions
- **State & Data:** React Query for async orchestration

### 🛫 Deployment

This project is Vercel-ready. After verifying locally, deploy with:

```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-8c18b4f4
```

Then confirm the production build:

```bash
curl https://agentic-8c18b4f4.vercel.app
```

### 📄 License

MIT — adapt and extend the agent for your own podcast workflows.
