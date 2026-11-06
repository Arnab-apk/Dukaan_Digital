// n8n Code node: "Build Nudge request"   (Mode: Run Once for Each Item)
// GENERATED from prompts/06_nudge.md - edit the prompt there, then ask Claude Code to "regenerate the request scripts".
// Next node: Anthropic node "Nudge" (Message a model): System = {{ $json.system }}, User message = {{ $json.user }},
//   Max tokens = {{ $json.max_tokens }}. Uses n8n Cloud AI credits, so no Anthropic key is needed.
// Then "Parse Nudge JSON" (06_parse_llm_json.js with REQUIRED = ['message']).

const MAX_TOKENS = 500;
const SYSTEM = "You write a short, friendly Telegram nudge from a shop's marketing assistant to the shop owner, in Bengali (one English line at the end).\n- Mention the festival and its date (as given), and how many days are left.\n- Suggest ONE specific product idea that fits both the festival and this shop (use the festival's typical_products and the shop's recent products).\n- Ask the owner to send a photo (and a voice note with the price).\n- Max 4 lines, max 2 emojis. No invented offers or prices.\n\nReturn ONLY valid JSON:\n{ \"message\": \"the Telegram text\" }";
const parse = s => { try { return JSON.parse(s || '{}'); } catch (e) { return {}; } };
const clean = v => (v && !/REPLACE/.test(String(v)) ? v : null);
const transcript = (() => { try { return $('Transcribe voice').first().json.text || ''; } catch (e) { return ''; } })();

const AGENT = 'nudge';
// One item per shop from "Nudge check". In the Telegram "Send Message" node after "Parse Nudge JSON", use
//   Chat ID = {{ $('Nudge check').item.json.chat_id }}   Text = {{ $json.message }}
function userContent() {
  const facts = {
    shop: { name_bn: $json.shop.shop_name_bn, type: $json.shop.shop_type },
    festival: $json.festival,
    recent_products: $json.recent_products,
  };
  return [{ type: 'text', text: JSON.stringify(facts, null, 2) + '\nReturn the JSON now.' }];
}

const user = userContent().filter(b => b.type === 'text').map(b => b.text).join('\n');
return { json: { agent: AGENT, chat_id: $json.chat_id, system: SYSTEM, user, max_tokens: MAX_TOKENS } };
