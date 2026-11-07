// Live code from n8n workflow 'DD Main (Dukaan Digital bot)', node 'Route update'.
const u = $input.first().json;
if (u.callback_query) {
  const cq = u.callback_query;
  const [action, post_id] = String(cq.data || '').split(':');
  return [{ json: { kind: 'button', action, post_id, chat_id: String(cq.message.chat.id), callback_id: cq.id, message_id: cq.message.message_id } }];
}
const m = u.message || u.edited_message;
if (!m) return [{ json: { kind: 'ignore' } }];
const chat_id = String(m.chat.id);
const text = String(m.text || m.caption || '').trim();
if (m.text && m.text.startsWith('/')) {
  const cmd = m.text.split(/\s+/)[0].split('@')[0].toLowerCase();
  return [{ json: { kind: 'command', cmd, chat_id, text, owner_name: m.from?.first_name || '' } }];
}
let photo_file_id = null;
if (Array.isArray(m.photo) && m.photo.length) photo_file_id = m.photo[m.photo.length - 1].file_id;
else if (m.document && /^image\//.test(m.document.mime_type || '')) photo_file_id = m.document.file_id;
const voice_file_id = m.voice ? m.voice.file_id : (m.audio ? m.audio.file_id : null);
return [{ json: { kind: 'message', chat_id, text, photo_file_id, voice_file_id, has_photo: !!photo_file_id, has_voice: !!voice_file_id, has_text: text.length > 0, owner_name: m.from?.first_name || '' } }];
