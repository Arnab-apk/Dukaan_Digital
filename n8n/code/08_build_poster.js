// n8n Code node: "Build poster"   (Mode: Run Once for All Items)
// Fills the poster template with the shop's brand, the owner's REAL photo and the Copywriter's text,
// then hands the HTML to an HTTP Request node for the HTML/CSS to Image API:
//   Method POST, URL https://hcti.io/v1/image
//   Authentication: Generic -> Basic Auth (User = your HCTI User ID, Password = your HCTI API Key)
//   Send Body: JSON, "Using JSON":  {{ JSON.stringify($json.hcti) }}
//   Settings: Retry On Fail ON, and On Error = "Continue" (regular output). A failed render then reaches
//   "Build preview" with no url, and the owner gets the original photo instead.
// The API answers { "url": "https://hcti.io/v1/image/..." } which Telegram and Facebook can both fetch.
//
// TEMPLATE below is generated from templates/poster.html. Edit that file, then re-sync this constant.

const TEMPLATE = "<div class=\"poster\">\n  <div class=\"dots\"></div>\n  <header>\n    <div class=\"shop-bn\">{{SHOP_BN}}</div>\n    <div class=\"shop-en\">{{SHOP_EN}}</div>\n  </header>\n  <div class=\"photo-wrap\">\n    <img class=\"photo\" src=\"{{PHOTO}}\" alt=\"\">\n    <div class=\"badge\" style=\"display:{{BADGE_DISPLAY}}\">{{BADGE}}</div>\n    <div class=\"price\" style=\"display:{{PRICE_DISPLAY}}\"><span>{{PRICE}}</span></div>\n  </div>\n  <div class=\"headline\">{{HEADLINE}}</div>\n  <div class=\"subline\">{{SUBLINE}}</div>\n  <footer>{{FOOTER}}</footer>\n</div>\n<style>\n  * { box-sizing: border-box; margin: 0; padding: 0; }\n  body { width: 1080px; height: 1080px; }\n  .poster { position: relative; width: 1080px; height: 1080px; overflow: hidden;\n    background: {{BRAND}}; color: #fff; font-family: 'Hind Siliguri', 'Noto Sans Bengali', 'Poppins', sans-serif;\n    display: flex; flex-direction: column; align-items: center; }\n  .dots { position: absolute; inset: 0; opacity: .10;\n    background-image: radial-gradient({{ACCENT}} 2px, transparent 2.5px); background-size: 34px 34px; }\n  header { position: relative; text-align: center; padding-top: 44px; }\n  .shop-bn { font-size: 58px; font-weight: 700; color: {{ACCENT}}; line-height: 1.15; }\n  .shop-en { font-family: 'Poppins', sans-serif; font-size: 22px; letter-spacing: 4px; text-transform: uppercase; opacity: .85; margin-top: 4px; }\n  .photo-wrap { position: relative; margin-top: 30px; width: 900px; height: 560px; }\n  .photo { width: 100%; height: 100%; object-fit: cover; border-radius: 28px; border: 8px solid {{ACCENT}};\n    box-shadow: 0 18px 40px rgba(0,0,0,.35); background: #3a1020; }\n  .badge { position: absolute; top: 28px; left: -18px; background: {{ACCENT}}; color: {{BRAND}};\n    font-size: 36px; font-weight: 700; padding: 10px 30px 12px 34px; border-radius: 0 40px 40px 0;\n    box-shadow: 0 6px 16px rgba(0,0,0,.3); }\n  .price { position: absolute; right: -26px; bottom: -40px; width: 230px; height: 230px; border-radius: 50%;\n    background: {{ACCENT}}; color: {{BRAND}}; display: flex; align-items: center; justify-content: center;\n    text-align: center; font-weight: 700; font-size: 46px; line-height: 1.05; padding: 22px;\n    border: 8px solid {{BRAND}}; box-shadow: 0 10px 24px rgba(0,0,0,.35); }\n  .price span { display: block; }\n  .price small { display: block; font-size: 32px; font-weight: 600; margin-top: 4px; }\n  .headline { position: relative; margin-top: 38px; font-size: 76px; font-weight: 700; text-align: center; line-height: 1.1; padding: 0 60px; }\n  .subline { position: relative; margin-top: 10px; font-size: 36px; text-align: center; opacity: .92; padding: 0 80px; }\n  footer { position: absolute; bottom: 0; left: 0; right: 0; height: 74px; background: rgba(0,0,0,.28);\n    display: flex; align-items: center; justify-content: center; font-size: 28px; letter-spacing: .5px; }\n</style>\n";

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const okColor = (c, d) => /^#[0-9a-fA-F]{6}$/.test(String(c || '')) ? c : d;

const d = $('Decide next step').first().json;
const shop = d.shop || {};
const copy = $('Parse Copywriter JSON').first().json;
const strat = (() => {
  try { return $('Parse Strategist JSON').first().json; }                       // new post
  catch (e) { try { return JSON.parse($('Get post').first().json.strategy_json || '{}'); } catch (e2) { return {}; } } // edit
})();

let photo = '';
try {
  const p = $('Photo to base64').first().json;
  photo = `data:${p.photo_mime};base64,${p.photo_b64}`;
} catch (e) {
  // No photo: a plain gradient keeps the layout intact (never an AI-generated product image).
  photo = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="560"><rect width="100%" height="100%" fill="#5a1a2c"/></svg>');
}

const showPrice = strat.show_price !== false && copy.price_text;
const badge = copy.badge_bn || strat.badge_text_bn || '';
const footerParts = [shop.area, shop.phone && !/REPLACE/.test(shop.phone) ? '📞 ' + shop.phone : ''].filter(Boolean);

const values = {
  BRAND: okColor(shop.brand_color, '#8B1E3F'),
  ACCENT: okColor(shop.accent_color, '#F2A93B'),
  SHOP_BN: esc(shop.shop_name_bn || shop.shop_name_en || ''),
  SHOP_EN: esc(shop.shop_name_en || ''),
  PHOTO: photo,
  BADGE: esc(badge),
  BADGE_DISPLAY: badge ? 'block' : 'none',
  HEADLINE: esc(copy.headline_bn || ''),
  SUBLINE: esc(copy.subline_bn || ''),
  PRICE: (() => {                              // "₹400/কেজি" -> big "₹400", small "/কেজি"
    const p = String(copy.price_text || '');
    const i = p.indexOf('/');
    return i > 0 ? `${esc(p.slice(0, i))}<small>${esc(p.slice(i))}</small>` : esc(p);
  })(),
  PRICE_DISPLAY: showPrice ? 'flex' : 'none',
  FOOTER: esc(footerParts.join('  ·  ')),
};

const html = TEMPLATE.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in values ? values[k] : m));

return [{
  json: {
    html_kb: Math.round(html.length / 1024),
    hcti: {
      html,
      google_fonts: 'Hind Siliguri|Poppins',
      viewport_width: 1080,
      viewport_height: 1080,
      device_scale: 1,
      ms_delay: 500,
    },
  },
}];
