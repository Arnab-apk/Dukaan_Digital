import { workflow, node, trigger, newCredential, languageModel, tool, fromAi, expr } from "@n8n/workflow-sdk";

const called = trigger({ type: "n8n-nodes-base.executeWorkflowTrigger", version: 1.3, config: { name: "Called by DD Main", position: [0, 200],
  parameters: { inputSource: "workflowInputs", workflowInputs: { values: [{ name: "chat_id", type: "string" }, { name: "query", type: "string" }] } } },
  output: [{ chat_id: "1", query: "sweet shops Chandannagar" }] });

const leadModel = languageModel({ type: "@n8n/n8n-nodes-langchain.lmChatAnthropic", version: 1.6, config: { name: "Claude for Lead Finder", position: [220, 420],
  parameters: { model: { __rl: true, mode: "list", value: "claude-sonnet-5", cachedResultName: "Claude Sonnet 5" }, options: { maxTokensToSample: 6000 } } } });

const searchTool = tool({ type: "@brave/n8n-nodes-brave-search.braveSearchTool", version: 1.1, config: { name: "web_search", position: [380, 420],
  parameters: { operation: "web", query: fromAi("query", "Search query, e.g. 'sweet shop Chandannagar contact number'"), count: 10,
    additionalParameters: { country: "IN", result_filter: ["web", "locations"] } } } });

const scrapeTool = tool({ type: "@mendable/n8n-nodes-firecrawl.firecrawlTool", version: 1, config: { name: "read_webpage", position: [540, 420],
  parameters: { resource: "Scraping", operation: "scrape", descriptionType: "manual",
    toolDescription: "Reads one public web page (a business website, its contact page, or a business directory listing) and returns its text as markdown.",
    url: fromAi("url", "The full https URL of the business page to read") } } });

const agent = node({ type: "@n8n/n8n-nodes-langchain.agent", version: 3.1, config: { name: "Lead Finder", position: [300, 200], retryOnFail: true, maxTries: 2,
  parameters: { promptType: "define",
    text: expr("Find small local businesses for this request: {{ $json.query }}\nReturn the JSON now, after using your tools."),
    options: { maxIterations: 15, systemMessage: "You are the Lead Finder for Dukaan Digital, an AI growth partner for neighbourhood shops in India. You find small local businesses that would benefit from help with their social media posts, so the team can visit or call them.\n\nUse web_search to find businesses matching the request (try 2-4 searches: the business type + area, '+ contact number', '+ justdial', '+ facebook page'). Use read_webpage to open a business's own website or directory listing when it helps confirm contact details. Stop after about 10 good leads.\n\nRules:\n- Only record BUSINESS contact details that the business itself or a public business listing has published. Copy them exactly. Never guess or construct an email address or number.\n- Never collect personal social-media profiles, home addresses or details about individual people.\n- Every lead needs the source_url where its contact details appear. If no contact detail is published, set phone/email to null and still include the lead.\n- online_presence: one of 'none', 'listing only', 'social page', 'website'. Businesses with weaker online presence are better leads.\n- fit_score 1-10: higher for small independent shops with weak online presence that sell products suited to festival posts (sweets, clothes, gifts, bakeries).\n- opener_bn: a short, polite, 2-line Bengali opening line for an in-person visit or a phone call, mentioning the business by name. No pressure, no false claims.\n\nReturn ONLY valid JSON, no prose, no code fences:\n{\"leads\": [{\"business_name\": \"\", \"business_type\": \"\", \"area\": \"\", \"phone\": null, \"email\": null, \"website\": null, \"source_url\": \"\", \"online_presence\": \"\", \"fit_score\": 0, \"why\": \"one line\", \"opener_bn\": \"\"}]}" } },
  subnodes: { model: leadModel, tools: [searchTool, scrapeTool] } }, output: [{ output: "{}" }] });

const parse = node({ type: "n8n-nodes-base.code", version: 2, config: { name: "Clean leads", position: [520, 200], alwaysOutputData: true,
  parameters: { jsCode: "const j = $input.first().json;\nlet raw = typeof j.output === 'string' ? j.output : Array.isArray(j.output) ? j.output.map(c => c.text || '').join('') : JSON.stringify(j);\nraw = raw.replace(/```(?:json)?/gi, '');\nlet leads = [];\ntry { const a = raw.indexOf('{'), b = raw.lastIndexOf('}'); leads = JSON.parse(raw.slice(a, b + 1)).leads || []; } catch (e) { leads = []; }\nconst q = $('Called by DD Main').first().json.query || '';\nconst now = new Date().toISOString();\nconst seen = new Set();\nconst cleanPhone = p => { if (!p) return ''; const d = String(p).replace(/[^0-9+]/g, ''); return d.length >= 8 ? d : ''; };\nconst cleanEmail = e => (e && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(e).trim()) ? String(e).trim().toLowerCase() : '');\nconst out = [];\nfor (const l of leads) {\n  const name = String(l.business_name || '').trim();\n  if (!name || !l.source_url) continue;\n  const key = name.toLowerCase();\n  if (seen.has(key)) continue; seen.add(key);\n  out.push({ json: {\n    lead_id: Math.random().toString(36).slice(2, 10), found_at: now, search: q, business_name: name,\n    business_type: String(l.business_type || ''), area: String(l.area || ''), phone: cleanPhone(l.phone), email: cleanEmail(l.email),\n    website: String(l.website || ''), source_url: String(l.source_url), online_presence: String(l.online_presence || ''),\n    fit_score: Math.max(0, Math.min(10, Number(l.fit_score) || 0)), why: String(l.why || ''), opener_bn: String(l.opener_bn || ''),\n    status: 'new', do_not_contact: false,\n  } });\n}\nout.sort((a, b) => b.json.fit_score - a.json.fit_score);\nreturn out.slice(0, 12);\n" } },
  output: [{ lead_id: "x", business_name: "n", fit_score: 8 }] });

const rows = node({ type: "n8n-nodes-base.code", version: 2, config: { name: "Lead rows", position: [1400, 200],
  parameters: { jsCode: "return $('Clean leads').all().filter(i => i.json.lead_id).map(i => ({ json: i.json }));" } }, output: [{ lead_id: "x" }] });
const save = node({ type: "n8n-nodes-base.dataTable", version: 1.1, config: { name: "Save leads", position: [1620, 200],
  parameters: { resource: "row", operation: "insert", dataTableId: { __rl: true, mode: "id", value: "NIZvSdHKD58hzrZS", cachedResultName: "dd_leads" },
    columns: { mappingMode: "autoMapInputData", value: {} }, options: {} } }, output: [{ id: 1 }] });

const summary = node({ type: "n8n-nodes-base.code", version: 2, config: { name: "Build lead summary", position: [740, 200], executeOnce: true,
  parameters: { jsCode: "const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));\nconst leads = $('Clean leads').all().map(i => i.json).filter(l => l.lead_id);\nconst q = $('Called by DD Main').first().json.query || '';\nif (!leads.length) return [{ json: { text: `🔎 No leads found for \"${esc(q)}\". Try a different area or business type.` } }];\nconst lines = leads.slice(0, 10).map((l, i) => `${i + 1}. <b>${esc(l.business_name)}</b> (${esc(l.business_type)}, ${esc(l.area)})\\n   ⭐ fit ${l.fit_score}/10 · ${esc(l.online_presence)}\\n   📞 ${esc(l.phone || 'not published')}${l.email ? ' · ✉️ ' + esc(l.email) : ''}\\n   🔗 ${esc(l.source_url)}`);\nlet text = `🔎 <b>${leads.length} leads for \"${esc(q)}\"</b>\\n\\n` + lines.join('\\n\\n') + `\\n\\nSaved to dd_leads with a Bengali opening line for each. Visit or call them; please don't bulk-message.`;\nif (text.length > 4000) text = text.slice(0, 3990) + '…';\nreturn [{ json: { text } }];\n" } },
  output: [{ text: "t" }] });

const send = node({ type: "n8n-nodes-base.telegram", version: 1.2, config: { name: "Send leads", position: [960, 200],
  credentials: { telegramApi: newCredential("Telegram account") },
  parameters: { resource: "message", operation: "sendMessage", chatId: expr("{{ $('Called by DD Main').first().json.chat_id }}"), text: expr("{{ $json.text }}"),
    additionalFields: { appendAttribution: false, parse_mode: "HTML", disable_web_page_preview: true } } }, output: [{ ok: true }] });

export default workflow("dd-lead-finder", "DD Lead Finder")
  .add(called).to(agent).to(parse).to(summary).to(send).to(rows).to(save);
