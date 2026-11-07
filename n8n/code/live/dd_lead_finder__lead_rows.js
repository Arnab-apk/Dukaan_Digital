// Live code from n8n workflow 'DD Lead Finder', node 'Lead rows'.
return $('Clean leads').all().filter(i => i.json.lead_id).map(i => { const { summary, ...row } = i.json; return { json: row }; });