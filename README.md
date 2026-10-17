# Lifeguard

Lifeguard helps older adults check whether a text, email, screenshot, or voicemail is a scam. It explains in plain words whether it's a scam, suspicious, or safe, and what to do next.

Live site: https://lifeguard-theta.vercel.app

## What it does

- Answers with a beach flag everyone knows: red for a scam, yellow for be careful, green for safe
- Highlights the exact warning signs in the message and explains each one
- Checks links without ever opening them
- Listens to voicemails and shows what the caller said
- Answers in the message's language, or one you pick (Spanish, Chinese, Hindi, Vietnamese, Korean, Tagalog, Arabic, French)
- Gives clear next steps, plus where to report a scam and a free helpline
- Reads the answer aloud, and texts your trusted person for a second opinion
- Answers follow-up questions like "What if I already clicked?"
- A "Spot the scam" practice quiz with new messages every time
- Built for older eyes: text at least 18px, big pressable buttons, a bigger-text button, and light and dark mode
- No account, no password, and nothing is stored

## How we used Gemini

Lifeguard uses Google Gemini (`gemini-3.5-flash-lite` by default) in eight ways. Every call runs on our server, so the API key never reaches the browser.

1. **Multimodal input.** Text, screenshots (`inlineData` images), and voicemails (`inlineData` audio: mp3, m4a, wav, ogg, webm) all go through the same check.
2. **Audio understanding.** For voicemails, Gemini transcribes the call into a `transcript` field first, then judges it, watching for robocall tricks like "press 1" and fake government callers.
3. **Structured output.** Every check returns the same JSON: `verdict`, `headline`, `summary`, `red_flags`, `what_to_do`, `family_message`, `detected_language`, `transcript`. The server validates every field, and an unknown verdict becomes "suspicious."
4. **Grounded quotes.** Each red flag's `phrase` must be copied word for word from the message (or transcript). The page finds it, case-insensitively, and highlights it safely.
5. **Function calling.** We declare a `check_link` tool. Gemini calls it for each web address it sees, including links it reads in screenshots or hears in voicemails. Our server runs `inspectLink()`, which only reads the address text (look-alike brand names, swapped numbers like "paypa1," link shorteners, risky endings like .top, and mismatches with the company the message claims to be from). We send the result back, allowing up to 3 rounds, and Gemini uses it in its verdict. If function calling fails, we inspect every link ourselves and pass the results into a normal JSON-mode request.
6. **Multilingual understanding and generation.** Gemini detects the message's language and writes the answer in that language or the one the user picks, while keeping red-flag phrases in the original language so highlighting still works. "Read it to me" uses a matching voice.
7. **Content generation with a response schema.** `/api/practice` asks Gemini to write 5 fresh, realistic practice messages, constrained by a `responseSchema`, using only made-up details. To avoid repetitive output, the server rolls a random brief for each message (one of 30 scam and safe kinds, plus a channel, tone, difficulty and name) and varies the scam count from 2 to 4. The browser sends back the kinds it already showed (kept only in memory), so the next round is different. Our own answer key, not Gemini, decides which messages are scams.
8. **Multi-turn chat.** `/api/followup` sends the checked message, the verdict, and the conversation so far as a multi-turn chat, for short, calm answers. The conversation lives only in the browser's memory.

A rules layer (`rules.ts`) runs alongside Gemini. If the rules find a lot of red flags, Lifeguard never says "safe."

### When Gemini is busy or down

- Every request has a 15-second timeout, and a "busy" (503) answer gets one automatic retry.
- Demo examples have saved answers.
- Link checks fall back to our own inspector.
- Practice falls back to 10 built-in messages.
- Follow-up chips have built-in answers.
- Anything else shows a friendly "try again" message.

## Privacy

Lifeguard never stores messages, recordings, or personal details on a server. Each message is sent to Google's Gemini API to be checked. Links are never opened. Your trusted person's name and number are saved only in your own browser. On Gemini's free tier, Google may use what's sent to improve its products, so the page asks people to leave out passwords and card numbers. A public launch would use the paid tier.

## Where things are

- `public/index.html`, `public/style.css`, `public/script.js`: the page people see
- `public/followup.js`: follow-up questions
- `public/practice.js`, `public/practice-messages.js`: the practice quiz and its built-in messages
- `public/theme.js`: light/dark mode and bigger text
- `public/examples.js`: demo messages and saved backup answers
- `public/logo-light.png`, `public/logo-dark.png`, `public/icon.png`: logo and tab icon
- `app/api/gemini.ts`: shared Gemini helper (model, timeout, retry)
- `app/api/check/route.ts`: the main check, including the link tool
- `app/api/check/prompt.ts`: instructions for Gemini
- `app/api/check/rules.ts`: the simple red-flag rules
- `app/api/check/links.ts`: the link inspector (never opens links)
- `app/api/practice/route.ts`: practice message generator
- `app/api/followup/route.ts`: follow-up chat

## Run it on your computer

1. Install Node.js.
2. Run `npm install`.
3. Make a file called `.env.local` containing `GEMINI_API_KEY=your-key`. Optionally add `GEMINI_MODEL=` to use a different model.
4. Run `npm run dev` and open http://localhost:3000.

## Tech used

Plain HTML, CSS and JavaScript; Next.js for the API routes; Google Gemini API; Vercel for hosting. Photos from Unsplash.
