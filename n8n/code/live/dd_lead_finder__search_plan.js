// Live code from n8n workflow 'DD Lead Finder', node 'Search plan'.
const i = $input.first().json;
const mode = i.mode || 'custom';
let type = String(i.shop_type || 'shop').trim();
let area = i.area || 'Hooghly, West Bengal';
// OpenStreetMap place search understands its own category phrases, so map common business types to them.
const OSM = [[/sport/i, ['sports shop']], [/bottle|gift|sticker/i, ['gift shop', 'variety store']], [/mobile|phone/i, ['mobile phone shop', 'electronics shop']], [/saree|sari|cloth|garment|boutique|fashion/i, ['clothes shop', 'boutique']], [/sweet|mishti|mithai|confection/i, ['sweet shop', 'confectionery shop', 'pastry shop']], [/station|book|pen|xerox/i, ['stationery shop', 'book shop']], [/bak|cake/i, ['bakery', 'pastry shop']], [/electronic|gadget|computer/i, ['electronics shop', 'computer shop']], [/grocer|kirana|super|general/i, ['supermarket', 'convenience store']], [/jewel|gold/i, ['jewelry shop', 'jewellery shop']], [/salon|parlou?r|beauty|hair/i, ['hairdresser', 'beauty shop']], [/gym|fitness|supplement/i, ['fitness centre', 'gym']], [/cafe|coffee/i, ['cafe']], [/restaurant|food|caterer/i, ['restaurant']], [/pharma|medic|chemist/i, ['pharmacy']], [/shoe|footwear/i, ['shoe shop']]];
const words = t => { const hit = OSM.find(([re]) => re.test(t)); return hit ? hit[1] : [t.replace(/s$/i, '') + ' shop']; };
let qs;
if (mode === 'custom') {
  const q = String(i.query || '');
  const m = q.match(/^(.*?)\s+(?:in|near|at|around)\s+(.+)$/i);
  if (m) { type = m[1]; area = m[2]; } else type = q;
  const w = words(type);
  qs = [...w.map(x => `${x} in ${area}`), `${w[0]} near ${area}`];
} else if (mode === 'customers') {
  qs = [`school in ${area}`, `college in ${area}`, `hospital in ${area}`, `hotel in ${area}`, `office in ${area}`];
} else {
  const w = words(type);
  qs = [...w.map(x => `${x} in ${area}`), `${w[0]} near ${area}`, `${w[0]} in Hooghly`, `${w[0]} in Chandannagar`];
}
return qs.map(q => ({ json: { q, mode, area, type } }));
