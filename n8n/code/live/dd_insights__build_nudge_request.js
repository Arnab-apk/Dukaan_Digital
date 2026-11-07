// Live code from n8n workflow 'DD Insights (Analyst + festival nudge)', node 'Build Nudge request'.
const MAX_TOKENS = 500;
const lang = ($json.shop.languages === 'bn' || $json.shop.languages === 'en') ? $json.shop.languages : 'mixed';
const LANG_RULE = { bn: 'Write in natural West Bengal Bengali only.', en: 'Write in simple, friendly Indian English only.', mixed: 'Write in Bengali, with one short English line at the end.' }[lang];
const SYSTEM = `You write a short, friendly Telegram nudge from a small business's marketing assistant (Dukaan Digital) to the owner. ${LANG_RULE}
- Mention the festival and its date (as given), and how many days are left.
- Suggest ONE specific product or service idea that fits both the festival and this business type (use the festival's typical products and the shop's recent products). If the festival does not fit this business at all, suggest a simple greeting post instead.
- Ask the owner to send a photo (and a voice note with the price).
- Max 4 lines, max 2 emojis. No invented offers or prices.

Return ONLY valid JSON:
{ "message": "the Telegram text" }`;
const facts = {
  shop: { name_bn: $json.shop.shop_name_bn, name_en: $json.shop.shop_name_en, type: $json.shop.shop_type },
  festival: $json.festival,
  recent_products: $json.recent_products,
};
const user = JSON.stringify(facts, null, 2) + '\nReturn the JSON now.';
return { json: { agent: 'nudge', chat_id: $json.chat_id, system: SYSTEM, user, max_tokens: MAX_TOKENS } };
