// Live code from n8n workflow 'DD Main (Dukaan Digital bot)', node 'Leads plan'.
const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const d = $('Decide next step').first().json;
const shop = d.shop || {};
const lang = d.lang || 'mixed';
const type = shop.shop_type || 'local shop';
const area = shop.area || 'Hooghly, West Bengal';
let mode, query;
if (d.kind === 'button') mode = d.post_id === 'comp' ? 'competitors' : 'customers';
else {
  const q = String(d.text || '').replace(/^\/leads(@\S+)?/i, '').trim();
  if (!q) return [{ json: { ask: true } }];
  mode = 'custom'; query = q;
}
if (mode === 'competitors') query = `other ${type} businesses in and near ${area}`;
if (mode === 'customers') query = `organisations in and near ${area} that could buy from a ${type} regularly or in bulk`;
const ack = { customers: `🎯 Finding customers for your ${esc(type)} near ${esc(area)}…`, competitors: `🔍 Researching ${esc(type)} competitors near ${esc(area)}…`, custom: `🔎 Searching: ${esc(query)}` }[mode] + '\n(about 30-60 seconds)';
return [{ json: { ask: false, mode, query, ack, chat_id: d.chat_id, shop_name: shop.shop_name_en || shop.shop_name_bn || '', shop_type: type, area, lang } }];
