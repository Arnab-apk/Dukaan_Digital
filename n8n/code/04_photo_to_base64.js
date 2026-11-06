// n8n Code node: "Photo to base64"   (Mode: Run Once for All Items)
// Put after Telegram "Get File" (Download: ON) for the product photo.
// Later nodes read it with:  $('Photo to base64').first().json.photo_b64
const item = $input.first();
const key = Object.keys(item.binary || {})[0];
if (!key) throw new Error('No photo was downloaded. Check that "Download" is ON in the Get File node.');
const buf = await this.helpers.getBinaryDataBuffer(0, key);
let mime = item.binary[key].mimeType || 'image/jpeg';
if (!/^image\/(jpeg|png|webp|gif)$/.test(mime)) mime = 'image/jpeg'; // Telegram photos are JPEG
const kb = Math.round(buf.length / 1024);
if (kb > 4500) throw new Error(`Photo is ${kb} KB; ask the owner to send it as a normal photo, not as a file.`);
return [{ json: { photo_b64: buf.toString('base64'), photo_mime: mime, photo_kb: kb } }];
