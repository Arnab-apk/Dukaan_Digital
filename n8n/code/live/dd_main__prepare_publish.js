// Live code from n8n workflow 'DD Main (Dukaan Digital bot)', node 'Prepare publish'.
const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const cut = (s, n) => { s = String(s ?? ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
// The n8n credential 'Query Auth account' holds this Page's token, so shops without their own Page post here.
const DEFAULT_FB_PAGE_ID = '1471948929329313';
const post = $('Get post').first().json;
const shop = $('Get shop').first().json;
const copy = JSON.parse(post.copy_json || '{}');
let listener = {};
try { listener = JSON.parse(post.listener_json || '{}'); } catch (e) {}
const tags = (copy.hashtags || []).slice(0, 4).join(' ');
// WhatsApp order link: customers tap it and land in the shop's WhatsApp with the order message typed in.
const digits = String(shop.phone || '').replace(/\D/g, '');
const waNum = digits.length === 10 ? '91' + digits : (digits.length >= 11 && digits.length <= 13 ? digits : '');
const order_url = waNum ? `https://wa.me/${waNum}?text=${encodeURIComponent(`Hi ${shop.shop_name_en || shop.shop_name_bn || ''}, I saw your post and want to order${listener.product_en ? ': ' + listener.product_en : ''}.`)}` : '';
const orderLine = order_url ? `📲 Order on WhatsApp: ${order_url}` : '';
const plain = [copy.caption_bn, copy.caption_en, orderLine, tags].filter(Boolean).join('\n\n');
const footer = [shop.shop_name_bn, shop.area].filter(Boolean).join(' · ');
const en = copy.caption_en ? `${esc(cut(copy.caption_en, 150))}\n` : '';
const orderHtml = order_url ? `\n<a href="${esc(order_url)}">📲 Order on WhatsApp</a>` : '';
const public_caption = `${esc(cut(copy.caption_bn, 500))}\n\n${en}${esc(cut(tags, 80))}${orderHtml}\n\n${esc(cut(footer, 120))}`;
let wa = cut(copy.whatsapp_text || plain, 280);
if (post.image_url) wa += `\n${post.image_url}`;
const whatsapp_url = 'https://wa.me/?text=' + encodeURIComponent(wa);
const fb_page_id = String(shop.fb_page_id || DEFAULT_FB_PAGE_ID);
return [{ json: {
  post_id: post.post_id, chat_id: post.chat_id, channel_id: shop.channel_id, already: post.status === 'posted',
  image_url: post.image_url, photo_file_id: post.photo_file_id, public_caption, public_caption_plain: `${plain}\n\n${footer}`,
  fb_enabled: !!fb_page_id && !!post.image_url, fb_page_id, whatsapp_url, order_url, posted_at: new Date().toISOString(),
} }];
