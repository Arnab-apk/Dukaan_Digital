"""Generates n8n Workflow SDK code for DD Insights and DD Main from the kit's scripts and prompts.
Usage: python tools/gen_n8n.py <insights_workflow_id or ''>  -> writes n8n/workflows/dd_insights.sdk.js and dd_main.sdk.js
"""
import json, pathlib, sys, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
CODE = ROOT / 'n8n' / 'code'
OUT = ROOT / 'n8n' / 'workflows'
OUT.mkdir(parents=True, exist_ok=True)
INSIGHTS_ID = sys.argv[1] if len(sys.argv) > 1 else ''

T_SHOPS = 'kwBjQGSQIkZnZzVL'
T_POSTS = 'ybF49bnGulHU76LZ'
MODEL = 'claude-sonnet-5'

j = lambda v: json.dumps(v, ensure_ascii=False)
def strip_header(src):
    lines = src.split('\n')
    while lines and (lines[0].startswith('//') or not lines[0].strip()):
        lines.pop(0)
    return '\n'.join(lines)
def code(name): return strip_header((CODE / name).read_text(encoding='utf-8'))
def prompt(name): return (ROOT / 'prompts' / name).read_text(encoding='utf-8').split('\n---\n', 1)[1].strip()
def E(s): return f'expr({j(s)})'

def table(tid, name): return '{ __rl: true, mode: "id", value: %s, cachedResultName: %s }' % (j(tid), j(name))

def cond(key, value_expr_or_str, is_expr=True):
    v = E(value_expr_or_str) if is_expr else j(value_expr_or_str)
    return '{ keyName: %s, condition: "eq", keyValue: %s }' % (j(key), v)

def cols(mapping, schema_cols):
    vals = ', '.join(f'{j(k)}: {E(v) if isinstance(v, str) and "{{" in v else j(v)}' for k, v in mapping.items())
    schema = ', '.join('{ id: %s, displayName: %s, required: false, defaultMatch: false, display: true, type: %s, canBeUsedToMatch: true }'
                       % (j(c), j(c), j(t)) for c, t in schema_cols)
    return '{ mappingMode: "defineBelow", value: { %s }, schema: [ %s ] }' % (vals, schema)

def rule(key, left, right):
    return ('{ outputKey: %s, conditions: { options: { caseSensitive: true, leftValue: "", typeValidation: "loose" }, '
            'conditions: [{ leftValue: %s, operator: { type: "string", operation: "equals" }, rightValue: %s }], combinator: "and" } }'
            % (j(key), E(left), j(right)))

def switch(var, name, left, keys, pos):
    rules = ', '.join(rule(k, left, k) for k in keys)
    return f'''const {var} = switchCase({{ version: 3.2, config: {{ name: {j(name)}, position: {pos},
  parameters: {{ rules: {{ values: [ {rules} ] }}, options: {{ fallbackOutput: "none" }} }} }} }});'''

def iftrue(var, name, left_expr, pos):
    return f'''const {var} = ifElse({{ version: 2.2, config: {{ name: {j(name)}, position: {pos},
  parameters: {{ conditions: {{ options: {{ caseSensitive: true, leftValue: "", typeValidation: "loose" }},
    conditions: [{{ leftValue: {E(left_expr)}, operator: {{ type: "boolean", operation: "true", singleValue: true }} }}], combinator: "and" }} }} }} }});'''

HEAVY = {}
SKELETON = len(sys.argv) > 2 and sys.argv[2] == 'skeleton'
def codenode(var, name, file_or_src, pos, each=False, extra='', is_src=False):
    src = file_or_src if is_src else code(file_or_src)
    if SKELETON and len(src) > 1200:
        HEAVY[name] = src
        src = 'return $input.all(); // filled in by update'
    mode = ', mode: "runOnceForEachItem"' if each else ''
    return f'''const {var} = node({{ type: "n8n-nodes-base.code", version: 2, config: {{ name: {j(name)}, position: {pos}{extra},
  parameters: {{ jsCode: {j(src)}{mode} }} }}, output: [{{}}] }});'''

def parse_src(required):
    s = code('06_parse_llm_json.js')
    s = re.sub(r"const REQUIRED = \['intent', 'product_en'\];[^\n]*", f"const REQUIRED = {j(required)};", s)
    return s

def claude(var, name, pos, with_image=False):
    att = ''
    if with_image:
        att = ', addAttachments: ' + E("{{ $binary && $binary.data ? true : false }}") + ', attachmentsInputType: "binary", binaryPropertyName: "data"'
    return f'''const {var} = node({{ type: "@n8n/n8n-nodes-langchain.anthropic", version: 1, config: {{ name: {j(name)}, position: {pos}, retryOnFail: true, maxTries: 2, waitBetweenTries: 3000,
  parameters: {{ resource: "text", operation: "message", modelId: {{ __rl: true, mode: "list", value: {j(MODEL)}, cachedResultName: "Claude Sonnet 5" }},
    messages: {{ values: [{{ content: {E("{{ $json.user }}")}, role: "user" }}] }}{att},
    simplify: true, options: {{ system: {E("{{ $json.system }}")}, maxTokens: {E("{{ $json.max_tokens }}")}, includeMergedResponse: true }} }} }},
  output: [{{ merged_response: "{{}}" }}] }});'''

def tg_send(var, name, pos, chat, text, url_button=None, extra=''):
    rm = ''
    if url_button:
        rm = (', replyMarkup: "inlineKeyboard", inlineKeyboard: { rows: [{ row: { buttons: [{ text: %s, additionalFields: { url: %s } }] } }] }'
              % (j(url_button[0]), E(url_button[1])))
    return f'''const {var} = node({{ type: "n8n-nodes-base.telegram", version: 1.2, config: {{ name: {j(name)}, position: {pos}{extra},
  credentials: {{ telegramApi: newCredential("Dukaan Telegram bot") }},
  parameters: {{ resource: "message", operation: "sendMessage", chatId: {E(chat)}, text: {E(text) if "{{" in text else j(text)}{rm},
    additionalFields: {{ appendAttribution: false, parse_mode: "HTML" }} }} }}, output: [{{ ok: true }}] }});'''

def dt_get(var, name, tid, tname, conds, pos, limit=None, extra=''):
    lim = 'returnAll: true' if limit is None else f'returnAll: false, limit: {limit}'
    return f'''const {var} = node({{ type: "n8n-nodes-base.dataTable", version: 1.1, config: {{ name: {j(name)}, position: {pos}, alwaysOutputData: true{extra},
  parameters: {{ resource: "row", operation: "get", dataTableId: {table(tid, tname)}, matchType: "allConditions",
    filters: {{ conditions: [ {", ".join(conds)} ] }}, {lim} }} }}, output: [{{ id: 1 }}] }});'''

def dt_update(var, name, tid, tname, conds, mapping, schema, pos, extra=''):
    return f'''const {var} = node({{ type: "n8n-nodes-base.dataTable", version: 1.1, config: {{ name: {j(name)}, position: {pos}, alwaysOutputData: true{extra},
  parameters: {{ resource: "row", operation: "update", dataTableId: {table(tid, tname)}, matchType: "allConditions",
    filters: {{ conditions: [ {", ".join(conds)} ] }}, columns: {cols(mapping, schema)} }} }}, output: [{{ id: 1 }}] }});'''

POST_COLS = [('post_id', 'string'), ('chat_id', 'string'), ('created_at', 'string'), ('updated_at', 'string'), ('status', 'string'),
             ('source', 'string'), ('photo_file_id', 'string'), ('product', 'string'), ('price', 'string'), ('angle', 'string'),
             ('festival', 'string'), ('has_price_on_poster', 'string'), ('headline', 'string'), ('image_url', 'string'),
             ('fb_post_id', 'string'), ('reactions', 'number'), ('comments', 'number'), ('shares', 'number'), ('feedback', 'string'),
             ('listener_json', 'string'), ('strategy_json', 'string'), ('copy_json', 'string'), ('posted_at', 'string')]
def pcols(*names): return [(n, t) for n, t in POST_COLS if n in names]

HEADER = 'import { workflow, node, trigger, sticky, newCredential, ifElse, switchCase, languageModel, tool, expr } from "@n8n/workflow-sdk";\n\n'

# ------------------------------------------------------------------ DD Insights
D = "$('Start').first().json"
ins = [HEADER]
ins.append(f'''const sched = trigger({{ type: "n8n-nodes-base.scheduleTrigger", version: 1.2, config: {{ name: "Every morning 9:00", position: [0, 0],
  parameters: {{ rule: {{ interval: [{{ field: "days", triggerAtHour: 9 }}] }} }} }}, output: [{{}}] }});''')
ins.append(f'''const called = trigger({{ type: "n8n-nodes-base.executeWorkflowTrigger", version: 1.3, config: {{ name: "Called by DD Main", position: [0, 220],
  parameters: {{ inputSource: "workflowInputs", workflowInputs: {{ values: [{{ name: "chat_id", type: "string" }}, {{ name: "mode", type: "string" }}] }} }} }}, output: [{{ chat_id: "1", mode: "report" }}] }});''')
ins.append(codenode('start', 'Start', "return [{ json: { for_chat: String($input.first().json.chat_id || ''), mode: $input.first().json.mode || 'nudge' } }];", '[240, 100]', is_src=True))
ins.append(dt_get('getShops', 'Get shops', T_SHOPS, 'dd_shops', [], '[460, 100]', extra=', executeOnce: true').replace('filters: { conditions: [  ] }, ', ''))
ins.append(dt_get('getRecent', 'Get recent posts', T_POSTS, 'dd_posts', [], '[680, 100]', extra=', executeOnce: true').replace('filters: { conditions: [  ] }, ', ''))
ins.append(switch('modeSw', 'Nudge or report', "{{ $('Start').first().json.mode }}", ['nudge', 'report'], '[900, 100]'))
ins.append(codenode('nudgeCheck', 'Nudge check', '12_nudge_check.js', '[1120, 0]'))
ins.append(codenode('nudgeReq', 'Build Nudge request', '17_nudge_request.js', '[1340, 0]', each=True))
ins.append(claude('nudgeAi', 'Nudge writer', '[1560, 0]'))
ins.append(codenode('nudgeParse', 'Parse Nudge JSON', parse_src(['message']), '[1780, 0]', is_src=True))
ins.append(iftrue('nudgeOk', 'Nudge OK?', '{{ $json.ok }}', '[2000, 0]'))
ins.append(tg_send('nudgeSend', 'Send nudge', '[2220, 0]', "{{ $('Nudge check').item.json.chat_id }}", "{{ String($json.message).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }}"))
ins.append(codenode('stats', 'Analyst stats', '11_analyst_stats.js', '[1120, 220]'))
ins.append(codenode('anReq', 'Build Analyst request', '16_analyst_request.js', '[1340, 220]'))
ins.append(claude('anAi', 'Analyst', '[1560, 220]'))
ins.append(codenode('anParse', 'Parse Analyst JSON', parse_src(['report_text', 'insights']), '[1780, 220]', is_src=True))
ins.append(iftrue('anOk', 'Report OK?', '{{ $json.ok }}', '[2000, 220]'))
ins.append(dt_update('saveIns', 'Save insights', T_SHOPS, 'dd_shops', [cond('chat_id', "{{ $('Start').first().json.for_chat }}")],
                     {'insights': "{{ $('Parse Analyst JSON').first().json.insights }}"}, [('insights', 'string')], '[2220, 160]'))
ins.append(tg_send('anSend', 'Send report', '[2440, 160]', "{{ $('Start').first().json.for_chat }}", "{{ String($('Parse Analyst JSON').first().json.report_text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }}"))
ins.append(tg_send('anFail', 'Send report failed', '[2220, 300]', "{{ $('Start').first().json.for_chat }}", 'Report failed, please send /report again.'))
ins.append('''
export default workflow("dd-insights", "DD Insights (Analyst + festival nudge)")
  .add(sched).to(start)
  .add(called).to(start)
  .add(start).to(getShops).to(getRecent).to(modeSw
    .onCase(0, nudgeCheck.to(nudgeReq).to(nudgeAi).to(nudgeParse).to(nudgeOk.onTrue(nudgeSend)))
    .onCase(1, stats.to(anReq).to(anAi).to(anParse).to(anOk.onTrue(saveIns.to(anSend)).onFalse(anFail))));
''')
(OUT / 'dd_insights.sdk.js').write_text('\n'.join(ins), encoding='utf-8')

# ------------------------------------------------------------------ DD Main
DN = "$('Decide next step').first().json"
m = [HEADER]
m.append('''const tgTrigger = trigger({ type: "n8n-nodes-base.telegramTrigger", version: 1.5, config: { name: "Telegram Trigger", position: [0, 600],
  credentials: { telegramApi: newCredential("Dukaan Telegram bot") },
  parameters: { updates: ["message", "callback_query"], additionalFields: {} } },
  output: [{ update_id: 1, message: { chat: { id: 555 }, from: { first_name: "Owner" }, text: "/start" } }] });''')
m.append(codenode('route', 'Route update', '01_route_update.js', '[220, 600]'))
m.append(dt_get('getShop', 'Get shop', T_SHOPS, 'dd_shops', [cond('chat_id', '{{ $json.chat_id }}')], '[440, 600]', limit=1))
m.append(dt_get('getLatest', 'Get latest post', T_POSTS, 'dd_posts', [cond('chat_id', "{{ $('Route update').first().json.chat_id }}")], '[660, 600]', extra=', executeOnce: true'))
m.append(codenode('decide', 'Decide next step', '02_decide_next_step.js', '[880, 600]', extra=', executeOnce: true'))
m.append(dt_get('getPost', 'Get post', T_POSTS, 'dd_posts', [cond('post_id', "{{ $json.post_id || '-' }}")], '[1100, 600]', limit=1, extra=', executeOnce: true'))
m.append(switch('routeSw', 'Route', "{{ $('Decide next step').first().json.next }}",
                ['onboard', 'help', 'command', 'start_collecting', 'create_post', 'edit_post', 'button'], '[1320, 600]'))
CH = "{{ $('Decide next step').first().json.chat_id }}"
# onboard
m.append(dt_update('claimShop', 'Claim demo shop', T_SHOPS, 'dd_shops', [cond('chat_id', 'PENDING', False)], {'chat_id': CH}, [('chat_id', 'string')], '[1560, 0]', extra=', executeOnce: true'))
m.append(dt_update('claimPosts', 'Claim demo history', T_POSTS, 'dd_posts', [cond('chat_id', 'PENDING', False)], {'chat_id': CH}, [('chat_id', 'string')], '[1780, 0]', extra=', executeOnce: true'))
m.append(tg_send('welcome', 'Send welcome', '[2000, 0]', CH,
    "নমস্কার! আমি Dukaan Digital 🙏\nYour chat ID: {{ $('Decide next step').first().json.chat_id }}\n\nSend a product photo, then a voice note with the price or offer. I'll make the post and poster; nothing is published until you tap ✅ Post.\nCommands: /report /nudge /memory", extra=', executeOnce: true'))
# help
m.append(tg_send('help', 'Send help', '[1560, 160]', CH, "📸 Send a product photo, then a voice note (or text) with the price or offer.\nCommands: /report  /nudge  /memory  /start", extra=', executeOnce: true'))
# commands
m.append(switch('cmdSw', 'Command', "{{ $('Decide next step').first().json.cmd }}", ['/report', '/nudge', '/memory'], '[1560, 320]'))
m.append(tg_send('cmdAck', 'Ack report', '[1780, 260]', CH, '⏳ রিপোর্ট তৈরি হচ্ছে… (Preparing your report)', extra=', executeOnce: true'))
iid = INSIGHTS_ID
def exec_insights(var, name, mode, pos):
    return f'''const {var} = node({{ type: "n8n-nodes-base.executeWorkflow", version: 1.4, config: {{ name: {j(name)}, position: {pos}, executeOnce: true,
  parameters: {{ source: "database", workflowId: {{ __rl: true, mode: "id", value: {j(iid)} }},
    workflowInputs: {{ mappingMode: "defineBelow", value: {{ chat_id: {E(CH)}, mode: {j(mode)} }},
      schema: [ {{ id: "chat_id", displayName: "chat_id", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true }},
                {{ id: "mode", displayName: "mode", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true }} ] }},
    mode: "once", options: {{ waitForSubWorkflow: false }} }} }}, output: [{{}}] }});'''
m.append(exec_insights('runReport', 'Run report', 'report', '[2000, 260]'))
m.append(exec_insights('runNudge', 'Run nudge', 'nudge', '[1780, 380]'))
m.append(tg_send('memMsg', 'Show memory', '[1780, 500]', CH, "🧠 Style notes: {{ ($('Decide next step').first().json.shop || {}).style_notes || '(none yet)' }}\n📈 Insights: {{ ($('Decide next step').first().json.shop || {}).insights || '(none yet, try /report)' }}", extra=', executeOnce: true'))
# start collecting
m.append(f'''const insCollect = node({{ type: "n8n-nodes-base.dataTable", version: 1.1, config: {{ name: "Save photo (collecting)", position: [1560, 660], executeOnce: true,
  parameters: {{ resource: "row", operation: "insert", dataTableId: {table(T_POSTS, 'dd_posts')},
    columns: {cols({"post_id": "{{ $('Decide next step').first().json.post_id }}", "chat_id": CH,
                    "photo_file_id": "{{ $('Decide next step').first().json.photo_file_id }}",
                    "created_at": "{{ $('Decide next step').first().json.now }}", "updated_at": "{{ $('Decide next step').first().json.now }}",
                    "status": "collecting", "source": "live"},
                   pcols('post_id', 'chat_id', 'photo_file_id', 'created_at', 'updated_at', 'status', 'source'))} }} }}, output: [{{ id: 1 }}] }});''')
m.append(tg_send('askVoice', 'Ask for voice note', '[1780, 660]', CH, '📸 ছবি পেয়েছি! এবার দাম/অফার বলে একটা ভয়েস নোট পাঠান (or type it).', extra=', executeOnce: true'))
# create/edit shared start
m.append(tg_send('working', 'Send working', '[1560, 900]', CH, '⏳ কাজ চলছে… (Working on your post, about 30 seconds)', extra=', executeOnce: true'))
m.append(iftrue('hasVoice', 'Has voice note?', "{{ !!$('Decide next step').first().json.voice_file_id }}", '[1780, 900]'))
m.append(f'''const getVoice = node({{ type: "n8n-nodes-base.telegram", version: 1.2, config: {{ name: "Get voice file", position: [2000, 820],
  credentials: {{ telegramApi: newCredential("Dukaan Telegram bot") }},
  parameters: {{ resource: "file", operation: "get", fileId: {E("{{ $('Decide next step').first().json.voice_file_id }}")}, download: true }} }}, output: [{{}}] }});''')
m.append(codenode('fixVoice', 'Fix voice file', '03_fix_voice_file.js', '[2220, 820]', each=True))
m.append(f'''const transcribe = node({{ type: "@n8n/n8n-nodes-langchain.openAi", version: 2.3, config: {{ name: "Transcribe voice", position: [2440, 820],
  parameters: {{ resource: "audio", operation: "transcribe", binaryPropertyName: "data", options: {{ language: "bn" }} }} }}, output: [{{ text: "kaju barfi char sho taka kilo" }}] }});''')
m.append(f'''const getPhoto = node({{ type: "n8n-nodes-base.telegram", version: 1.2, config: {{ name: "Get photo file", position: [2660, 900],
  credentials: {{ telegramApi: newCredential("Dukaan Telegram bot") }},
  parameters: {{ resource: "file", operation: "get", fileId: {E("{{ $('Decide next step').first().json.photo_file_id }}")}, download: true }} }}, output: [{{}}] }});''')
m.append(codenode('toB64', 'Photo to base64', '04_photo_to_base64.js', '[2880, 900]'))
m.append(switch('modeSw', 'New or edit', "{{ $('Decide next step').first().json.next }}", ['create_post', 'edit_post'], '[3100, 900]'))
# create path
m.append(codenode('lReq', 'Build Listener request', '05_listener_request.js', '[3320, 800]'))
m.append(claude('lAi', 'Listener', '[3540, 800]', with_image=True))
m.append(codenode('lParse', 'Parse Listener JSON', parse_src(['intent', 'product_en']), '[3760, 800]', is_src=True))
m.append(dt_get('pastPosts', 'Get past posts', T_POSTS, 'dd_posts', [cond('chat_id', CH)], '[3980, 800]', extra=', executeOnce: true'))
m.append(codenode('sIn', 'Build Strategist input', '15_strategist_input.js', '[4200, 800]', extra=', executeOnce: true'))
m.append(f'''const stratModel = languageModel({{ type: "@n8n/n8n-nodes-langchain.lmChatAnthropic", version: 1.6, config: {{ name: "Claude for Strategist", position: [4380, 1000],
  parameters: {{ model: {{ __rl: true, mode: "list", value: {j(MODEL)}, cachedResultName: "Claude Sonnet 5" }}, options: {{ maxTokensToSample: 1500 }} }} }} }});''')
m.append(f'''const festTool = tool({{ type: "@n8n/n8n-nodes-langchain.toolCode", version: 1.3, config: {{ name: "upcoming_festivals", position: [4540, 1000],
  parameters: {{ description: "Returns festivals in the next N days with their exact dates and typical products. Input: a number of days to look ahead (default 10). Always use these dates; never guess festival dates.",
    language: "javaScript", jsCode: {j(code('07_tool_upcoming_festivals.js'))} }} }} }});''')
m.append(f'''const strat = node({{ type: "@n8n/n8n-nodes-langchain.agent", version: 3.1, config: {{ name: "Strategist", position: [4420, 800], retryOnFail: true, maxTries: 2,
  parameters: {{ promptType: "define", text: {E("{{ $json.prompt }}")},
    options: {{ systemMessage: {j(prompt('02_strategist.md'))}, maxIterations: 6 }} }},
  subnodes: {{ model: stratModel, tools: [festTool] }} }}, output: [{{ output: "{{}}" }}] }});''')
m.append(codenode('sParse', 'Parse Strategist JSON', parse_src(['angle', 'reason']), '[4640, 800]', is_src=True))
# edit path
m.append(codenode('mReq', 'Build Memory request', '14_memory_request.js', '[3320, 1100]'))
m.append(claude('mAi', 'Memory keeper', '[3540, 1100]'))
m.append(codenode('mParse', 'Parse Memory JSON', parse_src(['is_lasting', 'new_style_notes']), '[3760, 1100]', is_src=True))
m.append(iftrue('lasting', 'Lasting preference?', '{{ $json.ok && $json.is_lasting }}', '[3980, 1100]'))
m.append(dt_update('saveStyle', 'Save style notes', T_SHOPS, 'dd_shops', [cond('chat_id', CH)],
                   {'style_notes': "{{ $('Parse Memory JSON').first().json.new_style_notes }}"}, [('style_notes', 'string')], '[4200, 1040]', extra=', executeOnce: true'))
# shared end
m.append(codenode('cReq', 'Build Copywriter request', '13_copywriter_request.js', '[4860, 900]', extra=', executeOnce: true'))
m.append(claude('cAi', 'Copywriter', '[5080, 900]'))
m.append(codenode('cParse', 'Parse Copywriter JSON', parse_src(['headline_bn', 'caption_bn']), '[5300, 900]', is_src=True))
m.append(iftrue('copyOk', 'Copy OK?', '{{ $json.ok }}', '[5520, 900]'))
m.append(codenode('poster', 'Build poster', '08_build_poster.js', '[5740, 840]'))
m.append(f'''const render = node({{ type: "n8n-nodes-base.httpRequest", version: 4.2, config: {{ name: "Render poster", position: [5960, 840], onError: "continueRegularOutput", retryOnFail: true, maxTries: 2,
  credentials: {{ httpBasicAuth: newCredential("HTML/CSS to Image") }},
  parameters: {{ method: "POST", url: "https://hcti.io/v1/image", authentication: "genericCredentialType", genericAuthType: "httpBasicAuth",
    sendBody: true, specifyBody: "json", jsonBody: {E("{{ JSON.stringify($json.hcti) }}")}, options: {{}} }} }}, output: [{{ url: "https://hcti.io/v1/image/abc" }}] }});''')
m.append(codenode('preview', 'Build preview', '09_build_preview.js', '[6180, 840]'))
upsert_map = {c: "{{ $json.row.%s }}" % c for c in ['post_id', 'chat_id', 'created_at', 'updated_at', 'status', 'source', 'photo_file_id', 'product', 'price',
                                                    'angle', 'festival', 'has_price_on_poster', 'headline', 'image_url', 'listener_json', 'strategy_json', 'copy_json']}
m.append(f'''const savePost = node({{ type: "n8n-nodes-base.dataTable", version: 1.1, config: {{ name: "Save post", position: [6400, 840],
  parameters: {{ resource: "row", operation: "upsert", dataTableId: {table(T_POSTS, 'dd_posts')}, matchType: "allConditions",
    filters: {{ conditions: [ {cond('post_id', '{{ $json.row.post_id }}')} ] }},
    columns: {cols(upsert_map, pcols(*upsert_map.keys()))} }} }}, output: [{{ id: 1 }}] }});''')
P = "$('Build preview').first().json"
btn = lambda t, a: '{ text: %s, additionalFields: { callback_data: %s } }' % (j(t), E("%s:{{ $('Build preview').first().json.post_id }}" % a))
m.append(f'''const sendPreview = node({{ type: "n8n-nodes-base.telegram", version: 1.2, config: {{ name: "Send preview", position: [6620, 840], executeOnce: true,
  credentials: {{ telegramApi: newCredential("Dukaan Telegram bot") }},
  parameters: {{ resource: "message", operation: "sendPhoto", chatId: {E("{{ " + P + ".chat_id }}")}, binaryData: false,
    file: {E("{{ " + P + ".photo || " + P + ".photo_file_id }}")},
    replyMarkup: "inlineKeyboard", inlineKeyboard: {{ rows: [{{ row: {{ buttons: [ {btn('✅ Post', 'post')}, {btn('✏️ Change', 'edit')}, {btn('⏭ Skip', 'skip')} ] }} }}] }},
    additionalFields: {{ caption: {E("{{ " + P + ".caption }}")}, parse_mode: "HTML" }} }} }}, output: [{{ ok: true }}] }});''')
m.append(tg_send('sorry', 'Send sorry', '[5740, 1000]', CH, 'দুঃখিত, বুঝতে পারিনি। আবার চেষ্টা করুন। (Sorry, please try again.)', extra=', executeOnce: true'))
# buttons
m.append(f'''const answer = node({{ type: "n8n-nodes-base.telegram", version: 1.2, config: {{ name: "Answer button", position: [1560, 1400], executeOnce: true,
  credentials: {{ telegramApi: newCredential("Dukaan Telegram bot") }},
  parameters: {{ resource: "callback", operation: "answerQuery", queryId: {E("{{ $('Decide next step').first().json.callback_id }}")}, additionalFields: {{}} }} }}, output: [{{ ok: true }}] }});''')
m.append(switch('actSw', 'Button action', "{{ $('Decide next step').first().json.action }}", ['post', 'edit', 'skip'], '[1780, 1400]'))
m.append(codenode('pub', 'Prepare publish', '10_publish_prepare.js', '[2000, 1300]'))
m.append(iftrue('already', 'Already posted?', '{{ $json.already }}', '[2220, 1300]'))
m.append(tg_send('alreadyMsg', 'Send already posted', '[2440, 1220]', CH, 'আগেই পোস্ট হয়েছে ✅ (Already posted)'))
PP = "$('Prepare publish').first().json"
m.append(f'''const toChannel = node({{ type: "n8n-nodes-base.telegram", version: 1.2, config: {{ name: "Post to channel", position: [2440, 1380], onError: "continueRegularOutput",
  credentials: {{ telegramApi: newCredential("Dukaan Telegram bot") }},
  parameters: {{ resource: "message", operation: "sendPhoto", chatId: {E("{{ " + PP + ".channel_id }}")}, binaryData: false,
    file: {E("{{ " + PP + ".image_url || " + PP + ".photo_file_id }}")},
    additionalFields: {{ caption: {E("{{ " + PP + ".public_caption }}")}, parse_mode: "HTML" }} }} }}, output: [{{ ok: true }}] }});''')
m.append(iftrue('fbOn', 'Facebook on?', "{{ " + PP + ".fb_enabled }}", '[2660, 1380]'))
m.append(f'''const toFb = node({{ type: "n8n-nodes-base.httpRequest", version: 4.2, config: {{ name: "Post to Facebook", position: [2880, 1320], onError: "continueRegularOutput",
  credentials: {{ httpQueryAuth: newCredential("Facebook Page token") }},
  parameters: {{ method: "POST", url: {E("https://graph.facebook.com/v27.0/{{ " + PP + ".fb_page_id }}/photos")},
    authentication: "genericCredentialType", genericAuthType: "httpQueryAuth", sendBody: true, contentType: "form-urlencoded",
    bodyParameters: {{ parameters: [ {{ name: "url", value: {E("{{ " + PP + ".image_url }}")} }}, {{ name: "message", value: {E("{{ " + PP + ".public_caption_plain }}")} }} ] }},
    options: {{}} }} }}, output: [{{ id: "1", post_id: "1_2" }}] }});''')
m.append(dt_update('markPosted', 'Mark posted', T_POSTS, 'dd_posts', [cond('post_id', "{{ " + PP + ".post_id }}")],
                   {'status': 'posted', 'posted_at': "{{ " + PP + ".posted_at }}", 'updated_at': "{{ " + PP + ".posted_at }}", 'fb_post_id': "{{ $json.post_id || '' }}"},
                   pcols('status', 'posted_at', 'updated_at', 'fb_post_id'), '[3100, 1380]', extra=', executeOnce: true'))
m.append(tg_send('postedMsg', 'Send posted', '[3320, 1380]', CH, '✅ পোস্ট হয়ে গেছে! (Posted to your channel.) Forward it to customers on WhatsApp:',
                 url_button=('📲 WhatsApp-এ পাঠান', "{{ " + PP + ".whatsapp_url }}"), extra=', executeOnce: true'))
m.append(dt_update('markEdit', 'Mark awaiting edit', T_POSTS, 'dd_posts', [cond('post_id', "{{ $('Decide next step').first().json.post_id }}")],
                   {'status': 'awaiting_edit', 'updated_at': "{{ $('Decide next step').first().json.now }}"}, pcols('status', 'updated_at'), '[2000, 1500]', extra=', executeOnce: true'))
m.append(tg_send('askEdit', 'Ask what to change', '[2220, 1500]', CH, 'কী বদলাবো? ভয়েস নোট বা লিখে জানান। (What should I change? Voice or text.)', extra=', executeOnce: true'))
m.append(dt_update('markSkip', 'Mark skipped', T_POSTS, 'dd_posts', [cond('post_id', "{{ $('Decide next step').first().json.post_id }}")],
                   {'status': 'skipped', 'updated_at': "{{ $('Decide next step').first().json.now }}"}, pcols('status', 'updated_at'), '[2000, 1640]', extra=', executeOnce: true'))
m.append(tg_send('skipMsg', 'Send skipped', '[2220, 1640]', CH, 'ঠিক আছে, বাদ দিলাম। (Skipped.)', extra=', executeOnce: true'))

m.append('''
const shared = cReq.to(cAi).to(cParse).to(copyOk.onTrue(poster.to(render).to(preview).to(savePost).to(sendPreview)).onFalse(sorry));
export default workflow("dd-main", "DD Main (Dukaan Digital bot)")
  .add(tgTrigger).to(route).to(getShop).to(getLatest).to(decide).to(getPost).to(routeSw
    .onCase(0, claimShop.to(claimPosts).to(welcome))
    .onCase(1, help)
    .onCase(2, cmdSw.onCase(0, cmdAck.to(runReport)).onCase(1, runNudge).onCase(2, memMsg))
    .onCase(3, insCollect.to(askVoice))
    .onCase(4, working)
    .onCase(5, working)
    .onCase(6, answer.to(actSw
      .onCase(0, pub.to(already.onTrue(alreadyMsg).onFalse(toChannel.to(fbOn.onTrue(toFb.to(markPosted)).onFalse(markPosted)))))
      .onCase(1, markEdit.to(askEdit))
      .onCase(2, markSkip.to(skipMsg)))))
  .add(working).to(hasVoice.onTrue(getVoice.to(fixVoice).to(transcribe).to(getPhoto)).onFalse(getPhoto))
  .add(getPhoto).to(toB64).to(modeSw
    .onCase(0, lReq.to(lAi).to(lParse).to(pastPosts).to(sIn).to(strat).to(sParse).to(shared))
    .onCase(1, mReq.to(mAi).to(mParse).to(lasting.onTrue(saveStyle.to(cReq)).onFalse(cReq))))
  .add(markPosted).to(postedMsg);
''')
(OUT / ('dd_main.skeleton.sdk.js' if SKELETON else 'dd_main.sdk.js')).write_text('\n'.join(m), encoding='utf-8')
if SKELETON: (OUT / 'dd_main.heavy.json').write_text(json.dumps(HEAVY, ensure_ascii=False, indent=1), encoding='utf-8')
print('ok', len('\n'.join(ins)), len('\n'.join(m)))
