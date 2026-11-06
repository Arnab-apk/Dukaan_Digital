// n8n "Code Tool" attached to the Strategist AI Agent.
// Tool name: upcoming_festivals
// Description (paste into the tool's Description field):
//   "Returns festivals in the next N days with their exact dates and typical products.
//    Input: a number of days to look ahead (default 10). Always use these dates; never guess festival dates."
// Language: JavaScript. The agent's input arrives as `query`.
// Same rows as data/festivals.csv (verified dates; Poush Sankranti is approximate).

const FESTIVALS = [
  ['2026-11-08', 'Kali Puja / Diwali', 'কালীপুজো / দীপাবলি', 'sweets, diyas, lights, gift boxes'],
  ['2026-11-11', 'Bhai Phonta', 'ভাইফোঁটা', 'sweets, gift boxes, phonta thali, sarees, shirts'],
  ['2026-11-14', "Children's Day", 'শিশু দিবস', 'chocolates, cakes, toys, stationery'],
  ['2026-11-15', 'Chhath Puja', 'ছট পুজো', 'thekua, fruits, sugarcane, puja items'],
  ['2026-11-18', 'Jagaddhatri Puja', 'জগদ্ধাত্রী পুজো', 'sweets, new clothes, lights (big in Chandannagar, Hooghly)'],
  ['2026-11-24', 'Guru Nanak Jayanti', 'গুরু নানক জয়ন্তী', 'sweets'],
  ['2026-12-25', 'Christmas', 'বড়দিন', 'cakes, plum cake, gifts, decorations'],
  ['2027-01-01', 'New Year', 'ইংরেজি নববর্ষ', 'cakes, gifts, party orders'],
  ['2027-01-14', 'Poush Sankranti (approx. date, confirm)', 'পৌষ সংক্রান্তি', 'pithe, patali gur, nolen gur sweets'],
  ['2027-01-26', 'Republic Day', 'প্রজাতন্ত্র দিবস', 'tricolour sweets, school supplies'],
  ['2027-02-14', "Valentine's Day", 'ভ্যালেন্টাইনস ডে', 'cakes, chocolates, flowers, gifts'],
];

const days = Math.min(Math.max(parseInt(String(query || '10').match(/\d+/)?.[0] || '10', 10), 1), 60);
// Use India time for "today".
const todayIST = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
const t0 = Date.parse(todayIST);

const hits = FESTIVALS
  .map(([date, en, bn, products]) => ({ date, en, bn, products, in_days: Math.round((Date.parse(date) - t0) / 86400000) }))
  .filter(f => f.in_days >= 0 && f.in_days <= days);

if (!hits.length) return `Today is ${todayIST}. No festivals in the next ${days} days.`;
return `Today is ${todayIST}. Festivals in the next ${days} days:\n` +
  hits.map(f => `- ${f.date} (${f.in_days === 0 ? 'today' : 'in ' + f.in_days + (f.in_days === 1 ? ' day' : ' days')}): ${f.en} / ${f.bn}. Typical products: ${f.products}`).join('\n');
