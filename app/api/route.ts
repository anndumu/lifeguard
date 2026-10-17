import { askGemini, readText, FRIENDLY_ERROR } from "../gemini";

export const maxDuration = 30;

const FOLLOWUP_PROMPT = `
You are Lifeguard, a calm and kind helper for an older adult who just checked a message for scams.
Answer their follow-up question in 2 to 4 short sentences, in plain words a 12-year-old could understand.
Answer in the same language as their question.
Never tell them to click a link, call a number, or reply to the message they checked.
If they need to contact a company, tell them to use a phone number or website they already trust, like the number on their card or bill.
If they already clicked, paid, or shared information, calmly tell them what to do now: for example, call their bank using the number on their card, change their passwords, and report it at ReportFraud.ftc.gov.
Don't make things up. If you're not sure, say so and suggest asking a trusted family member.
`;

type Turn = { role?: string; text?: string };

// The conversation is kept only in the person's browser. Nothing is saved here.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = String(body.message || "(a screenshot or voicemail)").slice(0, 5000);
    const verdict = JSON.stringify(body.result || {}).slice(0, 4000);
    const history: Turn[] = Array.isArray(body.history) ? body.history.slice(-10) : [];

    // Gemini sees: the checked message and verdict, then the conversation so far.
    const contents: object[] = [
      { role: "user", parts: [{ text: "Here is the message I checked:\n" + message + "\n\nLifeguard's answer:\n" + verdict }] },
      { role: "model", parts: [{ text: "Thanks. What would you like to know about it?" }] },
    ];
    for (const turn of history) {
      const role = turn.role === "model" ? "model" : "user";
      contents.push({ role: role, parts: [{ text: String(turn.text || "").slice(0, 1000) }] });
    }

    const response = await askGemini({
      systemInstruction: { parts: [{ text: FOLLOWUP_PROMPT }] },
      contents: contents,
      generationConfig: { thinkingConfig: { thinkingLevel: "low" } },
    });
    if (!response.ok) {
      console.error("Gemini error", response.status, await response.text());
      return Response.json({ error: FRIENDLY_ERROR }, { status: 500 });
    }

    const data = await response.json();
    const answer = readText(data).trim();
    if (answer === "") {
      return Response.json({ error: FRIENDLY_ERROR }, { status: 500 });
    }
    return Response.json({ answer });
  } catch (error) {
    console.error(error);
    return Response.json({ error: FRIENDLY_ERROR }, { status: 500 });
  }
}
