# Dukaan Digital — Features and work log

**An AI growth partner for neighbourhood shops.** Telegram bot + agents in n8n Cloud. Status as of 7 Nov 2026, before judging.

## A. What the shop owner can do

| Feature | How it works | Status |
|---|---|---|
| **Photo → post + poster** | Send a product photo with a caption, or photo then voice note/text. Listener → Strategist → Copywriter → poster → preview | ✅ Tested live (Gemini) |
| **Bengali voice notes** | Voice note transcribed by Gemini (Bengali by default, English if the shop is English) | ✅ Tested live |
| **Owner approval** | Every preview has ✅ Post / ✏️ Change / ⏭ Skip; nothing is published without ✅ Post | ✅ Tested live |
| **Edit by voice/text** | ✏️ Change → say what to change ("more premium", "bigger price", "less English") → new preview | ✅ Tested live |
| **Memory** | Memory keeper decides one-off vs lasting; lasting preferences (style, design, language) are saved and used for every future post | ✅ Tested live ("Preferred design: elegant" saved) |
| **5 product-matched poster designs** | Festive (sweets, puja), Modern (electronics, retail), Bold (gym, gadgets, sales), Fresh (bakery, café, grocery), Elegant (sarees, jewellery, salons). Strategist picks one and explains why | ✅ Tested live |
| **Product extraction (studio look)** | Listener finds the product in the photo; the poster crops to it and shows it on a clean studio backdrop with rounded corners and shadow. Real pixels only | ✅ Tested live |
| **WhatsApp ordering (automation)** | "Scan to order" QR on every poster + "Order on WhatsApp" link in the Facebook post/channel caption → opens the shop's WhatsApp with "I want to order …" typed in. Plus a 📲 share button for the owner | ✅ Tested live |
| **Facebook Page publishing** | ✅ Post publishes the poster + caption to the Facebook Page (Graph API v27.0), saves the Facebook post ID | ✅ Tested live (DukanDigital Page) |
| **Telegram channel publishing** | Optional; used when a channel is set for the shop | Built (no channel set) |
| **Language setting** | `/language` → বাংলা / English / বাংলা + English buttons; posts, posters, bot replies, nudge and report all follow it | ✅ Tested live |
| **Any business** | `/setup Name \| type \| area \| phone` registers any shop in one line; re-running keeps the Bengali name and memory | ✅ Tested live |
| **Festival nudge (proactive)** | Every morning 9:00 the bot messages the owner when a festival is 0–3 days away, with a product idea; `/nudge` on demand | ✅ Tested live |
| **Weekly report** | `/report`: numbers computed in code, Gemini explains them, saves an insight that the Strategist uses next time | ✅ Tested live |
| **Lead Finder** | `/leads` → 🎯 Customers (schools, offices, hotels, clinics nearby that could buy) or 🔍 Competitors (same-type shops nearby, strengths and gaps, 2–3 takeaways); `/leads <anything>` for custom. Real OpenStreetMap listings; published phone/email/website only; saved to `dd_leads` | ✅ Tested live (Customers: Chinsurah institutions with phones/emails; custom: Kolkata sweet shops). Competitors only where shops are mapped |
| **`/memory`, `/help`, `/start`** | Show saved style notes, language and insights; help text; welcome | ✅ Tested live |

## B. The agent team

| Agent | Model | Job |
|---|---|---|
| Listener | Gemini (vision) | Reads photo + transcript; extracts product, price, offer, product box; never invents a price |
| Strategist | Gemini agent + `upcoming_festivals` tool | Picks angle, price display and poster design; explains why using festival dates, past results and insights |
| Copywriter | Gemini | Poster text, caption, hashtags, WhatsApp text in the shop's language; no invented claims |
| Memory keeper | Gemini | One-off vs lasting preference; design and language preferences |
| Analyst | Gemini | Weekly report from code-computed stats |
| Festival Nudge | Gemini | Proactive morning message |
| Lead Finder | OpenStreetMap + Gemini | Customer leads and competitor research from real listings |

## C. Workflows (n8n Cloud)

- **DD Main** (80 nodes): Telegram bot, create/edit/approve/publish, commands, language, setup, leads menu.
- **DD Insights** (20 nodes): 9:00 festival nudge + `/report` Analyst.
- **DD Lead Finder** (12 nodes): OpenStreetMap search → Gemini → Telegram summary → `dd_leads`.
- Data tables: `dd_shops`, `dd_posts`, `dd_leads`.

## D. Guardrails

- Prices, offers and dates only from the owner or the verified festival list; never invented.
- Owner approval before anything is published.
- Numbers in reports computed in code; demo history labelled "(demo data)".
- Real product photos only (no AI-generated products).
- Telegram limits enforced in code (caption ≤ 1024, HTML escaping, callback ≤ 64 bytes).
- Keys only in n8n Credentials (Telegram, Gemini, Facebook, HCTI); none in code or the repo.
- Lead Finder: only published business contacts, source link kept, no personal profiles, no bulk messaging.

## E. Work log (today)

1. Picked the problem and named it Dukaan Digital ("AI growth partner").
2. Built DD Main, DD Insights and the Lead Finder in n8n Cloud through the n8n MCP connector.
3. Telegram bot connected; poster rendering via HTML/CSS to Image.
4. Five professional poster themes; Strategist chooses by product.
5. Language setting (Bengali / English / both) for posts, posters, bot replies, nudge and report.
6. `/setup` for any business.
7. Facebook Page connected (Meta app, Page token); ✅ Post publishes to Facebook; Telegram channel optional.
8. Lead Finder with Customers / Competitors modes.
9. n8n AI credits ran out → switched every AI step to the team's free Gemini key; tested end to end.
10. Product extraction (studio-style crop) and WhatsApp "Scan to order" QR + order links.
11. Pitch brief (PDF) with demo script and judge Q&A.

## F. Known limits

- Gemini free tier: a burst of many posts in one minute can slow down. If the main model is busy (503), the Listener and Copywriter switch to a backup Gemini model automatically; if both fail, the owner gets a "please send again in a minute" message instead of silence.
- Lead Finder uses OpenStreetMap, so coverage depends on what's mapped in the area; it never makes up businesses.
- Engagement history for the demo shop is seeded and labelled; live Facebook reactions aren't read back yet (next step).
- Facebook app is in Development mode: posts may only be visible to app admins until the app is published.
- Poster renders: free tier of the HTML/CSS to Image service (50 a month).
