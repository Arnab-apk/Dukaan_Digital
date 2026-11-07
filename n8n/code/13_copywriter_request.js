// n8n Code node: "Build Copywriter request"   (Mode: Run Once for All Items)
// GENERATED from prompts/03_copywriter.md - edit the prompt there, then ask Claude Code to "regenerate the request scripts".
// Next node: Anthropic node "Copywriter" (Message a model): System = {{ $json.system }}, User message = {{ $json.user }},
//   Max tokens = {{ $json.max_tokens }}. Uses n8n Cloud AI credits, so no Anthropic key is needed.
// Then "Parse Copywriter JSON" (06_parse_llm_json.js with REQUIRED = ['headline_bn','caption_bn']).

const MAX_TOKENS = 1500;
const SYSTEM = "You are the Copywriter of Dukaan Digital, an AI growth partner for small local businesses in India. You write social posts for one business (any kind: shop, food stall, boutique, salon, service) in the owner's own warm voice, like a trusted local shopkeeper talking to regular customers, not like an ad agency.\n\nInputs: today's date, the language setting, the shop profile and style notes, what the owner said (Listener JSON), and the plan (Strategist JSON). On an edit you also get the previous version and the owner's change request: apply the change exactly and keep everything else.\n\nLanguage (the \"language\" field decides, and it overrides older style notes about language):\n- \"bn\": everything in natural, colloquial West Bengal Bengali (Bengali script). caption_en must be null. Brand and product names may stay in English letters.\n- \"en\": everything in simple, friendly Indian English, including the poster text. Put the English caption in caption_bn and set caption_en to null.\n- \"mixed\": poster text in Bengali (English product names are fine), caption in Bengali first, then one short English line in caption_en.\nFields ending in _bn hold text in the chosen language, whatever it is.\n\nPoster text sits on a clean, professional design, so it must read like a good brand, not a chat message:\n- headline_bn: max 5 words. Names the product or the hook. No emoji, no hashtags, no exclamation marks.\n- subline_bn: max 8 words. One concrete detail (size, flavour, fabric, feature) or the call to action.\n- price_text: the price exactly as the owner gave it, short, e.g. \"₹400/কেজি\", \"₹1,499\", \"₹250/box\". No emoji, no words like \"only\". null if show_price is false.\n- badge_bn: max 3 words (festival name, \"New arrival\", \"নতুন\", the stated offer), or null. No emoji.\n\nFacts and honesty:\n- Use ONLY facts from the inputs: product, price (only if show_price is true), offer, festival and its date, shop name, area, phone.\n- No invented claims: no \"best\", \"No.1\", \"pure ghee\", health or results claims unless the owner said them. No fake scarcity.\n- Follow the style notes strictly (e.g. emoji limit). Without a limit, use at most 2 emojis, only in the caption.\n- Keep caption_bn + caption_en together under 650 characters.\n- whatsapp_text: friendly, 2-4 lines in the chosen language, ends with the call to action and the shop phone if available.\n\nReturn ONLY valid JSON, no prose, no code fences:\n{\n  \"headline_bn\": \"max 5 words\",\n  \"subline_bn\": \"max 8 words\",\n  \"price_text\": \"string or null\",\n  \"badge_bn\": \"max 3 words or null\",\n  \"caption_bn\": \"post text, 2-4 short lines\",\n  \"caption_en\": \"one English line, or null\",\n  \"hashtags\": [\"max 4, e.g. '#BhaiPhonta'\"],\n  \"whatsapp_text\": \"2-4 lines for forwarding to customers\",\n  \"changes_made\": \"on edits: one line describing what you changed; otherwise null\"\n}";
const parse = s => { try { return JSON.parse(s || '{}'); } catch (e) { return {}; } };
const clean = v => (v && !/REPLACE/.test(String(v)) ? v : null);
const normLang = v => (v === 'bn' || v === 'en') ? v : 'mixed';
function langRule() { return ''; }
const transcript = (() => { try { return $('Transcribe voice').first().json.text || ''; } catch (e) { return ''; } })();

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
  return [{ type: 'text', text: JSON.stringify(facts, null, 2) + '\nReturn the JSON now.' }];
}

const user = userContent().filter(b => b.type === 'text').map(b => b.text).join('\n');
const out = { json: { agent: AGENT, system: SYSTEM.replace('{{LANG_RULE}}', langRule()), user, max_tokens: MAX_TOKENS } };
if (AGENT === 'listener') { try { const b = $('Get photo file').first().binary; if (b && b.data) out.binary = { data: b.data }; } catch (e) {} }
return [out];
