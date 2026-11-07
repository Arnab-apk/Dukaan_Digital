// Minimal mock of the n8n Code-node runtime to exercise the kit's scripts.
const fs = require('fs');
const path = require('path');
const CODE = process.argv[2] || path.join(__dirname, '../n8n/code');
const OUT = process.argv[3] || path.join(__dirname, 'out');

function load(name) { return fs.readFileSync(path.join(CODE, name), 'utf8'); }
async function run(name, nodes, input = [], extra = {}) {
  const $ = n => {
    if (!(n in nodes)) throw new Error(`Node '${n}' hasn't been executed`);
    const items = nodes[n];
    return { first: () => items[0], all: () => items, item: items[0] };
  };
  const $input = { first: () => input[0], all: () => input, item: input[0] };
  const helpers = { getBinaryDataBuffer: async (i, key) => Buffer.from(input[i].binary[key].__data, 'base64') };
  const fn = new Function('$', '$input', 'query', `return (async function(){ ${load(name)} }).call(this);`);
  return await fn.call({ helpers }, $, $input, extra.query);
}

(async () => {
  const log = (t, v) => console.log(`\n=== ${t} ===\n` + (typeof v === 'string' ? v : JSON.stringify(v, null, 2)).slice(0, 1500));
  // 01 route: photo with caption
  const upd = { update_id: 1, message: { chat: { id: 555 }, from: { first_name: 'Arnab' }, caption: 'kaju barfi 400 taka kilo', photo: [{ file_id: 'small' }, { file_id: 'BIG' }] } };
  const r1 = await run('01_route_update.js', {}, [{ json: upd }]); log('route photo+caption', r1);
  const cb = { callback_query: { id: 'cb1', data: 'post:ab12cd34', message: { message_id: 9, chat: { id: 555 } } } };
  log('route button', await run('01_route_update.js', {}, [{ json: cb }]));
  log('route command', await run('01_route_update.js', {}, [{ json: { message: { chat: { id: 555 }, text: '/report@DukaanBot' } } }]));
  log('route voice', await run('01_route_update.js', {}, [{ json: { message: { chat: { id: 555 }, voice: { file_id: 'V1' } } } }]));

  // 02 decide
  const shop = { chat_id: '555', shop_name_en: 'Maa Annapurna Mishtanna Bhandar', shop_name_bn: 'মা অন্নপূর্ণা মিষ্টান্ন ভাণ্ডার', area: 'Adisaptagram, Hooghly', phone: '98300 00000', brand_color: '#8B1E3F', accent_color: '#F2A93B', fb_page_id: 'REPLACE_WITH_FB_PAGE_ID', channel_id: '@maa_annapurna' };
  const d1 = await run('02_decide_next_step.js', { 'Route update': r1, 'Get shop': [{ json: shop }], 'Get latest post': [{ json: {} }] });
  log('decide photo+caption', d1);
  const rv = await run('01_route_update.js', {}, [{ json: { message: { chat: { id: 555 }, voice: { file_id: 'V1' } } } }]);
  const dv = await run('02_decide_next_step.js', { 'Route update': rv, 'Get shop': [{ json: shop }], 'Get latest post': [{ json: { post_id: 'zz', status: 'collecting', created_at: new Date().toISOString(), photo_file_id: 'BIG' } }] });
  log('decide voice after photo', { next: dv[0].json.next, post_id: dv[0].json.post_id, photo: dv[0].json.photo_file_id });
  const dn = await run('02_decide_next_step.js', { 'Route update': r1, 'Get shop': [{ json: {} }], 'Get latest post': [{ json: {} }] });
  log('decide unknown shop', dn[0].json.next);

  // 03 voice fix
  const vitem = { json: {}, binary: { data: { fileName: 'file_0.oga', mimeType: 'audio/x-opus+ogg' } } };
  const fnV = new Function('$input', `return (async function(){ ${load('03_fix_voice_file.js')} })()`);
  log('fix voice', (await fnV({ item: vitem })).binary);

  // 04 photo
  const jpg = fs.readFileSync(path.join(__dirname, 'sample.jpg')).toString('base64');
  const p4 = await run('04_photo_to_base64.js', {}, [{ json: {}, binary: { data: { mimeType: 'image/jpeg', __data: jpg } } }]);
  log('photo kb', p4[0].json.photo_kb);

  // 06 parse
  const llm = { content: [{ type: 'text', text: '```json\n{"intent":"new_post","product_en":"Kaju barfi","price":"₹400/kg"}\n```' }] };
  log('parse ok', await run('06_parse_llm_json.js', {}, [{ json: llm }]));
  log('parse bad', await run('06_parse_llm_json.js', {}, [{ json: { content: [{ text: 'sorry I cannot' }] } }]));

  // 07 tool
  log('festival tool', await run('07_tool_upcoming_festivals.js', {}, [], { query: '10' }));

  // 08 poster
  const strat = { ok: true, angle: 'festival', festival_name_en: 'Bhai Phonta', show_price: true, badge_text_bn: 'ভাইফোঁটা স্পেশাল', reason: 'Bhai Phonta is in 4 days; festival posts with price did 3x better.' };
  const copy = { ok: true, headline_bn: 'ভাইফোঁটার মিষ্টিমুখ', subline_bn: 'টাটকা কাজু বরফি, আজই অর্ডার দিন', price_text: '₹400/কেজি', badge_bn: 'ভাইফোঁটা স্পেশাল', caption_bn: 'ভাইয়ের পাতে থাকুক সেরা মিষ্টি।\nনতুন কাজু বরফি এসে গেছে।', caption_en: 'Fresh kaju barfi for Bhai Phonta, ₹400/kg.', hashtags: ['#BhaiPhonta', '#Hooghly'], whatsapp_text: 'ভাইফোঁটার জন্য কাজু বরফি ₹400/কেজি। অর্ডার: 98300 00000' };
  const nodes = { 'Decide next step': [{ json: { ...d1[0].json, shop } }], 'Parse Copywriter JSON': [{ json: copy }], 'Parse Strategist JSON': [{ json: strat }], 'Photo to base64': p4, 'Parse Listener JSON': [{ json: { product_en: 'Kaju barfi', price: '₹400/kg' } }] };
  const p8 = await run('08_build_poster.js', nodes);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'poster_test.html'), '<!doctype html><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Poppins:wght@400;600&display=swap" rel="stylesheet"><body style="margin:0">' + p8[0].json.hcti.html);
  log('poster html kb', p8[0].json.html_kb);
  const unfilled = p8[0].json.hcti.html.match(/\{\{\w+\}\}/g); log('unfilled placeholders', unfilled || 'none');

  // 09 preview (with and without poster)
  nodes['Render poster'] = [{ json: { url: 'https://hcti.io/v1/image/abc' } }];
  const p9 = await run('09_build_preview.js', nodes); log('preview', { caption: p9[0].json.caption, len: p9[0].json.caption.length, kb: p9[0].json.reply_markup, row: p9[0].json.row.status });
  delete nodes['Render poster'];
  const p9b = await run('09_build_preview.js', nodes); log('preview fallback photo', { photo: p9b[0].json.photo, file: p9b[0].json.photo_file_id });

  // 10 publish
  const postRow = { ...p9[0].json.row, copy_json: JSON.stringify(copy) };
  const p10 = await run('10_publish_prepare.js', { 'Get post': [{ json: postRow }], 'Get shop': [{ json: shop }] });
  log('publish', { already: p10[0].json.already, fb_enabled: p10[0].json.fb_enabled, wa_len: p10[0].json.whatsapp_url.length, cap: p10[0].json.public_caption.length });
  const p10b = await run('10_publish_prepare.js', { 'Get post': [{ json: { ...postRow, status: 'posted', image_url: '' } }], 'Get shop': [{ json: { ...shop, fb_page_id: '123' } }] });
  log('publish after render failure + double tap', { already: p10b[0].json.already, fb_enabled: p10b[0].json.fb_enabled, photo: p10b[0].json.image_url || p10b[0].json.photo_file_id });
  // latest-post sorting with seed rows that have no updated_at ordering guarantees
  const rr = await run('01_route_update.js', {}, [{ json: { message: { chat: { id: 555 }, voice: { file_id: 'V2' } } } }]);
  const many = [{ json: { post_id: 'seed01', status: 'posted', created_at: '2026-09-20', updated_at: '2026-09-20' } }, { json: { post_id: 'new1', status: 'collecting', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), photo_file_id: 'P9' } }, { json: { post_id: 'seed02', status: 'posted', created_at: '2026-09-27' } }];
  const dd = await run('02_decide_next_step.js', { 'Route update': rr, 'Get shop': [{ json: shop }], 'Get latest post': many });
  log('decide picks newest row', { next: dd[0].json.next, post_id: dd[0].json.post_id, photo: dd[0].json.photo_file_id });
  const rh = await run('01_route_update.js', {}, [{ json: { message: { chat: { id: 555 }, text: '/help' } } }]);
  log('decide /help', (await run('02_decide_next_step.js', { 'Route update': rh, 'Get shop': [{ json: shop }], 'Get latest post': [{ json: {} }] }))[0].json.next);
  const ri = await run('01_route_update.js', {}, [{ json: { channel_post: {} } }]);
  log('decide ignore', (await run('02_decide_next_step.js', { 'Route update': ri, 'Get shop': [{ json: {} }], 'Get latest post': [{ json: {} }] }))[0].json.next);
  const amp = await run('09_build_preview.js', { ...nodes, 'Parse Copywriter JSON': [{ json: { ...copy, caption_bn: '&'.repeat(1200) } }] });
  log('caption with many & stays valid', { len: amp[0].json.caption.length, brokenEntity: /&a?m?p?$|&am(?!p;)/.test(amp[0].json.caption) });

  // 11 analyst on seed csv
  const csv = fs.readFileSync(path.join(CODE, '../../data/posts_seed.csv'), 'utf8').trim().split('\n');
  const head = csv[0].split(',');
  const rows = csv.slice(1).map(l => { const v = l.split(','); return { json: Object.fromEntries(head.map((h, i) => [h, v[i]])) }; });
  log('analyst stats', await run('11_analyst_stats.js', {}, rows));

  // 12 nudge (forced for demo + scheduled)
  const posts = rows.map(r => ({ json: { ...r.json, chat_id: '555' } }));
  log('nudge forced', await run('12_nudge_check.js', { 'Start': [{ json: { for_chat: '555' } }], 'Get shops': [{ json: shop }], 'Get recent posts': posts }));
  log('nudge scheduled', await run('12_nudge_check.js', { 'Start': [{ json: { for_chat: '' } }], 'Get shops': [{ json: shop }], 'Get recent posts': posts }));
  const postedKali = [...posts, { json: { post_id: 'k1', chat_id: '555', status: 'posted', festival: 'Kali Puja', product: 'Kaju barfi' } }];
  log('nudge scheduled after posting for Kali Puja (expect empty)', await run('12_nudge_check.js', { 'Start': [{ json: { for_chat: '' } }], 'Get shops': [{ json: shop }], 'Get recent posts': postedKali }));
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(1); });
