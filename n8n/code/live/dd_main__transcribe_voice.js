// Live code from n8n workflow 'DD Main (Dukaan Digital bot)', node 'Transcribe voice'.
// Normalises the Gemini transcription to { text } so later steps can read $('Transcribe voice').first().json.text
const j = $input.first().json;
const pick = x => {
  if (!x) return '';
  if (typeof x === 'string') return x;
  if (Array.isArray(x)) return x.map(pick).join('');
  if (typeof x.text === 'string') return x.text;
  if (typeof x.merged_response === 'string') return x.merged_response;
  if (x.content && Array.isArray(x.content.parts)) return x.content.parts.map(p => p.text || '').join('');
  if (Array.isArray(x.candidates)) return (((x.candidates[0] || {}).content || {}).parts || []).map(p => p.text || '').join('');
  return '';
};
// Drop Gemini's chatty framing ("The audio contains ...") and markdown, keep the speech and any translation line.
const text = pick(j)
  .split('\n')
  .filter(l => !/^\s*(the (audio|video|recording|clip|speaker)|here is|this (audio|recording))/i.test(l))
  .map(l => l.replace(/\*\*/g, '').replace(/^\s*(transliteration|translation)\s*:\s*/i, m => m.toLowerCase().startsWith('transl') ? '(' + m.trim().replace(':', '') + ') ' : m).trim())
  .filter(Boolean)
  .join(' ')
  .slice(0, 1000);
return [{ json: { text } }];
