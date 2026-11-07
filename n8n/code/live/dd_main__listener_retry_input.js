// Live code from n8n workflow 'DD Main (Dukaan Digital bot)', node 'Listener retry input'.
// The error branch drops the photo, so take the original request item (with the photo) again.
const src = $('Build Listener request').first();
return [{ json: src.json, binary: src.binary }];
