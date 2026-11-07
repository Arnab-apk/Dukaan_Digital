// Live code from n8n workflow 'DD Lead Finder', node 'Build lead summary'.
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const all = $('Clean leads').all().map(i => i.json).filter(l => l.lead_id);
const inp = $('Called by DD Main').first().json;
const plan = (() => { try { return $('Search plan').first().json; } catch (e) { return {}; } })();
const area = plan.area || inp.area || 'your area';
const mode = inp.mode || 'custom';
const title = { customers: '🎯 Customer leads', competitors: '🔍 Competitor research', custom: '🔎 Leads' }[mode] || '🔎 Leads';
if (!all.length) {
  const what = mode === 'customers' ? 'matching organisations' : `${esc(plan.type || inp.shop_type || 'similar')} businesses`;
  return [{ json: { text: `${title}: OpenStreetMap has no ${what} mapped near ${esc(area)} yet, so I didn't list any (I never make up businesses).\n\nTry 🎯 Customers, or a wider area, e.g. /leads ${esc(plan.type || inp.shop_type || 'shop')} in Kolkata` } }];
}
const summary = all[0].summary ? `<i>${esc(all[0].summary)}</i>\n\n` : '';
const lines = all.slice(0, 8).map((l, i) => {
  const contact = [l.phone ? '📞 ' + esc(l.phone) : '', l.email ? '✉️ ' + esc(l.email) : '', l.website ? '🌐 ' + esc(l.website) : ''].filter(Boolean).join(' · ') || 'no contact published';
  return `${i + 1}. <b>${esc(l.business_name)}</b>${l.area ? ' · ' + esc(l.area) : ''}\n   ${contact}\n   ${esc(l.why)} <a href="${esc(l.source_url)}">source</a>`;
});
const foot = mode === 'customers' ? 'Opening messages for each are saved in dd_leads. Contact them one by one; please don\'t bulk-message.' : mode === 'competitors' ? 'Source: OpenStreetMap listings. Saved to dd_leads.' : 'Saved to dd_leads with an opener for each.';
let text = `${title} · ${esc(area)}\n\n${summary}${lines.join('\n\n')}\n\n${foot}`;
if (text.length > 4000) text = text.slice(0, 3990) + '…';
return [{ json: { text } }];
