// n8n Code node: "Build Analyst request"   (Mode: Run Once for All Items)
// GENERATED from prompts/05_analyst.md - edit the prompt there, then ask Claude Code to "regenerate the request scripts".
// Next node: Anthropic node "Analyst" (Message a model): System = {{ $json.system }}, User message = {{ $json.user }},
//   Max tokens = {{ $json.max_tokens }}. Uses n8n Cloud AI credits, so no Anthropic key is needed.
// Then "Parse Analyst JSON" (06_parse_llm_json.js with REQUIRED = ['report_text','insights']).

const MAX_TOKENS = 1200;
const SYSTEM = "You are the Analyst for a small shop's marketing assistant. You get pre-computed statistics about the shop's recent posts and the list of upcoming festivals.\n\nWrite a short weekly report for the shop owner:\n- Bengali first, simple words, then a 1–2 line English summary.\n- 3 findings max, each tied to a number from the stats (quote the number exactly as given; never compute new numbers).\n- 1 concrete next action, tied to a real upcoming festival from the list (with its date) and a product type that fits this shop.\n- If the stats include seeded demo data, do not hide it — the stats JSON says so; add \"(demo data)\" after any finding based on it.\n- Telegram message limit: under 900 characters total.\n\nAlso produce an \"insights\" line to save into memory for the Strategist (max 250 characters, English, e.g. \"Festival posts with price on poster get ~3x reactions; plain restock posts do poorly\").\n\nReturn ONLY valid JSON:\n{\n  \"report_text\": \"the Telegram message for the owner\",\n  \"insights\": \"max 250 chars, for memory\",\n  \"next_festival\": \"name and date, or null\"\n}";
const parse = s => { try { return JSON.parse(s || '{}'); } catch (e) { return {}; } };
const clean = v => (v && !/REPLACE/.test(String(v)) ? v : null);
const transcript = (() => { try { return $('Transcribe voice').first().json.text || ''; } catch (e) { return ''; } })();

const AGENT = 'analyst';
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
  return [{ type: 'text', text: JSON.stringify(facts, null, 2) + '\nReturn the JSON now.' }];
}

const user = userContent().filter(b => b.type === 'text').map(b => b.text).join('\n');
const out = { json: { agent: AGENT, system: SYSTEM, user, max_tokens: MAX_TOKENS } };
if (AGENT === 'listener') { try { const b = $('Get photo file').first().binary; if (b && b.data) out.binary = { data: b.data }; } catch (e) {} }
return [out];
