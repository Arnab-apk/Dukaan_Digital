# Live workflows (n8n Cloud)

Exported from the live instance on 7 Nov 2026, just before judging. Import any of them with
**Workflows → Import from File**, then attach your own credentials (Telegram, Google Gemini, HTML/CSS to Image, Facebook Query Auth).
The exports hold credential names and IDs only; no keys or tokens are included.

| File | Workflow | Nodes | What it does |
|---|---|---|---|
| `dd_main.json` | DD Main (Dukaan Digital bot) | 91 | Telegram bot: photo/voice → Listener → Strategist → Copywriter → poster → preview → owner approval → Facebook Page; `/setup`, `/language`, `/leads`, `/report`, `/nudge`, `/memory`, `/help`; out-of-scope guardrail |
| `dd_insights.json` | DD Insights (Analyst + festival nudge) | 20 | 9:00 festival nudge and the `/report` Analyst |
| `dd_lead_finder.json` | DD Lead Finder | 10 | OpenStreetMap listings → Gemini picks customer leads or competitors → Telegram summary → `dd_leads` |

Data tables: `dd_shops`, `dd_posts`, `dd_leads` (seed rows in `data/`).

## Models (Google Gemini, free tier)
- Listener: `gemini-3.1-flash-lite`, backup `gemini-3.5-flash`
- Strategist (agent with the `upcoming_festivals` tool): `gemini-3.5-flash-lite`
- Copywriter: `gemini-3.5-flash-lite`, backup `gemini-3.1-flash-lite`
- Memory keeper, Nudge writer: `gemini-3.1-flash-lite`; Analyst: `gemini-3.5-flash-lite`
- Voice transcription, Lead Finder: `gemini-flash-lite-latest`

## Reliability
- Listener and Copywriter switch to a backup model if the main one is busy; if both fail the owner gets "please send again in a minute".
- The poster step can't stop a post: if the render or Telegram's image fetch fails, the preview is sent with the original photo.
- Progress messages (1/4 … 4/4) edit one Telegram message while the agents work.

`n8n/code/live/` holds every Code node's script exactly as it runs in these exports. The numbered scripts in `n8n/code/`
are the original build-guide versions; the live exports are the source of truth.
The `*.sdk.js` files are the n8n Workflow SDK sources the first versions were generated from.
