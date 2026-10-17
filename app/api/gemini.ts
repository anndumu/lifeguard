// Shared helpers for talking to Google Gemini. Every route uses these,
// so the API key, model name, timeout, and "busy" retry live in one place.

// The model can be changed in Vercel with an environment variable called GEMINI_MODEL.
export const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

export const FRIENDLY_ERROR = "Sorry, Lifeguard couldn't check that right now. Please try again in a minute.";

type GeminiPart = {
  text?: string;
  thought?: boolean;
};

// Sends one request to Gemini. If Google says it's busy (503), waits 2 seconds and tries once more.
export async function askGemini(requestBody: object) {
  let response = await sendOnce(requestBody);
  if (response.status === 503) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    response = await sendOnce(requestBody);
  }
  return response;
}

function sendOnce(requestBody: object) {
  return fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY || "",
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(15000),
    }
  );
}

// Joins the text parts of Gemini's answer (skipping any hidden "thinking" parts).
export function readText(data: { candidates?: { content?: { parts?: GeminiPart[] } }[] }) {
  const parts = data.candidates?.[0]?.content?.parts || [];
  let text = "";
  for (const part of parts) {
    if (part.text && !part.thought) {
      text = text + part.text;
    }
  }
  return text;
}

// Turns Gemini's text into JSON, even if it wrapped it in ```json fences.
export function parseJson(text: string) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const start = Math.min(...["{", "["].map((c) => cleaned.indexOf(c)).filter((i) => i >= 0));
    const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}
