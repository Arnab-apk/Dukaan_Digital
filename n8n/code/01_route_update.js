// n8n Code node: "Route update"   (Mode: Run Once for All Items)
// Put directly after the Telegram Trigger (updates: message, callback_query).
// Output: one item with json.kind = 'button' | 'command' | 'message' | 'ignore'.

const u = $input.first().json; // the Telegram update object

// 1) Button press on a preview (callback_query)
if (u.callback_query) {
  const cq = u.callback_query;
  const [action, post_id] = String(cq.data || '').split(':'); // e.g. "post:ab12cd34"
  return [{
    json: {
      kind: 'button',
      action,                       // 'post' | 'edit' | 'skip'
      post_id,
      chat_id: String(cq.message.chat.id), // note: NOT message.chat.id at top level
      callback_id: cq.id,           // needed for "Answer Query" so the button stops spinning
      message_id: cq.message.message_id,
    },
  }];
}

const m = u.message || u.edited_message;
if (!m) return [{ json: { kind: 'ignore' } }];

const chat_id = String(m.chat.id);
// Text sent together with a photo arrives in `caption`, not `text`.
const text = String(m.text || m.caption || '').trim();

// 2) Commands: /start /help /report /nudge /memory
if (m.text && m.text.startsWith('/')) {
  const cmd = m.text.split(/\s+/)[0].split('@')[0].toLowerCase();
  return [{ json: { kind: 'command', cmd, chat_id, text, owner_name: m.from?.first_name || '' } }];
}

// 3) Normal message: photo and/or voice and/or text
let photo_file_id = null;
if (Array.isArray(m.photo) && m.photo.length) {
  photo_file_id = m.photo[m.photo.length - 1].file_id; // last = largest size
} else if (m.document && /^image\//.test(m.document.mime_type || '')) {
  photo_file_id = m.document.file_id; // photo sent "as file"
}
const voice_file_id = m.voice ? m.voice.file_id : (m.audio ? m.audio.file_id : null);

return [{
  json: {
    kind: 'message',
    chat_id,
    text,
    photo_file_id,
    voice_file_id,
    has_photo: !!photo_file_id,
    has_voice: !!voice_file_id,
    has_text: text.length > 0,
    owner_name: m.from?.first_name || '',
  },
}];
