# Lifeguard

Lifeguard helps older adults check whether a text or email is a scam. Paste a message or add a screenshot, and Lifeguard explains in plain words whether it's a scam, suspicious, or safe, and what to do next.

Live site: https://lifeguard-theta.vercel.app

## What it does

- Answers with a beach flag everyone knows: red for a scam, yellow for be careful, green for safe
- Highlights the exact warning signs in the message and explains each one
- Gives clear next steps, plus where to report a scam and a free helpline
- Reads the answer aloud and can text a family member for a second opinion
- Built for older eyes: large readable type, big pressable buttons, a bigger-text button, and light and dark mode
- No account, no password, and nothing is stored

## How it works

1. Simple rules look for common scam signs, like gift cards or "final notice."
2. Google Gemini reads the whole message and answers in a fixed JSON format.
3. If the rules find a lot of red flags, Lifeguard never says "safe." When unsure, it says "be careful."

The Gemini key stays on the server. The page only talks to our own `/api/check` route. If Gemini is busy, the server tries once more, and the demo examples have saved answers so they always work.

## Privacy

Lifeguard doesn't save messages. Each message is sent to Google's Gemini API to be checked. On Gemini's free tier, Google may use what's sent to improve its products, so the page asks people to leave out passwords and card numbers. A public launch would use the paid tier.

## Where things are

- `public/index.html`, `public/style.css`, `public/script.js`: the page people see
- `public/theme.js`: light/dark mode and bigger text
- `public/examples.js`: demo messages and backup answers
- `public/logo-light.png`, `public/logo-dark.png`, `public/icon.png`: logo and tab icon
- `app/api/check/route.ts`: sends the message to Gemini
- `app/api/check/prompt.ts`: instructions for Gemini
- `app/api/check/rules.ts`: the simple red-flag rules

## Run it on your computer

1. Install Node.js.
2. Run `npm install`.
3. Make a file called `.env.local` containing `GEMINI_API_KEY=your-key`.
4. Run `npm run dev` and open http://localhost:3000.

## Tech used

Plain HTML, CSS and JavaScript; Next.js for the API route; Google Gemini (3.5 Flash-Lite); Vercel for hosting. Photos from Unsplash.
