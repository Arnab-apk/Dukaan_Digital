// n8n Code node: "Decide next step"   (Mode: Run Once for All Items)
// Inputs it reads (rename the node names below if yours differ):
//   'Route update'     -> output of 01_route_update.js
//   'Get shop'         -> Data table "Get row(s)" on dd_shops where chat_id = {{ $json.chat_id }}  (enable "Always Output Data")
//   'Get latest post'  -> Data table "Get row(s)" on dd_posts where chat_id = ..., Return All (enable "Always Output Data").
//                         This script sorts the rows itself, so database ordering of empty values doesn't matter.
// Output json.next = one of:
//   'onboard' | 'help' | 'start_collecting' | 'create_post' | 'edit_post' | 'button' | 'command' | 'ignore'
// Followed by a Switch node in "Expression" mode on {{ $json.next }} (or Rules on the same field).

const r = $('Route update').first().json;
const shopItem = $('Get shop').first();
const shop = shopItem && shopItem.json && shopItem.json.chat_id ? shopItem.json : null;
const stamp = p => Date.parse(p.updated_at || p.created_at || 0) || 0;
const last = $('Get latest post').all().map(i => i.json).filter(p => p && p.post_id)
  .sort((a, b) => stamp(b) - stamp(a))[0] || null;

const newId = () => Math.random().toString(36).slice(2, 10); // 8 chars, fits in callback_data
const now = new Date().toISOString();
const ageMin = last ? (Date.now() - Date.parse(last.updated_at || last.created_at || now)) / 60000 : Infinity;

let next = 'help';
let post_id = r.post_id || null; // buttons carry their post_id

if (r.kind === 'ignore') next = 'ignore';                                 // Switch: leave this output unconnected
else if (r.kind === 'button') next = 'button';
else if (r.kind === 'command') next = r.cmd === '/start' || (!shop && r.cmd !== '/help') ? 'onboard' : (r.cmd === '/help' ? 'help' : 'command');
else if (r.kind === 'message') {
  if (!shop) next = 'onboard';
  else if (r.has_photo && (r.has_text)) { next = 'create_post'; post_id = newId(); }          // photo + caption: go
  else if (r.has_photo) { next = 'start_collecting'; post_id = newId(); }                    // photo only: wait for voice/text
  else if ((r.has_voice || r.has_text) && last && last.status === 'collecting' && ageMin < 30) {
    next = 'create_post'; post_id = last.post_id;                                             // the voice note for the photo
  }
  else if ((r.has_voice || r.has_text) && last && last.status === 'awaiting_edit' && ageMin < 120) {
    next = 'edit_post'; post_id = last.post_id;
  }
  else next = 'help';
}

return [{
  json: {
    ...r,
    next,
    post_id,
    now,
    shop,                                    // null if not registered
    photo_file_id: r.photo_file_id || (last && last.photo_file_id) || null,
    last_status: last ? last.status : null,
  },
}];
