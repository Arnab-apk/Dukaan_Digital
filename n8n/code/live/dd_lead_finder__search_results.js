// Live code from n8n workflow 'DD Lead Finder', node 'Search results'.
const seen = new Set();
const rows = [];
for (const it of $input.all()) {
  const r = it.json || {};
  if (!r.osm_id || r.error) continue;
  const name = (r.namedetails && r.namedetails.name) || r.name || String(r.display_name || '').split(',')[0];
  if (!name) continue;
  const key = r.osm_type + r.osm_id;
  if (seen.has(key)) continue; seen.add(key);
  const t = r.extratags || {};
  const phone = t.phone || t['contact:phone'] || t['contact:mobile'] || '';
  const email = t.email || t['contact:email'] || '';
  const web = t.website || t['contact:website'] || t['contact:facebook'] || '';
  rows.push({ name, kind: r.type || r.class || '', phone, email, web, addr: String(r.display_name || '').split(',').slice(1, 4).join(',').trim(), url: `https://www.openstreetmap.org/${r.osm_type}/${r.osm_id}`, score: (phone ? 2 : 0) + (email ? 2 : 0) + (web ? 1 : 0) });
}
rows.sort((a, b) => b.score - a.score);
const top = rows.slice(0, 40);
return [{ json: { count: top.length, results_text: top.map((r, i) => `${i + 1}. ${r.name} | type: ${r.kind} | phone: ${r.phone || '-'} | email: ${r.email || '-'} | website: ${r.web || '-'} | address: ${r.addr || '-'} | listing: ${r.url}`).join('\n') || '(no results)' } }];
