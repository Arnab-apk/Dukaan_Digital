// Live code from n8n workflow 'DD Main (Dukaan Digital bot)', node 'Photo to base64'.
const item = $input.first();
const key = Object.keys(item.binary || {})[0];
if (!key) throw new Error('No photo was downloaded.');
const buf = await this.helpers.getBinaryDataBuffer(0, key);
let mime = item.binary[key].mimeType || 'image/jpeg';
if (!/^image\/(jpeg|png|webp|gif)$/.test(mime)) mime = 'image/jpeg';
const kb = Math.round(buf.length / 1024);
if (kb > 4500) throw new Error(`Photo is ${kb} KB; send it as a normal photo, not as a file.`);
// Read width/height from the JPEG or PNG header (used to crop to the product).
function dims(b) {
  try {
    if (b[0] === 0x89 && b[1] === 0x50) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xFF) { i++; continue; }
      const m = b[i + 1];
      if ((m >= 0xC0 && m <= 0xC3) || (m >= 0xC5 && m <= 0xC7) || (m >= 0xC9 && m <= 0xCB) || (m >= 0xCD && m <= 0xCF)) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      i += 2 + b.readUInt16BE(i + 2);
    }
  } catch (e) {}
  return { w: 0, h: 0 };
}
const d = dims(buf);
return [{ json: { photo_b64: buf.toString('base64'), photo_mime: mime, photo_kb: kb, photo_w: d.w, photo_h: d.h } }];
