const fs = require('fs'), path = require('path');
const CODE = process.argv[2] || path.join(__dirname, '../n8n/code');
const load = n => fs.readFileSync(path.join(CODE, n), 'utf8');
async function run(name, nodes, input = [], json = undefined) {
  const $ = n => { if (!(n in nodes)) throw new Error(`Node '${n}' hasn't been executed`); const it = nodes[n]; return { first: () => it[0], all: () => it, item: it[0] }; };
  const $input = { first: () => input[0], all: () => input, item: input[0] };
  const fn = new Function('$', '$input', '$json', `return (async function(){ ${load(name)} }).call(this);`);
  return await fn.call({ helpers: {} }, $, $input, json);
}
const show = (t, v) => console.log(`\n=== ${t} ===\n` + JSON.stringify(v, null, 1).slice(0, 900));
(async () => {
  const shop = { chat_id: '555', shop_name_en: 'Maa Annapurna', shop_name_bn: 'মা অন্নপূর্ণা', shop_type: 'sweet shop', area: 'Adisaptagram', phone: 'REPLACE_WITH_SHOP_PHONE', tone: 'warm', style_notes: 'Max 2 emojis.' };
  const dNew = { next: 'create_post', chat_id: '555', post_id: 'p1', text: 'kaju barfi', shop, now: new Date().toISOString(), photo_file_id: 'BIG' };
  const listener = { ok: true, intent: 'new_post', product_en: 'Kaju barfi', price: '₹400/kg' };
  const strat = { ok: true, angle: 'festival', reason: 'Bhai Phonta in 4 days', show_price: true };
  const copy = { ok: true, headline_bn: 'ভাইফোঁটার মিষ্টিমুখ', caption_bn: 'x', caption_en: 'y', price_text: '₹400/কেজি', hashtags: [] };
  const nodes = { 'Decide next step': [{ json: dNew }], 'Photo to base64': [{ json: { photo_mime: 'image/jpeg', photo_b64: 'AAAA' } }], 'Transcribe voice': [{ json: { text: 'notun kaju barfi char sho taka kilo' } }],
    'Parse Listener JSON': [{ json: listener }], 'Parse Strategist JSON': [{ json: strat }], 'Parse Copywriter JSON': [{ json: copy }] };
  const l = await run('05_listener_request.js', nodes); show('listener body', { types: l[0].json.body.messages[0].content.map(c => c.type), text: l[0].json.body.messages[0].content[1].text, sys: l[0].json.body.system.slice(0, 60) });
  const s = await run('15_strategist_input.js', nodes); show('strategist prompt', s[0].json.prompt);
  const c = await run('13_copywriter_request.js', nodes); show('copywriter new', JSON.parse(c[0].json.body.messages[0].content[0].text.split('\nReturn')[0]));
  // edit path
  const saved = { post_id: 'p1', created_at: '2026-11-07T10:00:00Z', listener_json: JSON.stringify(listener), strategy_json: JSON.stringify(strat), copy_json: JSON.stringify(copy), photo_file_id: 'BIG' };
  const eNodes = { 'Decide next step': [{ json: { ...dNew, next: 'edit_post', text: '' } }], 'Get post': [{ json: saved }], 'Transcribe voice': [{ json: { text: 'english kom koro, dam ta boro koro' } }],
    'Parse Memory JSON': [{ json: { ok: true, is_lasting: true, new_style_notes: 'Max 2 emojis. Less English. Big price.', change_request: 'less English, bigger price' } }], 'Parse Copywriter JSON': [{ json: copy }], 'Photo to base64': [{ json: { photo_mime: 'image/jpeg', photo_b64: 'AAAA' } }] };
  const m = await run('14_memory_request.js', eNodes); show('memory input', m[0].json.body.messages[0].content[0].text);
  const ce = await run('13_copywriter_request.js', eNodes); const cej = JSON.parse(ce[0].json.body.messages[0].content[0].text.split('\nReturn')[0]); show('copywriter edit', { style: cej.style_notes, change: cej.change_request, prev: !!cej.previous_version, plan: cej.plan });
  const pe = await run('08_build_poster.js', eNodes); show('poster on edit', { kb: pe[0].json.html_kb, priceShown: /display:flex/.test(pe[0].json.hcti.html) });
  const pv = await run('09_build_preview.js', eNodes); show('preview on edit', { created: pv[0].json.row.created_at, angle: pv[0].json.row.angle, status: pv[0].json.row.status });
  // analyst + nudge
  const iNodes = { 'Start': [{ json: { for_chat: '555', mode: 'report' } }], 'Get shops': [{ json: shop }], 'Analyst stats': [{ json: { stats: { posts_analysed: 10 } } }] };
  const a = await run('16_analyst_request.js', iNodes); show('analyst input', JSON.parse(a[0].json.body.messages[0].content[0].text.split('\nReturn')[0]));
  const n = await run('17_nudge_request.js', {}, [], { chat_id: '555', shop, festival: { date: '2026-11-08', en: 'Kali Puja / Diwali', in_days: 1 }, recent_products: ['Rosogolla'] });
  show('nudge each', { chat: n.json.chat_id, txt: n.json.body.messages[0].content[0].text.slice(0, 200) });
  const pr = await run('06_parse_llm_json.js', {}, [{ json: { content: [{ text: '{"message":"hi"}' }] } }, { json: { output: 'oops' } }]); show('parse multi', pr);
})().catch(e => { console.error('ERR', e); process.exit(1); });
