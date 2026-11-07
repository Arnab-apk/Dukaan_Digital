// n8n Code node: "Build Nudge request"   (Mode: Run Once for Each Item)
// GENERATED from prompts/06_nudge.md - edit the prompt there, then ask Claude Code to "regenerate the request scripts".
// Next node: Anthropic node "Nudge" (Message a model): System = {{ $json.system }}, User message = {{ $json.user }},
//   Max tokens = {{ $json.max_tokens }}. Uses n8n Cloud AI credits, so no Anthropic key is needed.
// Then "Parse Nudge JSON" (06_parse_llm_json.js with REQUIRED = ['message']).

const MAX_TOKENS = 500;
const SYSTEM = "You write a short, friendly Telegram nudge from a small business's marketing assistant (Dukaan Digital) to the owner. {{LANG_RULE}}\n- Mention the festival and its date (as given), and how many days are left.\n- Suggest ONE specific product or service idea that fits both the festival and this business type (use the festival's typical products and the shop's recent products). If the festival does not fit this business at all, suggest a simple greeting post instead.\n- Ask the owner to send a photo (and a voice note with the price).\n- Max 4 lines, max 2 emojis. No invented offers or prices.\n\nReturn ONLY valid JSON:\n{ \"message\": \"the Telegram text\" }";
const parse = s => { try { return JSON.parse(s || '{}'); } catch (e) { return {}; } };
const clean = v => (v && !/REPLACE/.test(String(v)) ? v : null);
const normLang = v => (v === 'bn' || v === 'en') ? v : 'mixed';
function langRule() { return ''; }
const transcript = (() => { try { return $('Transcribe voice').first().json.text || ''; } catch (e) { return ''; } })();

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
  return [{ type: 'text', text: JSON.stringify(facts, null, 2) + '\nReturn the JSON now.' }];
}

const user = userContent().filter(b => b.type === 'text').map(b => b.text).join('\n');
return { json: { agent: AGENT, chat_id: $json.chat_id, system: SYSTEM.replace('{{LANG_RULE}}', langRule()), user, max_tokens: MAX_TOKENS } };
