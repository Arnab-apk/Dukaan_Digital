# Dukaan Digital — n8n build guide (n8n Cloud)

Build two workflows: **DD Main** (the Telegram bot) and **DD Insights** (Analyst and festival nudge).
Every Code node's script is in `n8n/code/`. Open the file and paste its whole content into the Code node.
**Node names matter**, because the scripts find each other by name. Use the names in **bold** exactly as written.

> A Telegram bot has only ONE webhook. Keep exactly one Telegram Trigger, in DD Main.
> While building, use "Test workflow" (the bot listens briefly). Before the demo, **Activate** DD Main and stop clicking Test,
> because testing moves the webhook to the test URL and the live bot goes silent.

---

## 0. Credentials (n8n → Credentials → Add)

| Credential name | Type | Fields |
|---|---|---|
| `DD Telegram` | Telegram API | Access Token from @BotFather |
| `DD Anthropic header` | Header Auth | Name `x-api-key`, Value = Anthropic API key |
| `DD Anthropic` | Anthropic | API key (used by the Strategist AI Agent's chat model) |
| `DD OpenAI` | OpenAI | API key (voice transcription) |
| `DD HCTI` | Basic Auth | User = HTML/CSS to Image **User ID**, Password = **API Key** |
| `DD Facebook token` (optional) | Query Auth | Name `access_token`, Value = Page access token |

## 1. Data tables (n8n → Data tables → Create)

Create three tables. Use type **string** for every column unless marked (number). If you import the CSVs, check each column's type afterwards:
importing can turn `chat_id` or dates into number or date types, and the conditions in this guide then fail.

- **dd_shops**: chat_id, shop_name_en, shop_name_bn, shop_type, area, phone, upi_id, brand_color, accent_color, tone, languages, channel_id, fb_page_id, style_notes, insights.
  Add one row from `data/shops.csv`. Put your owner phone's chat_id in it; the bot's `/start` reply tells you the number.
  `channel_id` must be `@publicchannelname` or the channel's numeric ID starting with `-100`.
- **dd_posts**: post_id, chat_id, created_at, updated_at, status, source, photo_file_id, product, price, angle, festival, has_price_on_poster, headline, image_url, fb_post_id, reactions (number), comments (number), shares (number), feedback, listener_json, strategy_json, copy_json, posted_at.
  Add the 10 rows from `data/posts_seed.csv` (source = `seeded_demo`), with chat_id replaced by the owner's chat_id. They give the Analyst history to work from.
  The CSV header matches these columns exactly.
- **dd_festivals** (optional, for show): the rows of `data/festivals.csv`. The code already embeds the same verified dates.

---

## 2. Workflow "DD Main"

### 2a. Top of the flow (all messages)

1. **Telegram Trigger**: credential `DD Telegram`; Updates: `message`, `callback_query`.
2. **Route update**: Code node, script `01_route_update.js`.
3. **Get shop**: Data table → Get row(s), table dd_shops, condition `chat_id` equals `{{ $json.chat_id }}`, Limit 1.
   Settings → **Always Output Data: ON**.
4. **Get latest post**: Data table → Get row(s), table dd_posts, condition `chat_id` equals `{{ $('Route update').first().json.chat_id }}`, **Return All**. **Always Output Data: ON**.
   The next script sorts these rows itself. Settings → **Execute Once: ON**, so the rows don't multiply the next node.
5. **Decide next step**: Code node, script `02_decide_next_step.js`.
6. **Get post**: Data table → Get row(s), table dd_posts, condition `post_id` equals `{{ $json.post_id || '-' }}`, Limit 1. **Always Output Data: ON**.
   This node sits on every path. If Always Output Data is off, a new post, a command or /start dies silently here.
7. **Route**: Switch node, Mode **Rules**, routing on `{{ $('Decide next step').first().json.next }}`, with one output each for
   `onboard`, `help`, `command`, `start_collecting`, `create_post`, `edit_post`, `button`. `ignore` has no output, so those updates just stop.

**On every Telegram Send Message / Send Photo in this guide:** Chat ID = `{{ $('Decide next step').first().json.chat_id }}` unless another value is given,
and under Additional Fields turn **Append n8n Attribution OFF**. Otherwise every message ends with "sent automatically with n8n".

### 2b. Simple branches

- **onboard**: Telegram → Send Message, Chat ID `{{ $('Decide next step').first().json.chat_id }}`, text:
  `নমস্কার! I'm Dukaan Digital. Your chat ID is {{ $('Decide next step').first().json.chat_id }}. Ask the team to register your shop, then send me a product photo.`
- **help**: Send Message: `Send a product photo, then a voice note with the price or offer. Commands: /report /nudge /memory`
- **command**: Switch on `{{ $('Decide next step').first().json.cmd }}`:
  - `/report` → Execute Workflow "DD Insights" with fields `chat_id` = `{{ $('Decide next step').first().json.chat_id }}` and `mode` = `report`
  - `/nudge` → the same, with `mode` = `nudge`
  - `/memory` → Send Message `Style notes: {{ ($('Decide next step').first().json.shop || {}).style_notes || '(none yet)' }}`
  - `/setup` → Code **Parse setup** (`18_parse_setup.js`) → IF `{{ $json.ok }}`:
    true → Data table **Upsert** on dd_shops matching `chat_id` = `{{ $json.shop.chat_id }}`, every column = `{{ $json.shop.<column> }}`
    (Always Output Data ON) → Send Message `{{ $('Parse setup').first().json.msg }}` with three inline buttons:
    `বাংলা` = callback `lang:bn`, `English` = `lang:en`, `বাংলা + English` = `lang:mixed`. false → Send Message with the `/setup` usage.
    In **Decide next step**, `/setup` routes to `command` even when the chat has no shop yet.
  - `/language` → Send Message "Which language should your posts use?" with the same three buttons.
- **start_collecting**: Data table → Insert row into dd_posts:
  - post_id = `{{ $('Decide next step').first().json.post_id }}`
  - chat_id = `{{ $('Decide next step').first().json.chat_id }}`
  - photo_file_id = `{{ $('Decide next step').first().json.photo_file_id }}` (needed later; the voice note alone has no photo)
  - created_at = updated_at = `{{ $('Decide next step').first().json.now }}`
  - status = `collecting`, source = `live`
  Then Send Message: `📸 ছবি পেয়েছি! এবার দাম/অফার বলে একটা ভয়েস নোট পাঠান (or type it).`

### 2c. Create and edit (shared start)

Both `create_post` and `edit_post` outputs go to:

1. Send Message `⏳ কাজ চলছে… (working on it)`. Do this first so the owner isn't waiting in silence; the full run takes 20–40 s.
2. IF `{{ $('Decide next step').first().json.voice_file_id }}` is not empty:
   - true → Telegram → **Get File** (File ID = that voice_file_id, **Download ON**) → **Fix voice file** (`03_fix_voice_file.js`) →
     **Transcribe voice**: OpenAI node → Audio → Transcribe a Recording, credential `DD OpenAI`, Options → Language `bn`.
   - false → go straight on.
3. Both IF branches → Telegram → **Get photo file** (File ID `{{ $('Decide next step').first().json.photo_file_id }}`, Download ON) →
   **Photo to base64** (`04_photo_to_base64.js`).
4. **Mode**: Switch on `{{ $('Decide next step').first().json.next }}` → `create_post` / `edit_post`.

### 2d. Create path

1. **Build Listener request** (`05_listener_request.js`) → **Listener Claude** (HTTP Request; setup is in the script header, credential `DD Anthropic header`) →
   **Parse Listener JSON** (`06_parse_llm_json.js`, REQUIRED `['intent','product_en']`).
2. *(Fallback mode only)* **Get past posts**: Data table Get row(s) on dd_posts, chat_id = this chat, Return All.
3. **Build Strategist input** (`15_strategist_input.js`).
4. **Strategist**: AI Agent node.
   - Prompt: Define below, `{{ $json.prompt }}`
   - Options → System Message: paste from `prompts/02_strategist.md`
   - Chat Model: Anthropic Chat Model (credential `DD Anthropic`, model Claude Sonnet)
   - Tool 1: **Code Tool**, name `upcoming_festivals`, description from the top of `07_tool_upcoming_festivals.js`, code = that file
   - Tool 2: **Data table** tool, name `past_post_results`, Get row(s) on dd_posts where chat_id = `{{ $('Decide next step').first().json.chat_id }}`.
     If Data table isn't offered as a tool, skip it and use step 2 instead; the script picks it up.
5. **Parse Strategist JSON** (`06_parse_llm_json.js`, REQUIRED `['angle','reason']`).
6. → into **Build Copywriter request** (2f).

### 2e. Edit path

1. **Build Memory request** (`14_memory_request.js`) → **Memory Claude** (HTTP, as before) → **Parse Memory JSON** (REQUIRED `['is_lasting','new_style_notes']`).
2. IF `{{ $json.is_lasting }}` is true → Data table **Update row(s)** on dd_shops where `chat_id` equals `{{ $('Decide next step').first().json.chat_id }}`, set `style_notes` = `{{ $('Parse Memory JSON').first().json.new_style_notes }}`.
3. Both IF branches → **Build Copywriter request** (2f).

### 2f. Shared end (create and edit)

1. **Build Copywriter request** (`13_copywriter_request.js`) → **Copywriter Claude** (HTTP) → **Parse Copywriter JSON** (REQUIRED `['headline_bn','caption_bn']`).
   IF `ok` is false → Send Message `দুঃখিত, আবার চেষ্টা করুন (Sorry, please try again)` and stop.
2. **Build poster** (`08_build_poster.js`) → **Render poster**: HTTP Request POST `https://hcti.io/v1/image`, credential `DD HCTI` (Basic Auth),
   body `{{ JSON.stringify($json.hcti) }}`. Settings: Retry On Fail ON, **On Error: Continue** (regular output, not "using error output"),
   so a failed render still reaches Build preview, which falls back to the original photo.
3. **Build preview** (`09_build_preview.js`).
4. Data table **Upsert row** on dd_posts, match `post_id`, map the columns from `{{ $json.row.<column> }}`.
5. **Send preview**: Telegram → Send Photo
   - Chat ID `{{ $('Build preview').first().json.chat_id }}`
   - Photo: `{{ $('Build preview').first().json.photo || $('Build preview').first().json.photo_file_id }}`
   - Caption `{{ $('Build preview').first().json.caption }}`, Parse Mode HTML
   - Reply Markup: Inline Keyboard, one row with three buttons:
     `✅ Post` → `post:{{ $('Build preview').first().json.post_id }}`, `✏️ Change` → `edit:…`, `⏭ Skip` → `skip:…`

### 2g. Buttons

1. Telegram → Callback → **Answer Query**, Query ID `{{ $('Decide next step').first().json.callback_id }}`. Always answer, or the button keeps spinning.
2. Switch on `{{ $('Decide next step').first().json.action }}`:
   - **post** →
     1. **Prepare publish** (`10_publish_prepare.js`).
     2. IF `{{ $json.already }}` is true → Send Message `আগেই পোস্ট হয়েছে (Already posted)` and stop. This catches double taps and Post on an old preview.
     3. Telegram Send Photo, Chat ID `{{ $('Prepare publish').first().json.channel_id }}`, photo `{{ $('Prepare publish').first().json.image_url || $('Prepare publish').first().json.photo_file_id }}`,
        caption `{{ $('Prepare publish').first().json.public_caption }}`, Parse Mode HTML. The bot must be an admin of the channel.
     4. IF `{{ $('Prepare publish').first().json.fb_enabled }}`:
        - true → HTTP POST `https://graph.facebook.com/<version>/{{ $('Prepare publish').first().json.fb_page_id }}/photos`.
          Use the version Graph API Explorer shows, e.g. v27.0. Credential `DD Facebook token`: a **Page** access token with `pages_manage_posts`.
          Body fields: `url` = `{{ $('Prepare publish').first().json.image_url }}`, `message` = `{{ $('Prepare publish').first().json.public_caption_plain }}`.
          Settings → **On Error: Continue**.
        - false → go straight on.
     5. **Both** IF outputs (Facebook and no-Facebook) → Data table **Update row(s)** on dd_posts where `post_id` equals `{{ $('Prepare publish').first().json.post_id }}`:
        status `posted`, posted_at = updated_at = `{{ $('Prepare publish').first().json.posted_at }}`, fb_post_id = `{{ $json.post_id || '' }}`.
        Settings → **Always Output Data: ON**.
     6. Send Message to the owner `✅ পোস্ট হয়ে গেছে! (Posted)` with an inline **URL** button `📲 WhatsApp-এ পাঠান` → `{{ $('Prepare publish').first().json.whatsapp_url }}`.
        Test this button once. If Telegram rejects the URL as too long, shorten the shop's WhatsApp text.
   - **edit** → Data table Update row(s) on dd_posts where `post_id` equals `{{ $('Decide next step').first().json.post_id }}`: status `awaiting_edit`,
     updated_at = `{{ $('Decide next step').first().json.now }}` → Send Message `কী বদলাবো? ভয়েস নোট বা লিখে জানান। (What should I change?)`
   - **skip** → Data table Update row(s), same match: status `skipped`, updated_at = now → Send Message `ঠিক আছে, বাদ দিলাম। (Skipped)`
   - **lang** → Data table Update row(s) on dd_shops where `chat_id` = this chat: `languages` = `{{ $('Decide next step').first().json.post_id }}`
     (Route update puts the part after `lang:` into post_id; Always Output Data ON) → Send Message confirming the language.

**Design themes.** The Strategist returns `design_theme` (festive, modern, bold, fresh, elegant). On an edit, the Memory keeper can return a
`design_theme` and a `language`; **Build poster** uses the Memory theme first, and **Build preview** saves the theme used into strategy_json
so the next edit keeps it. **Save style notes** also writes `languages` when the owner asks for a lasting language change.
**Transcribe voice** language = `{{ (($('Decide next step').first().json.shop || {}).languages === 'en') ? 'en' : 'bn' }}`.

---

## 3. Workflow "DD Insights"

1. Triggers, all going into **Start**:
   - **Schedule Trigger**, every day at 09:00. Set the workflow's timezone to Asia/Kolkata in Workflow Settings.
   - **When Executed by Another Workflow**, inputs `chat_id` and `mode`.
2. **Start**: Set node with fields `for_chat` = `{{ $json.chat_id || '' }}` and `mode` = `{{ $json.mode || 'nudge' }}`.
3. **Get shops**: Data table Get row(s) on dd_shops, Return All.
4. **Get recent posts**: Data table Get row(s) on dd_posts, Return All. Settings → **Execute Once: ON**.
5. Switch on `{{ $('Start').first().json.mode }}`:
   - **nudge** → **Nudge check** (`12_nudge_check.js`) → **Build Nudge request** (`17_nudge_request.js`, mode Run Once for Each Item) → **Nudge Claude** (HTTP) →
     **Parse Nudge JSON** (REQUIRED `['message']`) → IF `{{ $json.ok }}` → Telegram Send Message, Chat ID `{{ $('Nudge check').item.json.chat_id }}`, text `{{ $json.message }}`.
     /nudge always finds the next festival within 30 days. The daily schedule only nudges for festivals 0–3 days away that the shop hasn't posted for.
   - **report** → **Filter**: keep rows where chat_id = `{{ $('Start').first().json.for_chat }}` →
     **Analyst stats** (`11_analyst_stats.js`) → **Build Analyst request** (`16_analyst_request.js`) → **Analyst Claude** (HTTP) →
     **Parse Analyst JSON** (REQUIRED `['report_text','insights']`) → IF `{{ $json.ok }}` (false → Send Message "Report failed, try /report again") →
     Data table Update row(s) on dd_shops where `chat_id` equals `{{ $('Start').first().json.for_chat }}`, set `insights` = `{{ $('Parse Analyst JSON').first().json.insights }}` →
     Telegram Send Message to `{{ $('Start').first().json.for_chat }}`, text `{{ $('Parse Analyst JSON').first().json.report_text }}`.

---

## 4. Before the demo

- [ ] Settings of each workflow: **Save successful production executions: OFF** (privacy), Timezone Asia/Kolkata.
- [ ] DD Main **Active**, DD Insights **Active**; stop pressing Test.
- [ ] Owner phone: `/start` done, chat_id in dd_shops; bot is admin of the channel; Facebook post tested once.
- [ ] HTML/CSS to Image usage left (50 a month on the free plan). Keep 10 spare for the demo.
- [ ] Run `/nudge`, `/report`, and photo → voice → Change → Post twice in a row without errors.
- [ ] Backup video recorded; phone hotspot ready.

## 5. Common errors

| Symptom | Fix |
|---|---|
| Bot silent after testing | Workflow not active, or you pressed Test after activating. Deactivate and activate again. |
| "Node 'X' hasn't been executed" | A node name doesn't match the one the script expects. Rename it exactly. |
| Bot silent on /report, /start or photo + caption | A Data table node near the top has Always Output Data OFF. Turn it ON for Get shop, Get latest post and Get post. |
| Voice note after a photo gets the help message | The collecting row is missing photo_file_id or updated_at. Check the start_collecting Insert. |
| Post tapped but status still "preview" | The Facebook IF's false output isn't connected to the Update. Connect both outputs. |
| Messages end with "sent automatically with n8n" | Turn Append n8n Attribution OFF in each Telegram node. |
| Button keeps spinning | Answer Query is missing or has the wrong Query ID. |
| Text with a photo is ignored | Telegram puts it in `caption`. `01_route_update.js` already handles this, so check the node order. |
| OpenAI "invalid file format" | The Fix voice file node is missing before Transcribe. |
| Telegram "can't parse entities" | Use Parse Mode HTML. The scripts escape `& < >`. Don't switch to Markdown. |
| Caption too long | The photo caption limit is 1024 characters. The scripts trim, so don't add extra text after them. |
| Render fails or the quota is used up | On Error Continue sends the original photo. Check the HCTI dashboard. |
