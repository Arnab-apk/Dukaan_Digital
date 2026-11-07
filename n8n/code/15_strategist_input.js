// n8n Code node: "Build Strategist input"   (Mode: Run Once for All Items)
// NEW-post path, after "Parse Listener JSON". Next: AI Agent node named "Strategist":
//   Source for Prompt: Define below -> Prompt (User Message) = {{ $json.prompt }}
//   Options -> System Message = the text in prompts/02_strategist.md below the --- line (also in STRATEGIST_SYSTEM here, for copy-paste)
//   Chat Model: Anthropic Chat Model (model claude-sonnet-5-5), credential = your Anthropic key
//   Tools: Code Tool "upcoming_festivals" (07_tool_upcoming_festivals.js)
//          Data table tool "past_post_results" on dd_posts (Get rows, chat_id = this chat, status = posted), if your n8n offers it.
//          If not, PAST_RESULTS below is filled from a 'Get past posts' node placed before this one.
// Then "Parse Strategist JSON" (06_parse_llm_json.js with REQUIRED = ['angle','reason']).


const d = $('Decide next step').first().json;
const shop = d.shop || {};
const listener = $('Parse Listener JSON').first().json;
const normLang = v => (v === 'bn' || v === 'en') ? v : 'mixed';
const today = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);

let PAST_RESULTS = 'Use the past_post_results tool.';
try {
  const rows = $('Get past posts').all().map(i => i.json).filter(r => r.post_id && r.status === 'posted');
  PAST_RESULTS = JSON.stringify(rows.slice(-15).map(r => ({ date: String(r.created_at).slice(0, 10), product: r.product, angle: r.angle,
    festival: r.festival || null, price_on_poster: r.has_price_on_poster, reactions: Number(r.reactions) || 0, comments: Number(r.comments) || 0,
    shares: Number(r.shares) || 0, source: r.source })));
} catch (e) { /* tool mode */ }

const prompt = [
  `Today is ${today} (India).`,
  `Shop profile: ${JSON.stringify({ name_bn: shop.shop_name_bn, name_en: shop.shop_name_en, type: shop.shop_type, area: shop.area, tone: shop.tone })}`,
  `Language setting for posts: ${normLang(shop.languages)}`,
  `Style notes from the owner's past edits: ${shop.style_notes || '(none yet)'}`,
  `Insights from the Analyst: ${shop.insights || '(none yet)'}`,
  `Past post results: ${PAST_RESULTS}`,
  `What the owner just sent (Listener JSON): ${JSON.stringify(listener)}`,
  'Use your tools, then return the JSON.',
].join('\n');

return [{ json: { prompt } }];
