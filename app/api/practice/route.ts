import { askGemini, readText, parseJson, FRIENDLY_ERROR } from "../gemini";

export const maxDuration = 30;

// To keep the quiz fresh, we roll the dice here and give Gemini a different "brief" for each message.
// Add more ideas to any list below.
const SCAM_KINDS = [
  "unpaid toll", "package delivery fee", "bank fraud alert with a link", "grandchild or relative in trouble",
  "prize or lottery win", "work-from-home job offer", "computer virus or tech support", "Medicare or Social Security",
  "tax refund from the IRS", "new online friend or romance asking for money", "fake charity after a disaster",
  "power company threatening to shut off service", "fake online order or refund", "cryptocurrency investment tip",
  "wrong-number text that turns friendly", "account locked, confirm your password", "missed jury duty fine",
  "store gift card survey",
];

const SAFE_KINDS = [
  "doctor's appointment reminder", "pharmacy refill is ready", "family member sharing weekend plans",
  "church or community center event", "library books due soon", "real bank alert that says to call the number on your card",
  "delivery notice that says to check the carrier's app yourself", "grocery store weekly sale",
  "neighbor asking to borrow something", "friend sending birthday wishes",
  "bill reminder that says to log in to your account the usual way", "hair salon appointment confirmation",
];

const CHANNELS = ["text message", "email", "voicemail transcript", "social media message", "WhatsApp message"];
const TONES = ["very urgent and alarming", "friendly and casual", "formal and official-sounding", "short and blunt", "warm and chatty"];
const SCAM_DIFFICULTIES = [
  "easy: the warning signs are obvious",
  "medium: a careful reader will notice the warning signs",
  "hard: it looks very convincing, with only one or two subtle giveaways",
];
const SAFE_DIFFICULTIES = [
  "easy: clearly calm and normal",
  "medium: an ordinary everyday message",
  "hard: it sounds a little urgent or mentions money, but is still safe",
];
const NAMES = ["Rosa", "Dave", "Mei", "Tom", "Priya", "Luis", "Grace", "Omar", "Linda", "Kwame", "Ana", "Frank"];

// The exact shape Gemini must answer in (structured output).
const PRACTICE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      message: { type: "STRING" },
      sender: { type: "STRING" },
      scam_type: { type: "STRING" },
      red_flags: { type: "ARRAY", items: { type: "STRING" } },
      explanation: { type: "STRING" },
    },
    required: ["message", "sender", "scam_type", "red_flags", "explanation"],
  },
};

type Brief = { is_scam: boolean; kind: string; channel: string; tone: string; difficulty: string; name: string };
type GeminiQuestion = { message?: string; sender?: string; scam_type?: string; red_flags?: string[]; explanation?: string };

export async function POST(request: Request) {
  try {
    // The browser tells us which kinds it showed recently (kept only in the browser's memory).
    let recentKinds: string[] = [];
    try {
      const body = await request.json();
      recentKinds = Array.isArray(body.recentKinds) ? body.recentKinds.map(String) : [];
    } catch (error) {}

    const briefs = makeBriefs(recentKinds);

    const response = await askGemini({
      contents: [{ role: "user", parts: [{ text: writePrompt(briefs) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: PRACTICE_SCHEMA,
        thinkingConfig: { thinkingLevel: "low" },
      },
    });
    if (!response.ok) {
      console.error("Gemini error", response.status, await response.text());
      return Response.json({ error: FRIENDLY_ERROR }, { status: 500 });
    }

    const data = await response.json();
    const list: GeminiQuestion[] = parseJson(readText(data));

    // Match each answer to its brief. We already know which ones are scams, so we use our own answer key.
    const questions = [];
    for (let i = 0; i < briefs.length; i++) {
      const item = Array.isArray(list) ? list[i] : null;
      if (item && item.message) {
        questions.push({
          message: String(item.message),
          sender: String(item.sender || ""),
          channel: briefs[i].channel,
          kind: briefs[i].kind,
          is_scam: briefs[i].is_scam,
          scam_type: String(item.scam_type || ""),
          red_flags: Array.isArray(item.red_flags) ? item.red_flags.map(String) : [],
          explanation: String(item.explanation || ""),
        });
      }
    }
    if (questions.length < 3) {
      return Response.json({ error: FRIENDLY_ERROR }, { status: 500 });
    }

    return Response.json({ questions });
  } catch (error) {
    console.error(error);
    return Response.json({ error: FRIENDLY_ERROR }, { status: 500 });
  }
}

// Picks 2 to 4 scams (the rest safe), each with its own random channel, tone, difficulty, and name.
function makeBriefs(recentKinds: string[]): Brief[] {
  const scamCount = 2 + Math.floor(Math.random() * 3);
  const scams = pickFresh(SCAM_KINDS, scamCount, recentKinds);
  const safes = pickFresh(SAFE_KINDS, 5 - scamCount, recentKinds);
  const names = shuffle(NAMES);

  const slots = shuffle([
    ...scams.map((kind) => ({ is_scam: true, kind })),
    ...safes.map((kind) => ({ is_scam: false, kind })),
  ]);

  return slots.map((slot, i) => ({
    ...slot,
    channel: pickOne(CHANNELS),
    tone: pickOne(TONES),
    difficulty: pickOne(slot.is_scam ? SCAM_DIFFICULTIES : SAFE_DIFFICULTIES),
    name: names[i],
  }));
}

function writePrompt(briefs: Brief[]) {
  let prompt = "Write 5 short practice messages to help older adults learn to spot scams. Follow each brief exactly.\n\n";
  briefs.forEach((brief, i) => {
    prompt += "Message " + (i + 1) + ": " + (brief.is_scam ? "a SCAM" : "a SAFE, normal message") +
      ". Kind: " + brief.kind + ". Sent as: " + (/^[aeiou]/.test(brief.channel) ? "an " : "a ") + brief.channel + ". Tone: " + brief.tone +
      ". Difficulty: " + brief.difficulty + ". If it needs a person's name, use " + brief.name + ".\n";
  });
  prompt += `
Rules for every message:
- Make each one read like a real message of that type, between 1 and 4 sentences. Don't start any two messages the same way.
- Easy and medium scams may have odd capital letters, small typos, or emojis, like real scams do. Hard scams look polished.
- A safe message never asks you to click a link, share a code, or pay in an unusual way.
- Phone numbers must use 555 (like 555-0142). Never use a company's real website or a real login page. Invent web addresses that are clearly not the company's real site.
- "sender": who it appears to be from, as shown on a phone or in an inbox (a name, a 555 number, or a made-up email address).
- "scam_type": a short label, like "Fake toll bill" or "Normal reminder".
- "red_flags": 1 to 3 short phrases copied exactly from the message that give it away. Use an empty list for safe messages.
- "explanation": one short sentence that teaches the lesson in plain words. For safe messages, say what makes it trustworthy.
Return the 5 messages in the same order as the briefs.`;
  return prompt;
}

// Prefers kinds the person hasn't seen recently.
function pickFresh(list: string[], count: number, recent: string[]) {
  const fresh = shuffle(list.filter((kind) => !recent.includes(kind)));
  const seen = shuffle(list.filter((kind) => recent.includes(kind)));
  return fresh.concat(seen).slice(0, count);
}

function pickOne(list: string[]) {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle<T>(list: T[]) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temporary = copy[i];
    copy[i] = copy[j];
    copy[j] = temporary;
  }
  return copy;
}
