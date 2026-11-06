// n8n Code node: "Prepare publish"   (Mode: Run Once for All Items)
// Runs after the owner taps ✅ Post. Inputs: 'Get post' (dd_posts row by post_id) and 'Get shop' (dd_shops row), both from the top of the main workflow.
// Next nodes:
//   0) IF {{ $json.already }} is true -> Send Message "আগেই পোস্ট হয়েছে (Already posted)" and stop.
//   a) Telegram "Send Photo" to the shop channel: Chat ID {{ $json.channel_id }} (@publicname or -100… number),
//      Photo {{ $json.image_url || $json.photo_file_id }}, Caption {{ $json.public_caption }}, Parse Mode HTML
//   b) IF {{ $('Prepare publish').first().json.fb_enabled }} -> HTTP Request (On Error: Continue (regular output)):
//        POST https://graph.facebook.com/<version shown in Graph API Explorer, e.g. v27.0>/{{ $('Prepare publish').first().json.fb_page_id }}/photos
//        Body (form or JSON): url = {{ $json.image_url }}, message = {{ $json.public_caption_plain }}, access_token = <Page token from a credential>
//        Response: { id, post_id }  -> save post_id as fb_post_id
//      (If the text doesn't appear on Facebook, send it as `caption` instead of `message`.)
//   c) BOTH IF outputs -> Data table "Update row(s)" on dd_posts where post_id = {{ $('Prepare publish').first().json.post_id }}:
//        status = posted, fb_post_id = {{ $json.post_id || '' }}, posted_at = updated_at = {{ $('Prepare publish').first().json.posted_at }}
//   d) Telegram "Send Message" to the owner: "Posted ✓" with an inline URL button
//        text "📲 Forward on WhatsApp", url {{ $json.whatsapp_url }}

const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const post = $('Get post').first().json;
const shop = $('Get shop').first().json;
const copy = JSON.parse(post.copy_json || '{}');

const tags = (copy.hashtags || []).slice(0, 4).join(' ');
const plain = [copy.caption_bn, copy.caption_en, tags].filter(Boolean).join('\n\n');
const footer = [shop.shop_name_bn, shop.area].filter(Boolean).join(' · ');
// Cut raw text first, then escape (never split &amp;). Photo caption limit is 1024.
const cut = (s, n) => { s = String(s ?? ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const public_caption = `${esc(cut(copy.caption_bn, 500))}\n\n${esc(cut(copy.caption_en, 150))}\n${esc(cut(tags, 80))}\n\n${esc(cut(footer, 120))}`;

// Bengali characters grow ~9x when URL-encoded, so keep the WhatsApp text short (test the button once).
let wa = cut(copy.whatsapp_text || plain, 280);
if (post.image_url) wa += `\n${post.image_url}`; // the poster link previews in WhatsApp
const whatsapp_url = 'https://wa.me/?text=' + encodeURIComponent(wa);

const fb_page_id = String(shop.fb_page_id || '');
return [{
  json: {
    post_id: post.post_id,
    chat_id: post.chat_id,
    channel_id: shop.channel_id,
    already: post.status === 'posted',          // double tap, or Post on an old preview -> IF: reply "already posted"
    image_url: post.image_url,                  // empty when the poster render failed
    photo_file_id: post.photo_file_id,         // fallback for the Telegram channel post
    public_caption,
    public_caption_plain: `${plain}\n\n${footer}`,
    fb_enabled: !!fb_page_id && !/REPLACE/.test(fb_page_id) && !!post.image_url, // Facebook can't fetch a Telegram file_id
    fb_page_id,
    whatsapp_url,
    posted_at: new Date().toISOString(),
  },
}];
