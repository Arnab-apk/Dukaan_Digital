// n8n Code node: "Fix voice file"   (Mode: Run Once for Each Item)
// Put between Telegram "Get File" (Download: ON) for the voice note and the OpenAI "Transcribe a recording" node.
// Telegram voice notes are OGG/Opus but arrive named "file_0.oga"; OpenAI rejects the .oga extension.
const bin = $input.item.binary;
const key = Object.keys(bin || {})[0]; // usually 'data'
if (!key) throw new Error('No voice file was downloaded. Check that "Download" is ON in the Get File node.');
bin[key].fileName = 'voice.ogg';
bin[key].fileExtension = 'ogg';
bin[key].mimeType = 'audio/ogg';
if (key !== 'data') { bin.data = bin[key]; delete bin[key]; }
return $input.item;
