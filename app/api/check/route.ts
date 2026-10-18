import { askGemini, readText, parseJson, FRIENDLY_ERROR } from "../gemini";
import { SYSTEM_PROMPT } from "./prompt";
import { checkRules } from "./rules";
import { CHECK_LINK_TOOL, findLinks, findClaimedCompany, inspectLink, LinkCheck } from "./links";

// Give a check up to 60 seconds (a link check can take a few trips to Gemini).
export const maxDuration = 60;

const LANGUAGE_NAMES: Record<string, string> = {
  auto: "Auto", en: "English", es: "Spanish", zh: "Chinese", hi: "Hindi",
  vi: "Vietnamese", ko: "Korean", tl: "Tagalog", ar: "Arabic", fr: "French",
};

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"];
const AUDIO_TYPES = ["audio/mp3", "audio/mpeg", "audio/m4a", "audio/wav", "audio/ogg", "audio/webm"];

type GeminiAnswer = {
  verdict?: string;
  headline?: string;
  summary?: string;
  red_flags?: { phrase?: string; reason?: string }[];
  what_to_do?: string[];
  family_message?: string;
  detected_language?: string;
  detected_language_code?: string;
  transcript?: string;
};

type FunctionCallPart = {
  functionCall?: { name: string; id?: string; args?: { url?: string; claimed_company?: string } };
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text : "";
    const language = LANGUAGE_NAMES[body.language] || "Auto";

    const ruleHits = checkRules(text);
    let rulePoints = 0;
    for (const hit of ruleHits) {
      rulePoints = rulePoints + hit.points;
    }

    // Build what we send to Gemini: the answer language, the message (text, screenshot, or voicemail), and the rule hits.
    const parts: object[] = [{ text: "Answer language: " + language }];
    if (body.audio && AUDIO_TYPES.includes(body.mimeType)) {
      parts.push({ inlineData: { mimeType: body.mimeType, data: body.audio } });
      if (body.source === "microphone") {
        parts.push({ text: "The person is reading a message out loud, or playing a recording near the microphone. Write down the message in transcript, then check it." });
      } else {
        parts.push({ text: "This is a voicemail. Transcribe it, then check it." });
      }
    } else if (body.image && IMAGE_TYPES.includes(body.mimeType)) {
      parts.push({ inlineData: { mimeType: body.mimeType, data: body.image } });
      parts.push({ text: "Check the message in this screenshot." });
    } else if (text.trim() !== "") {
      parts.push({ text: "Message to check:\n" + text });
    } else {
      return Response.json({ error: FRIENDLY_ERROR }, { status: 400 });
    }
    parts.push({ text: "rule_hits: " + JSON.stringify(ruleHits) });

    // Messages with links, and every screenshot or voicemail, use the check_link tool.
    // If that fails for any reason, we fall back to a normal check.
    const linksInText = findLinks(text);
    const useLinkTool = linksInText.length > 0 || Boolean(body.audio || body.image);
    let checked = null;
    if (useLinkTool) {
      try {
        checked = await checkWithLinkTool(parts);
      } catch (error) {
        console.error("Link tool failed, using the normal check instead:", error);
      }
    }
    if (!checked) {
      checked = await checkWithoutTool(parts, text, linksInText);
    }

    const result = cleanUp(checked.answer);
    if (rulePoints >= 6 && result.verdict === "safe") {
      result.verdict = "suspicious";
    }

    // Any link in the text that Gemini didn't check, we check here, so the list is always complete.
    const linkChecks = checked.linkChecks;
    const claimedCompany = findClaimedCompany(text);
    for (const link of linksInText) {
      const check = inspectLink(link, claimedCompany);
      if (!linkChecks.some((c) => c.domain === check.domain)) {
        linkChecks.push(check);
      }
    }

    return Response.json({ ...result, rule_hits: ruleHits, link_checks: removeDuplicates(linkChecks) });
  } catch (error) {
    console.error(error);
    return Response.json({ error: FRIENDLY_ERROR }, { status: 500 });
  }
}

// Gemini decides when to call check_link. We run the check on our server and send back the result.
// Up to 3 rounds of link checks, then Gemini must give its final answer.
async function checkWithLinkTool(parts: object[]) {
  const linkChecks: LinkCheck[] = [];
  const contents: object[] = [{ role: "user", parts: parts }];

  for (let round = 0; round <= 3; round++) {
    const response = await askGemini({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: contents,
      tools: [{ functionDeclarations: [CHECK_LINK_TOOL] }],
      toolConfig: { functionCallingConfig: { mode: round === 3 ? "NONE" : "AUTO" } },
      generationConfig: { thinkingConfig: { thinkingLevel: "low" } },
    });
    if (!response.ok) {
      throw new Error("Gemini error " + response.status + " " + (await response.text()));
    }

    const data = await response.json();
    const modelContent = data.candidates[0].content;
    const calls: FunctionCallPart[] = [];
    for (const part of modelContent.parts || []) {
      if (part.functionCall) {
        calls.push(part);
      }
    }

    if (calls.length === 0) {
      const answer: GeminiAnswer = parseJson(readText(data));
      return { answer, linkChecks };
    }

    // Send Gemini's own message back unchanged (it carries a hidden signature Gemini needs),
    // followed by all of our link check results together.
    contents.push(modelContent);
    const results: object[] = [];
    for (const call of calls) {
      const args = call.functionCall?.args || {};
      const check = inspectLink(String(args.url || ""), String(args.claimed_company || ""));
      linkChecks.push(check);
      const functionResponse: Record<string, unknown> = { name: "check_link", response: check };
      if (call.functionCall?.id) {
        functionResponse.id = call.functionCall.id;
      }
      results.push({ functionResponse: functionResponse });
    }
    contents.push({ role: "user", parts: results });
  }

  throw new Error("Gemini kept asking for link checks");
}

// The normal check: we inspect the links ourselves and include the results in the message to Gemini.
async function checkWithoutTool(parts: object[], text: string, links: string[]) {
  const claimedCompany = findClaimedCompany(text);
  const linkChecks: LinkCheck[] = [];
  for (const link of links) {
    linkChecks.push(inspectLink(link, claimedCompany));
  }

  const allParts = linkChecks.length > 0 ? [...parts, { text: "link_checks: " + JSON.stringify(linkChecks) }] : parts;

  const response = await askGemini({
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: allParts }],
    generationConfig: { responseMimeType: "application/json", thinkingConfig: { thinkingLevel: "low" } },
  });
  if (!response.ok) {
    throw new Error("Gemini error " + response.status + " " + (await response.text()));
  }

  const data = await response.json();
  const answer: GeminiAnswer = parseJson(readText(data));
  return { answer, linkChecks };
}

// Makes sure every field exists and has the right type, so the page never shows "undefined".
function cleanUp(answer: GeminiAnswer) {
  const verdicts = ["scam", "suspicious", "safe"];
  const redFlags = [];
  for (const flag of Array.isArray(answer.red_flags) ? answer.red_flags : []) {
    if (flag && flag.phrase) {
      redFlags.push({ phrase: String(flag.phrase), reason: String(flag.reason || "") });
    }
  }
  return {
    verdict: verdicts.includes(String(answer.verdict)) ? String(answer.verdict) : "suspicious",
    headline: String(answer.headline || ""),
    summary: String(answer.summary || ""),
    red_flags: redFlags,
    what_to_do: Array.isArray(answer.what_to_do) ? answer.what_to_do.map(String) : [],
    family_message: String(answer.family_message || ""),
    detected_language: String(answer.detected_language || ""),
    detected_language_code: String(answer.detected_language_code || ""),
    transcript: String(answer.transcript || ""),
  };
}

function removeDuplicates(checks: LinkCheck[]) {
  const seen: string[] = [];
  const unique: LinkCheck[] = [];
  for (const check of checks) {
    if (!seen.includes(check.domain)) {
      seen.push(check.domain);
      unique.push(check);
    }
  }
  return unique;
}
