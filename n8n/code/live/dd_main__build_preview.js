// Live code from n8n workflow 'DD Main (Dukaan Digital bot)', node 'Build preview'.
const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const parse = s => { try { return JSON.parse(s || '{}'); } catch (e) { return {}; } };
const cut = (s, n) => { s = String(s ?? ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const d = $('Decide next step').first().json;
let saved = {};
try { saved = $('Get post').first().json || {}; } catch (e) {}
let listener, strat;
try { listener = $('Parse Listener JSON').first().json; } catch (e) { listener = parse(saved.listener_json); }
try { strat = $('Parse Strategist JSON').first().json; } catch (e) { strat = parse(saved.strategy_json); }
const copy = $('Parse Copywriter JSON').first().json;
let posterUrl = null;
try { posterUrl = $('Render poster').first().json.url || null; } catch (e) {}
let theme = null;
try { theme = $('Build poster').first().json.theme || null; } catch (e) {}
if (theme) strat = { ...strat, design_theme: theme };
const NAMES = { festive: 'Festive', modern: 'Modern', bold: 'Bold', fresh: 'Fresh', elegant: 'Elegant' };
const tags = (copy.hashtags || []).slice(0, 4).join(' ');
const reason = strat.reason ? `🧠 <i>${esc(cut(strat.reason, 180))}</i>\n` : '';
const design = theme && posterUrl ? `🎨 <i>${NAMES[theme] || theme} design</i>\n` : '';
const edited = copy.changes_made ? `✏️ <i>${esc(cut(copy.changes_made, 120))}</i>\n` : '';
const warn = posterUrl ? '' : '⚠️ Poster service off, showing your photo.\n';
const en = copy.caption_en ? `${esc(cut(copy.caption_en, 150))}\n` : '';
const caption = `${warn}${edited}${reason}${design}\n${esc(cut(copy.caption_bn, 360))}\n\n${en}${esc(cut(tags, 80))}`;
const row = {
  post_id: d.post_id, chat_id: d.chat_id, created_at: saved.created_at || d.now, updated_at: d.now, status: 'preview', source: 'live',
  photo_file_id: d.photo_file_id || '', product: listener.product_en || '', price: listener.price || '', angle: strat.angle || '',
  festival: strat.festival_name_en || '', has_price_on_poster: strat.show_price === false || !copy.price_text ? 'no' : 'yes',
  headline: copy.headline_bn || '', image_url: posterUrl || '',
  listener_json: JSON.stringify(listener), strategy_json: JSON.stringify(strat), copy_json: JSON.stringify(copy),
};
return [{ json: { chat_id: d.chat_id, post_id: d.post_id, photo: posterUrl, photo_file_id: d.photo_file_id, caption, row } }];
