// n8n Code node: "Nudge check"   (Mode: Run Once for All Items)
// Runs on the daily Schedule Trigger (e.g. 9:00 Asia/Kolkata) and on the /nudge demo command.
// Workflow shape: [Schedule Trigger] and [When Executed by Another Workflow (input: chat_id)] both -> Set node "Start"
//   (field for_chat = {{ $json.chat_id || '' }}) -> 'Get shops' (all dd_shops rows) -> 'Get recent posts' (dd_posts rows,
//   Return All; set "Execute Once" ON) -> this node.  The main bot's /nudge command calls this workflow with its chat_id.
// Output: one item per shop that should be nudged, with the festival it's about. Zero items = nothing to do.
// The decision is made here in code; the Nudge model only writes the friendly message.

const WINDOW_DAYS = 3;  // nudge when a festival is 0-3 days away
const forChat = (() => { try { return String($('Start').first().json.for_chat || ''); } catch (e) { return ''; } })();
const FORCE = !!forChat; // demo command: only this shop, even if it already posted for the festival

const FESTIVALS = [
  ['2026-11-08', 'Kali Puja / Diwali', 'কালীপুজো / দীপাবলি', 'sweets, diyas, lights, gift boxes'],
  ['2026-11-11', 'Bhai Phonta', 'ভাইফোঁটা', 'sweets, gift boxes, phonta thali, sarees, shirts'],
  ['2026-11-14', "Children's Day", 'শিশু দিবস', 'chocolates, cakes, toys, stationery'],
  ['2026-11-15', 'Chhath Puja', 'ছট পুজো', 'thekua, fruits, sugarcane, puja items'],
  ['2026-11-18', 'Jagaddhatri Puja', 'জগদ্ধাত্রী পুজো', 'sweets, new clothes, lights'],
  ['2026-11-24', 'Guru Nanak Jayanti', 'গুরু নানক জয়ন্তী', 'sweets'],
  ['2026-12-25', 'Christmas', 'বড়দিন', 'cakes, plum cake, gifts, decorations'],
  ['2027-01-01', 'New Year', 'ইংরেজি নববর্ষ', 'cakes, gifts, party orders'],
  ['2027-01-26', 'Republic Day', 'প্রজাতন্ত্র দিবস', 'tricolour sweets, school supplies'],
  ['2027-02-14', "Valentine's Day", 'ভ্যালেন্টাইনস ডে', 'cakes, chocolates, flowers, gifts'],
];

const todayIST = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
const t0 = Date.parse(todayIST);
const upcoming = FESTIVALS
  .map(([date, en, bn, products]) => ({ date, en, bn, products, in_days: Math.round((Date.parse(date) - t0) / 86400000) }))
  .filter(f => f.in_days >= 0 && f.in_days <= 30);
const inWindow = upcoming.filter(f => f.in_days <= WINDOW_DAYS);
// Festival names differ slightly ("Kali Puja" vs "Kali Puja / Diwali"), so match on any shared word group.
const sameFest = (a, b) => {
  const parts = s => String(s || '').toLowerCase().split('/').map(x => x.trim()).filter(Boolean);
  return parts(a).some(x => parts(b).some(y => x.includes(y) || y.includes(x)));
};

const shops = $('Get shops').all().map(i => i.json).filter(s => s.chat_id && s.chat_id !== 'PENDING' && !/REPLACE/.test(s.chat_id));
const posts = $('Get recent posts').all().map(i => i.json).filter(p => p.post_id);

const out = [];
for (const shop of shops) {
  if (FORCE && String(shop.chat_id) !== forChat) continue;
  const mine = posts.filter(p => String(p.chat_id) === String(shop.chat_id));
  const alreadyPosted = f => mine.some(p => p.status === 'posted' && sameFest(p.festival, f.en));
  // Demo command: next festival within 30 days. Daily schedule: within 3 days and not yet posted for.
  const fest = FORCE ? (inWindow[0] || upcoming[0]) : inWindow.find(f => !alreadyPosted(f));
  if (!fest) continue;
  out.push({
    json: {
      chat_id: shop.chat_id,
      shop,
      festival: fest,
      recent_products: mine.slice(-5).map(p => p.product).filter(Boolean),
    },
  });
}
return out;
