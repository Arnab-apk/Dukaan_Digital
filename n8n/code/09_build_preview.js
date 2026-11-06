// n8n Code node: "Build preview"   (Mode: Run Once for All Items)
// Prepares the owner's preview: poster URL (or fallback), a caption under Telegram's 1024-char photo limit,
// the inline keyboard, and the row to save in dd_posts.
// Next nodes:
//   1) Data table "Upsert row" on dd_posts, match post_id, map from $json.row
//   2) Telegram "Send Photo": Chat ID {{ $json.chat_id }}, Photo = URL {{ $json.photo }}
//      (fallback: Binary/File ID {{ $json.photo_file_id }}), Caption {{ $json.caption }}, Parse Mode HTML,
//      Reply Markup: Inline Keyboard with three buttons:
//        "✅ Post"   callback_data = post:{{ $json.post_id }}
//        "✏️ Change" callback_data = edit:{{ $json.post_id }}
//        "⏭ Skip"   callback_data = skip:{{ $json.post_id }}
//      (If you prefer one HTTP call to sendPhoto, use $json.reply_markup as-is.)

const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const d = $('Decide next step').first().json;
const parse = s => { try { return JSON.parse(s || '{}'); } catch (e) { return {}; } };
const saved = (() => { try { return $('Get post').first().json || {}; } catch (e) { return {}; } })(); // used on edits
const listener = (() => { try { return $('Parse Listener JSON').first().json; } catch (e) { return parse(saved.listener_json); } })();
const strat = (() => { try { return $('Parse Strategist JSON').first().json; } catch (e) { return parse(saved.strategy_json); } })();
const copy = $('Parse Copywriter JSON').first().json;
let posterUrl = null;
try { posterUrl = $('Render poster').first().json.url || null; } catch (e) {}

// Telegram photo captions max out at 1024 characters (counted after HTML parsing). Cut the RAW text first, then escape,
// so an escaped entity like &amp; is never split (Telegram would reject it).
const cut = (s, n) => { s = String(s ?? ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const tags = (copy.hashtags || []).slice(0, 4).join(' ');
const reason = strat.reason ? `🧠 <i>${esc(cut(strat.reason, 200))}</i>\n\n` : '';
const edited = copy.changes_made ? `✏️ <i>${esc(cut(copy.changes_made, 120))}</i>\n\n` : '';
const warn = posterUrl ? '' : '⚠️ Poster service unavailable, showing your photo.\n\n';
const caption = `${warn}${edited}${reason}${esc(cut(copy.caption_bn, 400))}\n\n${esc(cut(copy.caption_en, 150))}\n${esc(cut(tags, 80))}`;

const reply_markup = {
  inline_keyboard: [[
    { text: '✅ Post', callback_data: `post:${d.post_id}` },
    { text: '✏️ Change', callback_data: `edit:${d.post_id}` },
    { text: '⏭ Skip', callback_data: `skip:${d.post_id}` },
  ]],
};

const row = {
  post_id: d.post_id,
  chat_id: d.chat_id,
  created_at: saved.created_at || d.now,
  updated_at: d.now,
  status: 'preview',
  source: 'live',
  photo_file_id: d.photo_file_id || '',
  product: listener.product_en || '',
  price: listener.price || '',
  angle: strat.angle || '',
  festival: strat.festival_name_en || '',
  has_price_on_poster: strat.show_price === false || !copy.price_text ? 'no' : 'yes',
  headline: copy.headline_bn || '',
  image_url: posterUrl || '',
  listener_json: JSON.stringify(listener),
  strategy_json: JSON.stringify(strat),
  copy_json: JSON.stringify(copy),
};

return [{
  json: {
    chat_id: d.chat_id,
    post_id: d.post_id,
    photo: posterUrl,                 // null -> use photo_file_id instead
    photo_file_id: d.photo_file_id,
    caption,
    reply_markup,
    row,
  },
}];
