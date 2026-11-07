# Dukaan Digital — Pitch Brief

**An AI growth partner for neighbourhood shops.**
Agentic Chase 2026 · PS05 Open Innovation · Built on n8n Cloud with Claude Code · AI: Google Gemini

---

## 1. One-line pitch

A shop owner sends **one product photo and a voice note in Bengali** to a Telegram bot. A team of AI agents turns it into a festival-aware social post and a professional poster, waits for the owner's approval, publishes it, and learns from every edit and every result.

## 2. The problem

- India has more than **7.3 crore MSMEs registered on Udyam** (MSME Ministry, 2025). Most neighbourhood shops are among them, and almost none can afford a marketing person.
- Their customers are on Facebook, Telegram and WhatsApp, but the owner is behind the counter all day. Posts are irregular, plain, and miss the moments that sell: Kali Puja, Bhai Phonta, Jagaddhatri Puja, Christmas.
- Existing tools (Canva, ChatGPT, Meta's own tools) still expect the owner to type in English, design, decide what to post and when, and remember what worked. That is the work they don't have time for.

## 3. The solution

Dukaan Digital behaves like a small marketing team that lives inside a chat the owner already uses:

| Owner does | Dukaan Digital does |
|---|---|
| Sends a photo of today's product | Listens, understands the product from the photo |
| Says the price or offer in a voice note | Checks the festival calendar and past results, decides what to post and why |
| Taps ✅ Post, ✏️ Change or ⏭ Skip | Writes the post, designs the poster, publishes only after approval |
| Says "make it more premium" or "less English" | Changes this post and remembers the preference for every future post |
| Nothing | Messages the owner at 9 AM when a festival is near, with a product idea |

## 4. The agent team

| Agent | What it does | How it stays honest |
|---|---|---|
| **Listener** | Reads the photo (vision) and the transcribed voice note; extracts product, price, offer, occasion | Never invents a price; missing facts are listed, not guessed |
| **Strategist** (tool-using AI agent) | Calls the `upcoming_festivals` tool, reads this shop's past post results and the Analyst's insights, picks the angle (festival / offer / new arrival / restock) **and the poster design**, and explains why | Festival dates come only from a verified list in code |
| **Copywriter** | Writes poster text, caption, hashtags and a WhatsApp forward in the shop's language (Bengali, English or both) | Uses only facts from the owner; no "best", no health claims, no fake scarcity |
| **Poster designer** | Places the owner's **real photo** in one of five professional themes and renders a 1080×1080 poster | Real photos only; if rendering fails, it falls back to the original photo |
| **Memory keeper** | On every ✏️ Change, decides: one-off fix or lasting preference? Saves lasting ones (style, design, language) to the shop's memory | Owner's words are treated as preferences, never as instructions to break rules |
| **Analyst** | `/report`: code computes engagement statistics; Claude explains them in plain language and saves one insight for the Strategist | Numbers are computed in code, never by the model; demo data is labelled |
| **Festival Nudge** | Every morning at 9:00 checks for festivals 0–3 days away that the shop hasn't posted for, and sends a specific product idea | Proactive: the system starts the conversation |
| **Lead Finder** | `/leads` → 🎯 Customers (schools, colleges, offices, hotels nearby that could buy) or 🔍 Competitors; reads real OpenStreetMap listings, Gemini picks the best and writes the reason and an opener | Only published business contacts copied exactly, source link for every lead, never makes up a business, no bulk messaging |

## 5. How a post flows (DD Main workflow)

1. **Telegram message arrives** → Route update → find the shop and its latest post → Decide next step (onboard / help / command / collecting / create / edit / button).
2. **Photo first, voice next**: the photo is saved as `collecting`; the voice note within 30 minutes completes it.
3. **Voice note → text** (speech-to-text, Bengali by default, English if the shop chose English).
4. **Listener → Strategist (with festival tool + past results) → Copywriter.**
5. **Poster**: theme chosen by the Strategist (or by the Memory keeper on an edit) → HTML/CSS → rendered image.
6. **Preview to owner** with the reason ("Bhai Phonta is in 4 days; festival posts did better here") and three buttons.
7. **✅ Post** → publish to the shop's Telegram channel (+ Facebook Page when connected) → owner gets a one-tap **Share on WhatsApp** button.
8. **✏️ Change** → Memory keeper → Copywriter edits only what was asked → new preview.
9. Every post is stored with its plan, copy, design and (when available) reactions, so the next decision is better.

**Three workflows, about 100 nodes**: DD Main (74 nodes), DD Insights (Analyst + daily nudge, 20 nodes), DD Lead Finder (agent with web search and page reader). Data lives in n8n Data tables: shops, posts, leads.

## 6. Features at a glance

**Core loop**

- Photo + voice note in, finished post + poster out, in Bengali, English or both
- Owner approval before anything is published (Post / Change / Skip)
- Edit by voice: "দামটা বড় করো", "less English", "make it more premium"
- Memory of lasting preferences (style notes, preferred design, language)

**Design**

- Five product-matched poster themes: **Festive** (sweets, puja), **Modern** (electronics, retail), **Bold** (gym, gadgets, sales), **Fresh** (bakery, café, grocery), **Elegant** (sarees, jewellery, salons)
- Real product photo always, cropped to the product on a clean studio backdrop; shop name, area, phone on every poster
- WhatsApp "Scan to order" QR on every poster: customers land in the shop's WhatsApp with the order typed in
- Owner can switch the look in plain words

**Growth intelligence**

- Festival calendar Nov 2026 – Feb 2027, verified, used by three agents
- Daily 9 AM festival nudge (proactive)
- `/report`: weekly Analyst report with numbers computed in code
- `/leads`: Lead Finder for the team's own outreach

**Works for any business**

- `/setup Name | type | area | phone` registers any shop in one line
- `/language` switches Bengali / English / both
- Commands: `/start` `/setup` `/language` `/report` `/nudge` `/memory` `/leads` `/help`

## 7. Why it is agentic (not a script)

- **Goal-directed decisions**: the Strategist chooses angle, price display and design, using a tool and evidence, and explains the choice.
- **Tool use**: festival calendar tool, web search and page reading (Lead Finder), image rendering.
- **Memory and learning**: edits become lasting preferences; Analyst insights feed the next Strategist decision.
- **Proactivity**: the nudge agent starts conversations on its own schedule.
- **Human in the loop where it matters**: publishing always waits for the owner.
- **Guardrails in code**: dates, numbers, Telegram limits and escaping are enforced outside the model.

## 8. Tech stack

| Layer | Choice |
|---|---|
| Orchestration | n8n Cloud (3 workflows), built and edited through the n8n MCP connector from Claude Code |
| Models | Google Gemini (free API key, stored only in n8n Credentials): vision, speech-to-text, writing, tool-using Strategist agent |
| Interface | Telegram Bot (inline buttons, HTML captions) |
| Poster | HTML/CSS template with 5 themes → HTML/CSS to Image API |
| Data | n8n Data tables: `dd_shops`, `dd_posts`, `dd_leads` |
| Publishing | Facebook Page (Graph API v27.0, live), optional Telegram channel, WhatsApp "Scan to order" QR + order link + share button |
| Quality | Mock n8n runtime test suite (`node tools/test_scripts.js`), Playwright render checks |

## 9. Demo script (3 minutes)

1. **(20 s) Problem**: "Mr. Das runs a sweet shop in Adisaptagram. Kali Puja is tomorrow. He has no time to make a post."
2. **(40 s) Send**: on the phone, send a photo of kaju barfi, then a Bengali voice note: "নতুন কাজু বরফি, চারশো টাকা কেজি".
3. **(40 s) Preview**: show the poster and the Strategist's reason (festival in 1 day, festival posts did better here). Point out: real photo, price exactly as spoken, Bengali copy.
4. **(30 s) Change**: tap ✏️ Change, say "আরেকটু প্রিমিয়াম লুক দাও". New preview in the Elegant look; `/memory` shows the saved preference.
5. **(20 s) Post**: tap ✅ Post → channel / Facebook → Share on WhatsApp.
6. **(30 s) Beyond one post**: show the 9 AM nudge message, `/report`, `/leads`, and `/setup` for a saree shop in English to show it is universal.

**Backup plan**: keep screenshots of each step; if the poster service is slow, the preview still arrives with the original photo.

## 10. Questions judges may ask

**Q1. Why not just use ChatGPT or Canva?**
They need the owner to type, design and decide. Dukaan Digital starts from a photo and a Bengali voice note, decides what to post and when, remembers preferences, and even starts the conversation before a festival. The owner's only job is to approve.

**Q2. What makes this agentic rather than a pipeline?**
The Strategist is a tool-using agent that reasons over the festival calendar and the shop's own results, chooses the angle and the design, and explains the choice. Memory changes future behaviour, and the nudge agent acts on its own schedule. Publishing is the one step deliberately left to a human.

**Q3. What if the AI makes up a price or an offer?**
Every prompt forbids it, and the Listener marks missing facts as missing. Prices are copied exactly as spoken, and nothing is published without the owner tapping ✅ Post.

**Q4. Are the engagement numbers real?**
For the demo, 10 past posts are seeded and labelled `seeded_demo`, and the Analyst says "(demo data)" whenever it uses them. Live posts are real. The next step is reading reactions, comments and shares back from the Facebook Page automatically.

**Q5. How accurate are festival dates?**
They are verified and stored in code, not generated by the model. The model receives them from a tool.

**Q6. Why Telegram and not WhatsApp?**
Telegram's bot API is free and instant, with buttons and voice notes, which let us build and test the full loop today. Customers still get the post on WhatsApp through a one-tap share button. A WhatsApp Business Cloud API front end is the next channel; the agents don't change, only the entry point.

**Q7. Will a shop owner really use this?**
The interaction is the same as sending a photo and a voice note to a relative. No typing, no English needed, no app to learn. Language can be Bengali only.

**Q8. What does it cost to run?**
Each post is a handful of model calls plus one image render. We use n8n Cloud AI credits today; the image service has a free tier of 50 renders a month and paid tiers above that. A per-shop subscription (proposed below) covers this with margin; we would measure exact cost per post in a pilot.

**Q9. How would you make money?** (proposed)
A free trial, then a low monthly plan per shop; partnerships with local distributors and banks who want their shop networks to sell more during festivals; and a team plan for agencies or cyber cafés that manage many shops.

**Q10. How does it scale to thousands of shops?**
Every row is keyed by the shop's chat ID, so one workflow serves all shops. For scale: move Data tables to Postgres, run n8n in queue mode with workers, and cache festival data. The prompts and agents stay the same.

**Q11. What about privacy and data?**
We store the shop profile, posts and the owner's style notes. Photos stay on Telegram; we keep only file IDs. API keys live only in n8n Credentials, never in code or the repository.

**Q12. Isn't the Lead Finder spam or scraping?**
It only records contact details a business has published itself, keeps the source link for each lead, excludes personal profiles, and never sends messages. It is for our team to visit or call shops politely.

**Q13. What happens when something fails?**
The poster falls back to the original photo; malformed AI output returns a clear "please try again" instead of a broken post; double taps on Post are caught ("already posted"); Telegram length and formatting limits are enforced in code.

**Q14. How good is the Bengali?**
Claude writes natural West Bengal Bengali; owners can correct tone by voice ("less English", "more homely"), and the Memory keeper keeps those corrections.

**Q15. Why not AI-generated product images?**
Customers trust the real product. A generated sweet that looks different from what's on the counter hurts the shop. We design around the owner's own photo.

**Q16. What did you build versus what the tools gave you?**
We designed the agent team, prompts, guardrails, data model, poster themes and test suite. Claude Code with the n8n MCP connector let us build, test and publish the workflows directly in n8n Cloud.

**Q17. What's next?**
Facebook results feeding the Analyst automatically, a WhatsApp front end, an order QR on the poster, and a second poster option per post so the system learns taste from choices.

## 11. Additional features (roadmap)

1. **Real results loop**: read reactions, comments and shares from Facebook every morning into `dd_posts`, so the Analyst and Strategist learn from live data.
2. **WhatsApp Business front end**: same agents, owners message on WhatsApp.
3. **Order QR on the poster**: scan to open a WhatsApp chat with "I want to order …".
4. **Offer end date** on the badge ("till 11 Nov"), only when the owner says it.
5. **Two designs per post**: owner taps the one they like; the choice trains the preference.
6. **`/logo`**: shop logo in the poster header.
7. **Best time to post**, from the shop's own results.
8. **Story (9:16) and square** sizes from one post; Instagram publishing.
9. **UPI QR and catalogue** for repeat orders.
10. **More languages** (Hindi, Odia, Assamese) with the same `/language` switch.

## 12. Status (7 Nov 2026, before the build window)

**Working and tested**: Telegram intake; photo + text → Listener → Strategist → Copywriter → poster render → preview with buttons; Change with memory; Skip; daily 9 AM nudge and `/nudge`; `/report`; `/memory`; Lead Finder; `/setup` and `/language`; five poster themes rendered and checked.

**Live-tested today**: photo post, voice note, ✏️ Change with memory, ✅ Post to the Facebook Page, nudge, report, leads (customers + custom), language, setup, skip.

**Known limits**: demo engagement history is seeded and labelled; poster renders limited to the free tier; Lead Finder sometimes cites a search page instead of the business's own page.

## 13. Closing line

"Every neighbourhood shop deserves a marketing team. Dukaan Digital gives them one that speaks their language, knows the festival calendar, never invents a price, and never posts without asking."

---
Source for the MSME figure: [MSME sector achieves key milestones in 2025, Udyam registrations cross 7.3 crore (The Statesman)](https://www.thestatesman.com/business/msme-sector-achieves-key-milestones-in-2025-udyam-registrations-cross-7-3-crore-msme-ministry-1503532923.html)
