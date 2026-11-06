# Live workflows (built directly in n8n through the n8n MCP connector)

- DD Main (Dukaan Digital bot): https://mrinvictus.app.n8n.cloud/workflow/FTYCrGF0gtNpqw7F
- DD Insights (Analyst + festival nudge): https://mrinvictus.app.n8n.cloud/workflow/xDPW4YqZutbpy9e6
- Data tables: dd_shops, dd_posts, dd_festivals (seed rows use chat_id PENDING until the owner sends /start)

The *.sdk.js files here are the n8n Workflow SDK source the workflows were generated from (tools/gen_n8n.py).
AI steps (Listener, Strategist, Copywriter, Memory keeper, Analyst, Nudge writer, voice transcription) run on
n8n Cloud's built-in AI credits, so no Anthropic or OpenAI key is needed.
Render poster and Post to Facebook are disabled until their credentials are added.
