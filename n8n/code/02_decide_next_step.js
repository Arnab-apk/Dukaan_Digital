
// Synced from the live DD Main workflow.

const r = $('Route update').first().json;
const shopItem = $('Get shop').first();
const shop = shopItem && shopItem.json && shopItem.json.chat_id ? shopItem.json : null;
const stamp = p => Date.parse(p.updated_at || p.created_at || 0) || 0;
const last = $('Get latest post').all().map(i => i.json).filter(p => p && p.post_id).sort((a, b) => stamp(b) - stamp(a))[0] || null;
const newId = () => Math.random().toString(36).slice(2, 10);
const now = new Date().toISOString();
const ageMin = last ? (Date.now() - Date.parse(last.updated_at || last.created_at || now)) / 60000 : Infinity;
let next = 'help';
let post_id = r.post_id || null;
if (r.kind === 'ignore') next = 'ignore';
else if (r.kind === 'button') next = 'button';
else if (r.kind === 'command') next = r.cmd === '/start' ? 'onboard' : r.cmd === '/help' ? 'help' : r.cmd === '/setup' ? 'command' : (!shop ? 'onboard' : 'command');
else if (r.kind === 'message') {
  if (!shop) next = 'onboard';
  else if (r.has_photo && r.has_text) { next = 'create_post'; post_id = newId(); }
  else if (r.has_photo) { next = 'start_collecting'; post_id = newId(); }
  else if ((r.has_voice || r.has_text) && last && last.status === 'collecting' && ageMin < 30) { next = 'create_post'; post_id = last.post_id; }
  else if ((r.has_voice || r.has_text) && last && last.status === 'awaiting_edit' && ageMin < 120) { next = 'edit_post'; post_id = last.post_id; }
  else next = 'help';
}
return [{ json: { ...r, next, post_id, now, shop, photo_file_id: r.photo_file_id || (last && last.photo_file_id) || null, last_status: last ? last.status : null } }];
