// Live code from n8n workflow 'DD Main (Dukaan Digital bot)', node 'Fix voice file'.
const bin = $input.item.binary;
const key = Object.keys(bin || {})[0];
if (!key) throw new Error('No voice file was downloaded.');
bin[key].fileName = 'voice.ogg';
bin[key].fileExtension = 'ogg';
bin[key].mimeType = 'audio/ogg';
if (key !== 'data') { bin.data = bin[key]; delete bin[key]; }
return $input.item;
