"""Regenerates n8n/code/08_build_poster.js from templates/poster.html + tools/build_poster_body.js.
Usage (from the Dukaan_Digital folder): python tools/gen_poster_js.py .
"""
import json, pathlib, sys

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")
tpl = (root / 'templates/poster.html').read_text(encoding='utf-8')
if tpl.lstrip().startswith('<!--'):
    tpl = tpl[tpl.index('-->') + 3:].lstrip()
body = (root / 'tools/build_poster_body.js').read_text(encoding='utf-8')
out = body.replace('__TEMPLATE__', json.dumps(tpl, ensure_ascii=False))
(root / 'n8n/code/08_build_poster.js').write_text(out, encoding='utf-8')
print('ok', len(out))
