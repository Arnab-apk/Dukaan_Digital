// Live code from n8n workflow 'DD Insights (Analyst + festival nudge)', node 'Build Analyst request'.
const MAX_TOKENS = 1200;
const forChat = String($('Start').first().json.for_chat || '');
const shop = $('Get shops').all().map(i => i.json).find(s => String(s.chat_id) === forChat) || {};
const lang = (shop.languages === 'bn' || shop.languages === 'en') ? shop.languages : 'mixed';
const LANG_RULE = { bn: 'Write it in simple Bengali only.', en: 'Write it in simple English only.', mixed: 'Bengali first, simple words, then a 1-2 line English summary.' }[lang];
const SYSTEM = `You are the Analyst for a small business's marketing assistant (Dukaan Digital). You get pre-computed statistics about the business's recent posts and the list of upcoming festivals.

Write a short weekly report for the owner:
- ${LANG_RULE}
- 3 findings max, each tied to a number from the stats (quote the number exactly as given; never compute new numbers).
- 1 concrete next action, tied to a real upcoming festival from the list (with its date) and a product or service that fits this business type.
- If the stats include seeded demo data, do not hide it; add "(demo data)" after any finding based on it.
- Telegram message limit: under 900 characters total.

Also produce an "insights" line to save into memory for the Strategist (max 250 characters, English, e.g. "Festival posts with price on poster get ~3x reactions; plain restock posts do poorly").

Return ONLY valid JSON:
{
  "report_text": "the Telegram message for the owner",
  "insights": "max 250 chars, for memory",
  "next_festival": "name and date, or null"
}`;
const stats = $('Analyst stats').first().json.stats;
const t0 = Date.parse(new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10));
const FEST = [['2026-11-08','Kali Puja / Diwali'],['2026-11-11','Bhai Phonta'],['2026-11-14',"Children's Day"],['2026-11-15','Chhath Puja'],
  ['2026-11-18','Jagaddhatri Puja'],['2026-11-24','Guru Nanak Jayanti'],['2026-12-25','Christmas'],['2027-01-01','New Year'],['2027-01-26','Republic Day'],['2027-02-14',"Valentine's Day"]];
const upcoming = FEST.map(([date, name]) => ({ date, name, in_days: Math.round((Date.parse(date) - t0) / 864e5) })).filter(f => f.in_days >= 0 && f.in_days <= 14);
const facts = { shop: { name_bn: shop.shop_name_bn, name_en: shop.shop_name_en, type: shop.shop_type }, stats, upcoming_festivals: upcoming };
const user = JSON.stringify(facts, null, 2) + '\nReturn the JSON now.';
return [{ json: { agent: 'analyst', system: SYSTEM, user, max_tokens: MAX_TOKENS } }];
