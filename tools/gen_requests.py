import json, pathlib, sys
root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")
code = root / 'n8n/code'

def prompt(name):
    t = (root / 'prompts' / name).read_text(encoding='utf-8')
    return t.split('\n---\n', 1)[1].strip()

HEADER = '''// n8n Code node: "Build {title} request"   (Mode: {mode})
// GENERATED from prompts/{pfile} - edit the prompt there, then ask Claude Code to "regenerate the request scripts".
// Next node: Anthropic node "{title}" (Message a model): System = {{{{ $json.system }}}}, User message = {{{{ $json.user }}}},
//   Max tokens = {{{{ $json.max_tokens }}}}. Uses n8n Cloud AI credits, so no Anthropic key is needed.
// Then "Parse {title} JSON" (06_parse_llm_json.js with REQUIRED = {required}).

const MAX_TOKENS = {max_tokens};
const SYSTEM = {system};
const parse = s => {{ try {{ return JSON.parse(s || '{{}}'); }} catch (e) {{ return {{}}; }} }};
const clean = v => (v && !/REPLACE/.test(String(v)) ? v : null);
const normLang = v => (v === 'bn' || v === 'en') ? v : 'mixed';
function langRule() {{ return ''; }}
const transcript = (() => {{ try {{ return $('Transcribe voice').first().json.text || ''; }} catch (e) {{ return ''; }} }})();
'''

FOOTER_ALL = '''
const user = userContent().filter(b => b.type === 'text').map(b => b.text).join('\\n');
const out = { json: { agent: AGENT, system: SYSTEM.replace('{{LANG_RULE}}', langRule()), user, max_tokens: MAX_TOKENS } };
if (AGENT === 'listener') { try { const b = $('Get photo file').first().binary; if (b && b.data) out.binary = { data: b.data }; } catch (e) {} }
return [out];
'''
FOOTER_EACH = '''
const user = userContent().filter(b => b.type === 'text').map(b => b.text).join('\\n');
return { json: { agent: AGENT, chat_id: $json.chat_id, system: SYSTEM.replace('{{LANG_RULE}}', langRule()), user, max_tokens: MAX_TOKENS } };
'''

specs = [
 dict(file='05_listener_request.js', title='Listener', pfile='01_listener.md', mode='Run Once for All Items',
      required="['intent','product_en']", model='claude-sonnet-5-5', max_tokens=800, each=False, body='''
const AGENT = 'listener';
function userContent() {
  const d = $('Decide next step').first().json;
  const content = [];   // the product photo is attached by the Anthropic node from this item's binary
  content.push({ type: 'text', text: [
    `Business type: ${(d.shop || {}).shop_type || 'unknown'}`,
    `Owner's typed text: ${d.text || '(none)'}`,
    `Owner's voice note (transcribed): ${transcript || '(none)'}`,
    'Return the JSON now.',
  ].join('\\n') });
  return content;
}
'''),
 dict(file='13_copywriter_request.js', title='Copywriter', pfile='03_copywriter.md', mode='Run Once for All Items',
      required="['headline_bn','caption_bn']", model='claude-sonnet-5-5', max_tokens=1500, each=False, body='''
const AGENT = 'copywriter';
// Shared by the NEW-post path (after "Parse Strategist JSON") and the EDIT path (after "Parse Memory JSON").
function userContent() {
  const d = $('Decide next step').first().json;
  const isEdit = d.next === 'edit_post';
  const shop = d.shop || {};
  const saved = (() => { try { return $('Get post').first().json || {}; } catch (e) { return {}; } })();
  let style = shop.style_notes || '';
  let lang = normLang(shop.languages);
  let change = null;
  if (isEdit) {
    try { const m = $('Parse Memory JSON').first().json; if (m.ok) { style = m.new_style_notes || style; change = m.change_request; if (['bn', 'en', 'mixed'].includes(m.language)) lang = m.language; } } catch (e) {}
    change = change || transcript || d.text;
  }
  const facts = {
    today: new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10),
    language: lang,
    shop: { name_bn: shop.shop_name_bn, name_en: shop.shop_name_en, type: shop.shop_type, area: shop.area, phone: clean(shop.phone), tone: shop.tone },
    style_notes: style,
    owner_said: isEdit ? parse(saved.listener_json) : $('Parse Listener JSON').first().json,
    plan: isEdit ? parse(saved.strategy_json) : $('Parse Strategist JSON').first().json,
  };
  if (isEdit) { facts.previous_version = parse(saved.copy_json); facts.change_request = change; }
  return [{ type: 'text', text: JSON.stringify(facts, null, 2) + '\\nReturn the JSON now.' }];
}
'''),
 dict(file='14_memory_request.js', title='Memory', pfile='04_memory.md', mode='Run Once for All Items',
      required="['is_lasting','new_style_notes']", model='claude-sonnet-5-5', max_tokens=600, each=False, body='''
const AGENT = 'memory';
// EDIT path only. After "Parse Memory JSON": IF {{ $json.is_lasting }} -> Data table "Update row" on dd_shops
// (match chat_id, set style_notes = {{ $json.new_style_notes }}, languages = {{ $json.language || shop.languages }}) -> continue to "Build Copywriter request".
function userContent() {
  const d = $('Decide next step').first().json;
  const shop = d.shop || {};
  const facts = { current_style_notes: shop.style_notes || '', current_language: normLang(shop.languages), business_type: shop.shop_type || '', owner_change_request: transcript || d.text || '' };
  return [{ type: 'text', text: JSON.stringify(facts, null, 2) + '\\nReturn the JSON now.' }];
}
'''),
 dict(file='16_analyst_request.js', title='Analyst', pfile='05_analyst.md', mode='Run Once for All Items',
      required="['report_text','insights']", model='claude-sonnet-5-5', max_tokens=1200, each=False, body='''
const AGENT = 'analyst';
const LANG = { bn: 'Write it in simple Bengali only.', en: 'Write it in simple English only.', mixed: 'Bengali first, simple words, then a 1-2 line English summary.' };
function langRule() { const forChat = String($('Start').first().json.for_chat || ''); const s = $('Get shops').all().map(i => i.json).find(x => String(x.chat_id) === forChat) || {}; return LANG[normLang(s.languages)]; }
// In the "DD Insights" workflow, after "Analyst stats" (11_analyst_stats.js).
// Shop row: the first 'Get shops' row whose chat_id matches Start.for_chat.
function userContent() {
  const forChat = String($('Start').first().json.for_chat || '');
  const shop = $('Get shops').all().map(i => i.json).find(s => String(s.chat_id) === forChat) || {};
  const stats = $('Analyst stats').first().json.stats;
  const t0 = Date.parse(new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10));
  const FEST = [['2026-11-08','Kali Puja / Diwali'],['2026-11-11','Bhai Phonta'],['2026-11-14',"Children's Day"],['2026-11-15','Chhath Puja'],
    ['2026-11-18','Jagaddhatri Puja'],['2026-11-24','Guru Nanak Jayanti'],['2026-12-25','Christmas'],['2027-01-01','New Year'],['2027-01-26','Republic Day'],['2027-02-14',"Valentine's Day"]];
  const upcoming = FEST.map(([date, name]) => ({ date, name, in_days: Math.round((Date.parse(date) - t0) / 864e5) })).filter(f => f.in_days >= 0 && f.in_days <= 14);
  const facts = { shop: { name_bn: shop.shop_name_bn, name_en: shop.shop_name_en, type: shop.shop_type }, stats, upcoming_festivals: upcoming };
  return [{ type: 'text', text: JSON.stringify(facts, null, 2) + '\\nReturn the JSON now.' }];
}
'''),
 dict(file='17_nudge_request.js', title='Nudge', pfile='06_nudge.md', mode='Run Once for Each Item',
      required="['message']", model='claude-sonnet-5-5', max_tokens=500, each=True, body='''
const AGENT = 'nudge';
const LANG = { bn: 'Write in natural West Bengal Bengali only.', en: 'Write in simple, friendly Indian English only.', mixed: 'Write in Bengali, with one short English line at the end.' };
function langRule() { return LANG[normLang($json.shop.languages)]; }
// One item per shop from "Nudge check". In the Telegram "Send Message" node after "Parse Nudge JSON", use
//   Chat ID = {{ $('Nudge check').item.json.chat_id }}   Text = {{ $json.message }}
function userContent() {
  const facts = {
    shop: { name_bn: $json.shop.shop_name_bn, name_en: $json.shop.shop_name_en, type: $json.shop.shop_type },
    festival: $json.festival,
    recent_products: $json.recent_products,
  };
  return [{ type: 'text', text: JSON.stringify(facts, null, 2) + '\\nReturn the JSON now.' }];
}
'''),
]

for sp in specs:
    out = HEADER.format(title=sp['title'], mode=sp['mode'], pfile=sp['pfile'], required=sp['required'],
                        model=sp['model'], max_tokens=sp['max_tokens'],
                        system=json.dumps(prompt(sp['pfile']), ensure_ascii=False))
    out += sp['body'] + (FOOTER_EACH if sp['each'] else FOOTER_ALL)
    (code / sp['file']).write_text(out, encoding='utf-8')
    print('wrote', sp['file'])

# Strategist input (AI Agent node)
strat_sys = prompt('02_strategist.md')
s = '''// n8n Code node: "Build Strategist input"   (Mode: Run Once for All Items)
// NEW-post path, after "Parse Listener JSON". Next: AI Agent node named "Strategist":
//   Source for Prompt: Define below -> Prompt (User Message) = {{ $json.prompt }}
//   Options -> System Message = the text in prompts/02_strategist.md below the --- line (also in STRATEGIST_SYSTEM here, for copy-paste)
//   Chat Model: Anthropic Chat Model (model claude-sonnet-5-5), credential = your Anthropic key
//   Tools: Code Tool "upcoming_festivals" (07_tool_upcoming_festivals.js)
//          Data table tool "past_post_results" on dd_posts (Get rows, chat_id = this chat, status = posted), if your n8n offers it.
//          If not, PAST_RESULTS below is filled from a 'Get past posts' node placed before this one.
// Then "Parse Strategist JSON" (06_parse_llm_json.js with REQUIRED = ['angle','reason']).


const d = $('Decide next step').first().json;
const shop = d.shop || {};
const listener = $('Parse Listener JSON').first().json;
const normLang = v => (v === 'bn' || v === 'en') ? v : 'mixed';
const today = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);

let PAST_RESULTS = 'Use the past_post_results tool.';
try {
  const rows = $('Get past posts').all().map(i => i.json).filter(r => r.post_id && r.status === 'posted');
  PAST_RESULTS = JSON.stringify(rows.slice(-15).map(r => ({ date: String(r.created_at).slice(0, 10), product: r.product, angle: r.angle,
    festival: r.festival || null, price_on_poster: r.has_price_on_poster, reactions: Number(r.reactions) || 0, comments: Number(r.comments) || 0,
    shares: Number(r.shares) || 0, source: r.source })));
} catch (e) { /* tool mode */ }

const prompt = [
  `Today is ${today} (India).`,
  `Shop profile: ${JSON.stringify({ name_bn: shop.shop_name_bn, name_en: shop.shop_name_en, type: shop.shop_type, area: shop.area, tone: shop.tone })}`,
  `Language setting for posts: ${normLang(shop.languages)}`,
  `Style notes from the owner's past edits: ${shop.style_notes || '(none yet)'}`,
  `Insights from the Analyst: ${shop.insights || '(none yet)'}`,
  `Past post results: ${PAST_RESULTS}`,
  `What the owner just sent (Listener JSON): ${JSON.stringify(listener)}`,
  'Use your tools, then return the JSON.',
].join('\\n');

return [{ json: { prompt } }];
'''
(code / '15_strategist_input.js').write_text(s, encoding='utf-8')
print('wrote 15_strategist_input.js')
