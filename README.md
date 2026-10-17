# Lifeguard

Lifeguard helps older adults check whether a text or email is a scam. Paste a message or upload a screenshot, and Lifeguard explains in plain words whether it's a scam, suspicious, or safe, and what to do next.

## How it works

1. Simple rules look for common scam signs, like gift cards or "final notice."
2. Google Gemini reads the whole message and answers in a fixed JSON format.
3. If the rules find a lot of red flags, Lifeguard never says "safe."

The Gemini key stays on the server. The page only talks to our own `/api/check` route.

## Where things are

- `public/index.html`, `public/style.css`, `public/script.js`: the page people see
- `public/examples.js`: demo messages and backup answers for when the internet is down
- `app/api/check/route.ts`: sends the message to Gemini
- `app/api/check/prompt.ts`: instructions for Gemini
- `app/api/check/rules.ts`: the simple red-flag rules

## Run it on your computer

1. Install Node.js.
2. Run `npm install`.
3. Make a file called `.env.local` containing `GEMINI_API_KEY=your-key`.
4. Run `npm run dev` and open http://localhost:3000.

## Tech used

Plain HTML, CSS and JavaScript; Next.js for the API route; Google Gemini API; Vercel for hosting.
