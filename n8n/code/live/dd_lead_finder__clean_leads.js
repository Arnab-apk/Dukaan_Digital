// Live code from n8n workflow 'DD Lead Finder', node 'Clean leads'.
const j = $input.first().json;
const textOf = x => {
  if (!x) return '';
  if (typeof x.merged_response === 'string') return x.merged_response;
  if (typeof x.output === 'string') return x.output;
  if (Array.isArray(x.output)) return x.output.map(c => c.text || '').join('');
  if (x.content && Array.isArray(x.content.parts)) return x.content.parts.map(p => p.text || '').join('');
  if (Array.isArray(x.candidates)) return (((x.candidates[0] || {}).content || {}).parts || []).map(p => p.text || '').join('');
  if (typeof x.text === 'string') return x.text;
  return JSON.stringify(x);
};
let raw = textOf(j).replace(/```(?:json)?/gi, '');
let data = {};
try { const a = raw.indexOf('{'), b = raw.lastIndexOf('}'); data = JSON.parse(raw.slice(a, b + 1)); } catch (e) { data = {}; }
const leads = Array.isArray(data.leads) ? data.leads : [];
const summary = typeof data.summary === 'string' ? data.summary.slice(0, 400) : '';
const inp = $('Called by DD Main').first().json;
const now = new Date().toISOString();
const seen = new Set();
const cleanPhone = p => { if (!p) return ''; const first = String(p).split(/[;,\/]| or /)[0]; const d = first.replace(/[^0-9+]/g, ''); return d.length >= 8 ? d : ''; };
const cleanEmail = e => { const s = e ? String(e).split(/[;,\s]/)[0].trim() : ''; return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s.toLowerCase() : ''; };
const out = [];
for (const l of leads) {
  const name = String(l.business_name || '').trim();
  if (!name || !l.source_url) continue;
  const key = name.toLowerCase();
  if (seen.has(key)) continue; seen.add(key);
  out.push({ json: {
    lead_id: Math.random().toString(36).slice(2, 10), found_at: now, search: String(inp.query || ''), kind: String(inp.mode || 'custom'), for_chat: String(inp.chat_id || ''),
    business_name: name, business_type: String(l.business_type || ''), area: String(l.area || ''), phone: cleanPhone(l.phone), email: cleanEmail(l.email),
    website: String(l.website || ''), source_url: String(l.source_url), online_presence: String(l.online_presence || ''),
    fit_score: Math.max(0, Math.min(10, Number(l.fit_score) || 0)), why: String(l.why || ''), opener_bn: String(l.opener || l.opener_bn || ''),
    status: 'new', do_not_contact: false, summary,
  } });
}
out.sort((a, b) => b.json.fit_score - a.json.fit_score);
return out.slice(0, 10);
