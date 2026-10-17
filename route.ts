import { SYSTEM_PROMPT } from "./prompt";
import { checkRules } from "./rules";

const MODEL = "gemini-3.8-flash";

const FRIENDLY_ERROR = "Sorry, Lifeguard couldn't check that right now. Please try again in a minute.";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = body.text || "";

    const ruleHits = checkRules(text);
    let rulePoints = 0;
    for (const hit of ruleHits) {
      rulePoints = rulePoints + hit.points;
    }

    const parts: object[] = [];
    if (body.image) {
      parts.push({ inlineData: { mimeType: body.mimeType, data: body.image } });
      parts.push({ text: "Check the message in this screenshot." });
    } else {
      parts.push({ text: "Message to check:\n" + text });
    }
    parts.push({ text: "rule_hits: " + JSON.stringify(ruleHits) });

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY || "",
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: parts }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    if (!response.ok) {
      console.error("Gemini error", response.status, await response.text());
      return Response.json({ error: FRIENDLY_ERROR }, { status: 500 });
    }

    const data = await response.json();
    const result = JSON.parse(data.candidates[0].content.parts[0].text);

    if (rulePoints >= 6 && result.verdict === "safe") {
      result.verdict = "suspicious";
    }
    result.rule_hits = ruleHits;

    return Response.json(result);
  } catch (error) {
    console.error(error);
    return Response.json({ error: FRIENDLY_ERROR }, { status: 500 });
  }
}
