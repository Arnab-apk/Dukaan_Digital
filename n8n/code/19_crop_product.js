// n8n Code node: "Crop product" (between Build poster and Render poster). Synced from the live DD Main workflow.
// Finishes the poster: crops the photo to the product the Listener found (real pixels only, shown like a studio shot)
// and adds a WhatsApp "Scan to order" QR when the shop has a phone number.
const j = $input.first().json;
const theme = j.theme;
let L = {};
try { L = $('Parse Listener JSON').first().json; } catch (e) { try { L = JSON.parse($('Get post').first().json.listener_json || '{}'); } catch (e2) {} }
let P = {};
try { P = $('Photo to base64').first().json; } catch (e) {}
const shop = $('Decide next step').first().json.shop || {};
const n = v => Number(v);
let html = j.hcti.html, css = '', cropped = false;
const FRAME = { festive: [884, 524], modern: [938, 600], bold: [1080, 690], fresh: [836, 506], elegant: [838, 538] }[theme] || [900, 560];
const b = L.product_box || null;
if (b && ['x', 'y', 'w', 'h'].every(k => Number.isFinite(n(b[k]))) && n(b.w) >= 8 && n(b.h) >= 8 && (n(b.w) < 88 || n(b.h) < 88)) {
  const pad = 4;
  const x1 = Math.max(0, n(b.x) - pad), y1 = Math.max(0, n(b.y) - pad);
  const x2 = Math.min(100, n(b.x) + n(b.w) + pad), y2 = Math.min(100, n(b.y) + n(b.h) + pad);
  const view = `inset(${y1.toFixed(1)}% ${(100 - x2).toFixed(1)}% ${(100 - y2).toFixed(1)}% ${x1.toFixed(1)}%)`;
  const W = n(P.photo_w) || 0, H = n(P.photo_h) || 0;
  const aspect = W && H ? ((x2 - x1) * W) / ((y2 - y1) * H) : null;
  const dark = theme === 'bold';
  const bg = dark ? 'radial-gradient(ellipse at 50% 50%,#3a404b 0%,#14171d 72%)' : 'radial-gradient(ellipse at 50% 42%,#ffffff 0%,#F3EFE8 55%,#E2DCD0 100%)';
  css += `.photo-frame.crop{background:${bg};display:flex;align-items:center;justify-content:center;}.theme-bold .photo-frame.crop::after{display:none;}`;
  if (aspect) {
    const [fw, fh] = FRAME;
    const top = dark ? 100 : 0;
    const aw = fw * 0.74, ah = (fh - top) * 0.84;
    let w = aw, h = aw / aspect;
    if (h > ah) { h = ah; w = ah * aspect; }
    css += `.photo-frame.crop .photo{width:${Math.round(w)}px;height:${Math.round(h)}px;object-fit:cover;object-view-box:${view};border-radius:22px;box-shadow:0 26px 60px rgba(0,0,0,${dark ? '.6' : '.22'}),0 4px 12px rgba(0,0,0,.12);${top ? `margin-top:${top}px;` : ''}}`;
  } else {
    css += `.photo-frame.crop .photo{object-fit:contain;object-view-box:${view};padding:28px;}`;
  }
  html = html.replace('class="photo-frame"', 'class="photo-frame crop"');
  cropped = true;
}
const digits = String(shop.phone || '').replace(/\D/g, '');
const wa = digits.length === 10 ? '91' + digits : (digits.length >= 11 && digits.length <= 13 ? digits : '');
let order_url = '';
if (wa) {
  const product = L.product_en || '';
  const msg = `Hi ${shop.shop_name_en || shop.shop_name_bn || ''}, I saw your post and want to order${product ? ': ' + product : ''}.`;
  order_url = `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&data=${encodeURIComponent(order_url)}`;
  const label = shop.languages === 'bn' ? 'স্ক্যান করে অর্ডার' : 'Scan to order';
  const pos = theme === 'bold' ? 'left:60px;bottom:-30px;' : theme === 'elegant' ? 'right:-28px;top:-24px;' : 'right:-20px;top:-20px;';
  css += `.wa-qr{position:absolute;${pos}z-index:4;background:#fff;border-radius:16px;padding:12px 12px 8px;box-shadow:0 10px 26px rgba(0,0,0,.25);text-align:center;}.wa-qr img{width:112px;height:112px;display:block;}.wa-qr span{display:block;margin-top:6px;font:700 15px 'Poppins','Hind Siliguri',sans-serif;color:#128C7E;}`;
  html = html.replace('<div class="badge"', `<div class="wa-qr"><img src="${qr}" alt=""><span>${label}</span></div><div class="badge"`);
}
if (css) html = html.replace('</style>', css + '</style>');
return [{ json: { ...j, cropped, order_url, hcti: { ...j.hcti, html } } }];
