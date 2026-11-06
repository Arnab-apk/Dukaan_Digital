// n8n Code node: "Parse <Agent> JSON"   (Mode: Run Once for All Items)
// Works after an HTTP call to the Anthropic API (reads content[].text) or after an AI Agent node (reads .output).
// Set REQUIRED to the keys that agent's prompt promises. On failure it returns ok:false instead of crashing,
// so an IF node ({{ $json.ok }} is true) can send the fallback message ("Sorry, please try again") instead.
// Per-agent REQUIRED keys:
//   Listener   ['intent','product_en']        Strategist ['angle','reason']
//   Copywriter ['headline_bn','caption_bn']   Memory     ['is_lasting','new_style_notes']
//   Analyst    ['report_text','insights']     Nudge      ['message']

const REQUIRED = ['intent', 'product_en']; // e.g. strategist: ['angle','reason'], copywriter: ['headline_bn','caption_bn']

function rawText(j) {
  if (typeof j.merged_response === 'string') return j.merged_response; // n8n Anthropic node
  if (typeof j.content === 'string') return j.content;
  if (j.message && typeof j.message.content === 'string') return j.message.content;
  if (Array.isArray(j.content)) return j.content.map(c => c.text || '').join('');
  if (typeof j.output === 'string') return j.output;   // AI Agent node
  if (Array.isArray(j.output)) return j.output.map(c => (typeof c === 'string' ? c : c.text || '')).join(''); // agent content blocks
  if (typeof j.text === 'string') return j.text;       // Basic LLM Chain
  return JSON.stringify(j);
}

function extract(s) {
  s = s.replace(/```(?:json)?/gi, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a === -1 || b <= a) throw new Error('no JSON object found');
  return JSON.parse(s.slice(a, b + 1));
}

// Handles several items (e.g. one nudge per shop); output item i pairs with input item i.
return $input.all().map((item, i) => {
  const raw = rawText(item.json || {});
  try {
    const data = extract(raw);
    const missing = REQUIRED.filter(k => !(k in data));
    if (missing.length) return { json: { ok: false, error: `missing keys: ${missing.join(', ')}`, raw: raw.slice(0, 500) }, pairedItem: i };
    return { json: { ok: true, ...data }, pairedItem: i };
  } catch (e) {
    return { json: { ok: false, error: String(e.message || e), raw: raw.slice(0, 500) }, pairedItem: i };
  }
});
