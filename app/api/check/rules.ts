export type RuleHit = {
  category: string;
  phrase: string;
  points: number;
};

const RULES = [
  { category: "Rushing you", points: 2, words: ["immediately", "urgent", "right away", "final notice", "within 24 hours", "act now"] },
  { category: "Strange way to pay", points: 3, words: ["gift card", "wire transfer", "bitcoin", "crypto", "zelle", "western union"] },
  { category: "Threat", points: 2, words: ["suspended", "arrest", "legal action", "late fee", "penalty", "locked"] },
  { category: "Asks for private info", points: 3, words: ["password", "social security", "pin number", "verify your account", "bank account number"] },
  { category: "Too good to be true", points: 2, words: ["you won", "winner", "prize", "lottery", "free gift"] },
  { category: "Keep it secret", points: 3, words: ["don't tell", "do not tell", "keep this between us"] },
  { category: "Link", points: 1, words: ["http://", "https://", "bit.ly", "click here"] },
];

export function checkRules(text: string): RuleHit[] {
  const lowerText = text.toLowerCase().replaceAll("’", "'");
  const hits: RuleHit[] = [];

  for (const rule of RULES) {
    for (const word of rule.words) {
      if (lowerText.includes(word)) {
        hits.push({ category: rule.category, phrase: word, points: rule.points });
      }
    }
  }

  return hits;
}
