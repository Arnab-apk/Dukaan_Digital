// Runs the n8n Code node scripts against sample data with a mock n8n runtime: new post, edit with design + language change,
// /setup parsing, analyst and nudge language rules. Usage: node tools/test_paths.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const CODE = process.argv[2] || path.join(__dirname, '../n8n/code');
const load = n => fs.readFileSync(path.join(CODE, n), 'utf8');
async function run(name, nodes, input = [], json = undefined) {
  const $ = n => { if (!(n in nodes)) throw new Error(`Node '${n}' hasn't been executed`); const it = nodes[n]; return { first: () => it[0], all: () => it, item: it[0] }; };
  const $input = { first: () => input[0], all: () => input, item: input[0] };
  const fn = new Function('$', '$input', '$json', `return (async function(){ ${load(name)} }).call(this);`);
  return await fn.call({ helpers: {} }, $, $input, json);
}
const ok = (t, cond) => { assert.ok(cond, t); console.log('  ok  ' + t); };
(async () => {
  const shop = { chat_id: '555', shop_name_en: 'Laboni Saree Ghar', shop_name_bn: 'লাবণী শাড়ি ঘর', shop_type: 'saree shop', area: 'Serampore', phone: '9830012345', tone: 'warm', languages: 'en', style_notes: 'Max 2 emojis.' };
  const dNew = { next: 'create_post', chat_id: '555', post_id: 'p1', text: 'new baluchari saree 2499', shop, now: new Date().toISOString(), photo_file_id: 'BIG' };
  const listener = { ok: true, intent: 'new_post', product_en: 'Baluchari saree', price: '₹2,499' };
  const strat = { ok: true, angle: 'festival', reason: 'Bhai Phonta in 4 days', show_price: true, design_theme: 'elegant' };
  const copy = { ok: true, headline_bn: 'New Baluchari Sarees', subline_bn: 'Perfect Bhai Phonta gift', caption_bn: 'x', caption_en: null, price_text: '🏷️ ₹2,499', hashtags: [] };
  const nodes = { 'Decide next step': [{ json: dNew }], 'Photo to base64': [{ json: { photo_mime: 'image/jpeg', photo_b64: 'AAAA' } }], 'Transcribe voice': [{ json: { text: '' } }],
    'Parse Listener JSON': [{ json: listener }], 'Parse Strategist JSON': [{ json: strat }], 'Parse Copywriter JSON': [{ json: copy }],
    'Render poster': [{ json: { url: 'https://hcti.io/v1/image/x' } }] };
  console.log('new post');
  const l = await run('05_listener_request.js', nodes); ok('listener sees business type', /Business type: saree shop/.test(l[0].json.user));
  const s = await run('15_strategist_input.js', nodes); ok('strategist gets language setting', /Language setting for posts: en/.test(s[0].json.prompt));
  const c = await run('13_copywriter_request.js', nodes); ok('copywriter language = en', JSON.parse(c[0].json.user.split('\nReturn')[0]).language === 'en');
  const p = await run('08_build_poster.js', { ...nodes, 'Build poster': [] }); ok('poster uses strategist theme', p[0].json.theme === 'elegant');
  ok('emoji removed from price', !/🏷/.test(p[0].json.hcti.html) && /₹2,499/.test(p[0].json.hcti.html));
  nodes['Build poster'] = [{ json: { theme: p[0].json.theme } }];
  const pv = await run('09_build_preview.js', nodes); ok('preview saves design', JSON.parse(pv[0].json.row.strategy_json).design_theme === 'elegant');
  ok('caption under 1024 chars', pv[0].json.caption.replace(/<[^>]+>/g, '').length <= 1024);
  console.log('edit: "make it simple and clean, and Bengali only"');
  const saved = { post_id: 'p1', created_at: '2026-11-07T10:00:00Z', listener_json: JSON.stringify(listener), strategy_json: JSON.stringify(strat), copy_json: JSON.stringify(copy), photo_file_id: 'BIG' };
  const mem = { ok: true, is_lasting: false, new_style_notes: 'Max 2 emojis.', change_request: 'simple and clean, Bengali only', design_theme: 'modern', language: 'bn' };
  const eNodes = { 'Decide next step': [{ json: { ...dNew, next: 'edit_post', text: 'make it simple and clean, Bengali only' } }], 'Get post': [{ json: saved }],
    'Parse Memory JSON': [{ json: mem }], 'Parse Copywriter JSON': [{ json: copy }], 'Photo to base64': [{ json: { photo_mime: 'image/jpeg', photo_b64: 'AAAA' } }] };
  const m = await run('14_memory_request.js', eNodes); ok('memory gets current language', JSON.parse(m[0].json.user.split('\nReturn')[0]).current_language === 'en');
  const ce = await run('13_copywriter_request.js', eNodes); const cej = JSON.parse(ce[0].json.user.split('\nReturn')[0]);
  ok('edit switches language to bn', cej.language === 'bn'); ok('edit keeps previous version', !!cej.previous_version);
  const pe = await run('08_build_poster.js', eNodes); ok('memory overrides design to modern', pe[0].json.theme === 'modern');
  console.log('/setup');
  const su = await run('18_parse_setup.js', { 'Decide next step': [{ json: { chat_id: '777', text: '/setup মিঠাই বেকারি | bakery | Bandel | 90000 11111', shop: null } }] });
  ok('setup parses Bengali name', su[0].json.ok && su[0].json.shop.shop_name_bn === 'মিঠাই বেকারি' && su[0].json.shop.phone === '90000 11111');
  const re = await run('18_parse_setup.js', { 'Decide next step': [{ json: { chat_id: '555', text: '/setup Laboni Saree Ghar | saree shop | Serampore', shop } }] });
  ok('re-setup keeps Bengali name and notes', re[0].json.shop.shop_name_bn === 'লাবণী শাড়ি ঘর' && re[0].json.shop.style_notes === 'Max 2 emojis.');
  const bad = await run('18_parse_setup.js', { 'Decide next step': [{ json: { chat_id: '555', text: '/setup', shop } }] }); ok('setup without details asks for usage', bad[0].json.ok === false);
  console.log('insights');
  const iNodes = { 'Start': [{ json: { for_chat: '555', mode: 'report' } }], 'Get shops': [{ json: shop }], 'Analyst stats': [{ json: { stats: { posts_analysed: 10 } } }] };
  const a = await run('16_analyst_request.js', iNodes); ok('analyst follows English setting', /simple English only/.test(a[0].json.system));
  const n = await run('17_nudge_request.js', {}, [], { chat_id: '555', shop: { ...shop, languages: 'bn' }, festival: { date: '2026-11-08', en: 'Kali Puja / Diwali', in_days: 1 }, recent_products: [] });
  ok('nudge follows Bengali setting', /Bengali only/.test(n.json.system));
  const pr = await run('06_parse_llm_json.js', {}, [{ json: { content: [{ text: '{"intent":"new_post","product_en":"saree"}' }] } }, { json: { output: 'oops' } }]);
  ok('parser handles good and bad output', pr[0].json.ok === true && pr[1].json.ok === false);
  console.log('all path checks passed');
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
