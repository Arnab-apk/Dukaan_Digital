// Live code from n8n workflow 'DD Main (Dukaan Digital bot)', node 'Parse setup'.
const d = $('Decide next step').first().json;
const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const args = String(d.text || '').replace(/^\/setup(@\S+)?/i, '').trim();
const parts = args.split('|').map(s => s.trim());
if (parts.length < 3 || !parts[0] || !parts[1] || !parts[2]) return [{ json: { ok: false } }];
const [name, type, area, phoneRaw = ''] = parts;
const old = d.shop || {};
const same = old.shop_name_bn === name || old.shop_name_en === name;
const isBn = /[ঀ-৿]/.test(name);
const phone = phoneRaw.replace(/[^0-9+ ]/g, '').trim();
const n = name.slice(0, 60);
const shop = {
  chat_id: String(d.chat_id),
  shop_name_bn: isBn ? n : (same && old.shop_name_bn ? old.shop_name_bn : n),
  shop_name_en: isBn ? (same ? old.shop_name_en || '' : '') : n,
  shop_type: type.slice(0, 60), area: area.slice(0, 80), phone: phone || (same && !/REPLACE/.test(old.phone || '') ? old.phone || '' : ''),
  brand_color: old.brand_color || '#8B1E3F', accent_color: old.accent_color || '#F2A93B',
  tone: (same && old.tone) || 'warm and friendly, like a trusted neighbourhood shopkeeper',
  languages: old.languages || 'mixed', style_notes: same ? old.style_notes || '' : '', insights: same ? old.insights || '' : '',
};
const msg = `✅ <b>${esc(shop.shop_name_bn)}</b> is ready (${esc(type)}, ${esc(area)}).\n\nWhich language should your posts use? You can change it any time with /language.\nThen send a product photo with a voice note or text.`;
return [{ json: { ok: true, shop, msg } }];
