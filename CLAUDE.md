# Dukaan Digital — context for Claude Code

We are a student team building **Dukaan Digital** for the Agentic Chase hackathon (PS05 Open Innovation):
a team of AI agents in **n8n Cloud** that does marketing for small shops in West Bengal from one product photo
and a Bengali voice note, over a Telegram bot. The owner approves every post before it's published.

## Layout
- `BUILD_GUIDE.md`: the node-by-node build of the two n8n workflows (DD Main, DD Insights). Source of truth for node names.
- `n8n/code/*.js`: n8n Code node scripts, numbered in flow order. They reference other nodes by name with `$('Node name')`.
- `prompts/*.md`: agent system prompts. Text below the `---` line is the prompt.
- `templates/poster.html`: poster design (1080×1080, Bengali via Google Fonts "Hind Siliguri"), rendered by the HTML/CSS to Image API.
- `data/*.csv`: seed rows for the n8n Data tables (dd_shops, dd_posts, dd_festivals).
- `tools/`: local helpers (render the poster preview, run the scripts against sample data).

## Generated files: don't hand-edit
- `n8n/code/08_build_poster.js` embeds `templates/poster.html` in `TEMPLATE`.
- `n8n/code/05,13,14,16,17_*_request.js` and `15_strategist_input.js` embed the prompts from `prompts/`.
After changing a template or prompt, regenerate with: `python tools/gen_poster_js.py .` and `python tools/gen_requests.py .`

## Rules for any change
- n8n Code nodes: plain JavaScript, top-level `return` of `[{ json: {...} }]` (or `{ json }` in "Run Once for Each Item" mode). Top-level `await` is allowed.
- Never invent prices, offers, festival dates or shop facts in prompts or code. Festival dates live in `data/festivals.csv`
  and are duplicated in `07_tool_upcoming_festivals.js`, `12_nudge_check.js` and `16_analyst_request.js`. Keep all four in sync.
- Telegram limits: photo caption ≤ 1024 chars, `callback_data` ≤ 64 bytes, use parse mode HTML and escape `& < >`.
- No API keys in files. Keys live only in n8n Credentials.
- After editing any script, run `node tools/test_scripts.js` (mock n8n runtime with sample data) and fix failures.

## Optional: let Claude Code generate or validate n8n workflow JSON
Install the n8n-mcp server (documentation and validation tools work without an n8n API key):
```
claude mcp add n8n-mcp -e MCP_MODE=stdio -e LOG_LEVEL=error -e DISABLE_CONSOLE_OUTPUT=true -- npx n8n-mcp
```
Then ask: "Using BUILD_GUIDE.md section 2, generate the DD Main workflow JSON with n8n-mcp, validate it with validate_workflow,
and save it to n8n/workflows/dd_main.json". Import it in n8n with Workflows → Import from File, then attach the credentials.
