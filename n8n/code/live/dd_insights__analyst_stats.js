// Live code from n8n workflow 'DD Insights (Analyst + festival nudge)', node 'Analyst stats'.
const forChat = (() => { try { return String($('Start').first().json.for_chat || ''); } catch (e) { return ''; } })();
const rows = $input.all().map(i => i.json).filter(r => r && r.post_id && r.status === 'posted' && (!forChat || String(r.chat_id) === forChat));
const num = v => Number(v) || 0;
const eng = r => num(r.reactions) + 2 * num(r.comments) + 3 * num(r.shares);
const avg = a => (a.length ? Math.round(a.reduce((s, r) => s + eng(r), 0) / a.length) : null);

function groupBy(key) {
  const g = {};
  for (const r of rows) { const k = r[key] || 'none'; (g[k] = g[k] || []).push(r); }
  return Object.fromEntries(Object.entries(g).map(([k, a]) => [k, { posts: a.length, avg_engagement: avg(a) }]));
}

const festival = rows.filter(r => r.angle === 'festival');
const nonFestival = rows.filter(r => r.angle !== 'festival');
const withPrice = rows.filter(r => r.has_price_on_poster === 'yes');
const noPrice = rows.filter(r => r.has_price_on_poster !== 'yes');
const ratio = (a, b) => (a && b ? Math.round((a / b) * 10) / 10 : null);
const best = [...rows].sort((a, b) => eng(b) - eng(a))[0] || null;

const stats = {
  posts_analysed: rows.length,
  seeded_demo_posts: rows.filter(r => r.source === 'seeded_demo').length,
  live_posts: rows.filter(r => r.source !== 'seeded_demo').length,
  avg_engagement_all: avg(rows),
  by_angle: groupBy('angle'),
  festival_vs_other: { festival: avg(festival), other: avg(nonFestival), ratio: ratio(avg(festival), avg(nonFestival)) },
  price_on_poster: { with_price: avg(withPrice), without_price: avg(noPrice), ratio: ratio(avg(withPrice), avg(noPrice)) },
  best_post: best ? { product: best.product, angle: best.angle, festival: best.festival || null, engagement: eng(best), date: String(best.created_at).slice(0, 10) } : null,
  engagement_formula: 'reactions + 2*comments + 3*shares',
};

return [{ json: { stats } }];
