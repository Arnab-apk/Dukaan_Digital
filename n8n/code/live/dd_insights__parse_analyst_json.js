// Live code from n8n workflow 'DD Insights (Analyst + festival nudge)', node 'Parse Analyst JSON'.
const REQUIRED = ['report_text', 'insights'];
function rawText(j) {
  if (typeof j.merged_response === 'string') return j.merged_response;
  if (typeof j.content === 'string') return j.content;
  if (j.message && typeof j.message.content === 'string') return j.message.content;
  if (Array.isArray(j.content)) return j.content.map(c => c.text || '').join('');
  if (j.content && Array.isArray(j.content.parts)) return j.content.parts.map(p => p.text || '').join('');
  if (Array.isArray(j.candidates)) return (((j.candidates[0] || {}).content || {}).parts || []).map(p => p.text || '').join('');
  if (typeof j.output === 'string') return j.output;
  if (typeof j.text === 'string') return j.text;
  return JSON.stringify(j);
}
function extract(s) { s = s.replace(/```(?:json)?/gi, '').trim(); const a = s.indexOf('{'), b = s.lastIndexOf('}'); if (a === -1 || b <= a) throw new Error('no JSON object found'); return JSON.parse(s.slice(a, b + 1)); }
return $input.all().map((item, i) => {
  const raw = rawText(item.json || {});
  try { const data = extract(raw); const missing = REQUIRED.filter(k => !(k in data));
    if (missing.length) return { json: { ok: false, error: 'missing keys: ' + missing.join(', '), raw: raw.slice(0, 500) }, pairedItem: i };
    return { json: { ok: true, ...data }, pairedItem: i };
  } catch (e) { return { json: { ok: false, error: String(e.message || e), raw: raw.slice(0, 500) }, pairedItem: i }; }
});
