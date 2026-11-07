// Live code from n8n workflow 'DD Main (Dukaan Digital bot)', node 'Build Strategist input'.
const d = $('Decide next step').first().json;
const shop = d.shop || {};
const listener = $('Parse Listener JSON').first().json;
const normLang = v => (v === 'bn' || v === 'en') ? v : 'mixed';
const today = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
let PAST = '(none)';
try {
  const rows = $('Get past posts').all().map(i => i.json).filter(r => r.post_id && r.status === 'posted');
  PAST = JSON.stringify(rows.slice(-15).map(r => ({ date: String(r.created_at).slice(0, 10), product: r.product, angle: r.angle, festival: r.festival || null, price_on_poster: r.has_price_on_poster, reactions: Number(r.reactions) || 0, comments: Number(r.comments) || 0, shares: Number(r.shares) || 0, source: r.source })));
} catch (e) {}
const prompt = [
  `Today is ${today} (India).`,
  `Shop profile: ${JSON.stringify({ name_bn: shop.shop_name_bn, name_en: shop.shop_name_en, type: shop.shop_type, area: shop.area, tone: shop.tone })}`,
  `Language setting for posts: ${normLang(shop.languages)}`,
  `Style notes from the owner's past edits: ${shop.style_notes || '(none yet)'}`,
  `Insights from the Analyst: ${shop.insights || '(none yet)'}`,
  `Past post results (source seeded_demo = demo history): ${PAST}`,
  `What the owner just sent (Listener JSON): ${JSON.stringify(listener)}`,
  'Use the upcoming_festivals tool, then return the JSON.',
].join('\n');
return [{ json: { prompt } }];
