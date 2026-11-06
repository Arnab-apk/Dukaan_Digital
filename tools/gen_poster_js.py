import json, pathlib, sys
root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")
tpl = (root / 'templates/poster.html').read_text(encoding='utf-8')
# drop the leading HTML comment
if tpl.lstrip().startswith('<!--'):
    tpl = tpl[tpl.index('-->') + 3:].lstrip()
body = r'''// n8n Code node: "Build poster"   (Mode: Run Once for All Items)
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

const TEMPLATE = __TEMPLATE__;

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
'''
out = body.replace('__TEMPLATE__', json.dumps(tpl, ensure_ascii=False))
(root / 'n8n/code/08_build_poster.js').write_text(out, encoding='utf-8')
print('ok', len(out))
