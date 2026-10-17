import { askGemini, readText, parseJson, FRIENDLY_ERROR } from "../gemini";

export const maxDuration = 30;

const PRACTICE_PROMPT = `
Write 5 short, realistic practice messages to help older adults learn to spot scams.
Make 3 of them scams and 2 of them safe, in a random order.
Use different kinds each time, chosen from: toll bill, package delivery, bank alert, grandchild emergency, prize or lottery, job offer, tech support, government or Medicare, and normal messages from a doctor, pharmacy, family member, or store.
Each message should read like a real text or email, 1 to 3 sentences long.
Use only made-up details: phone numbers must use 555 (like 555-0142), and links must be clearly fake (like secure-check-example.top).
Never include a real company's real website or a real login page.
For each message, give:
- "is_scam": true or false
- "scam_type": a short label, like "Fake toll bill" or "Normal reminder"
- "red_flags": 1 to 3 short phrases copied exactly from the message that give it away (an empty list for safe messages)
- "explanation": one short sentence that teaches the lesson in plain words
`;

// The exact shape Gemini must answer in (structured output).
const PRACTICE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      message: { type: "STRING" },
      is_scam: { type: "BOOLEAN" },
      scam_type: { type: "STRING" },
      red_flags: { type: "ARRAY", items: { type: "STRING" } },
      explanation: { type: "STRING" },
    },
    required: ["message", "is_scam", "scam_type", "red_flags", "explanation"],
  },
};

type PracticeQuestion = {
  message?: string;
  is_scam?: boolean;
  scam_type?: string;
  red_flags?: string[];
  explanation?: string;
};

export async function POST() {
  try {
    const response = await askGemini({
      contents: [{ role: "user", parts: [{ text: PRACTICE_PROMPT + "\nPractice set number " + Math.floor(Math.random() * 10000) }] }],
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
    const list: PracticeQuestion[] = parseJson(readText(data));

    // Keep only complete questions, so the quiz never shows a blank card.
    const questions = [];
    for (const item of Array.isArray(list) ? list : []) {
      if (item && item.message && typeof item.is_scam === "boolean") {
        questions.push({
          message: String(item.message),
          is_scam: item.is_scam,
          scam_type: String(item.scam_type || ""),
          red_flags: Array.isArray(item.red_flags) ? item.red_flags.map(String) : [],
          explanation: String(item.explanation || ""),
        });
      }
    }
    if (questions.length < 3) {
      return Response.json({ error: FRIENDLY_ERROR }, { status: 500 });
    }

    return Response.json({ questions: questions.slice(0, 5) });
  } catch (error) {
    console.error(error);
    return Response.json({ error: FRIENDLY_ERROR }, { status: 500 });
  }
}
