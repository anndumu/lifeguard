// Link inspector. It NEVER visits or downloads a link. It only reads the text of the address.

export type LinkCheck = {
  url: string;
  domain: string;
  risk: "high" | "medium" | "low" | "unknown";
  reason: string;
};

// Real websites for companies scammers often pretend to be. Add more here.
const BRANDS = [
  { name: "USPS", words: ["usps", "postal service", "post office"], sites: ["usps.com"] },
  { name: "the IRS", words: ["irs", "internal revenue"], sites: ["irs.gov"] },
  { name: "Amazon", words: ["amazon"], sites: ["amazon.com"] },
  { name: "Apple", words: ["apple", "icloud"], sites: ["apple.com", "icloud.com"] },
  { name: "PayPal", words: ["paypal"], sites: ["paypal.com"] },
  { name: "Walmart", words: ["walmart"], sites: ["walmart.com"] },
  { name: "FedEx", words: ["fedex"], sites: ["fedex.com"] },
  { name: "UPS", words: ["ups"], sites: ["ups.com"] },
  { name: "E-ZPass", words: ["ezpass", "e-zpass"], sites: ["e-zpassny.com", "ezpassnj.com", "ezpassmd.com", "ezpassva.com", "e-zpassiag.com"] },
  { name: "Chase", words: ["chase"], sites: ["chase.com"] },
  { name: "Bank of America", words: ["bankofamerica", "bank of america", "bofa"], sites: ["bankofamerica.com"] },
  { name: "Wells Fargo", words: ["wellsfargo", "wells fargo"], sites: ["wellsfargo.com"] },
  { name: "Citi", words: ["citibank", "citi"], sites: ["citi.com", "citibank.com"] },
  { name: "Capital One", words: ["capitalone", "capital one"], sites: ["capitalone.com"] },
];

const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "rebrand.ly", "cutt.ly", "shorturl.at", "tiny.cc", "rb.gy", "t.ly"];

const RISKY_ENDINGS = ["top", "xyz", "icu", "click", "live", "shop", "online", "site", "info", "buzz", "rest", "cfd", "sbs", "monster", "zip", "mov", "loan", "work", "support", "vip"];

// This is the description Gemini sees, so it knows when and how to call the tool.
export const CHECK_LINK_TOOL = {
  name: "check_link",
  description: "Checks a web address from the message for signs of a scam, using only the text of the address. Never visits the link. Call it once for each link you see.",
  parameters: {
    type: "OBJECT",
    properties: {
      url: { type: "STRING", description: "The web address exactly as it appears in the message." },
      claimed_company: { type: "STRING", description: "The company the message claims to be from, if any. Leave empty if none." },
    },
    required: ["url"],
  },
};

// Finds web addresses in a piece of text (up to 5).
export function findLinks(text: string) {
  const pattern = /\b(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?/gi;
  const links: string[] = [];
  for (const match of text.matchAll(pattern)) {
    const isEmail = text[(match.index || 0) - 1] === "@";
    const link = match[0].replace(/[.,;:!?)"']+$/, "");
    if (!isEmail && !links.includes(link)) {
      links.push(link);
    }
  }
  return links.slice(0, 5);
}

// Finds which company a message claims to be from, by looking for company names in it.
export function findClaimedCompany(text: string) {
  const lower = text.toLowerCase();
  for (const brand of BRANDS) {
    for (const word of brand.words) {
      if (word.length <= 4 ? new RegExp("\\b" + word + "\\b").test(lower) : lower.includes(word)) {
        return brand.name;
      }
    }
  }
  return "";
}

function findBrand(name: string) {
  const lower = name.toLowerCase();
  for (const brand of BRANDS) {
    if (lower.includes(brand.name.toLowerCase().replace("the ", "")) || brand.words.some((w) => lower.includes(w))) {
      return brand;
    }
  }
  return null;
}

// Which company name (if any) appears inside the web address itself.
function brandInDomain(domain: string) {
  const pieces = domain.split(/[.-]/);
  const joined = domain.replace(/-/g, "");
  for (const brand of BRANDS) {
    for (const word of brand.words) {
      const plain = word.replace(/[\s-]/g, "");
      if (plain.length <= 4 ? pieces.includes(plain) : joined.includes(plain)) {
        return brand;
      }
    }
  }
  return null;
}

function isOfficial(domain: string, sites: string[]) {
  return sites.some((site) => domain === site || domain.endsWith("." + site));
}

export function inspectLink(url: string, claimedCompany: string): LinkCheck {
  let domain = "";
  try {
    const withScheme = /^https?:\/\//i.test(url) ? url : "http://" + url;
    domain = new URL(withScheme).hostname.toLowerCase().replace(/^www\./, "");
  } catch (error) {
    return { url, domain: url, risk: "medium", reason: "This doesn't look like a normal web address." };
  }

  const claimed = claimedCompany ? findBrand(claimedCompany) : null;
  const named = brandInDomain(domain);
  const ending = domain.split(".").pop() || "";

  if (/^\d+\.\d+\.\d+\.\d+$/.test(domain)) {
    return { url, domain, risk: "high", reason: "This link uses a string of numbers instead of a website name." };
  }

  const officialBrand = BRANDS.find((brand) => isOfficial(domain, brand.sites));
  if (officialBrand) {
    if (claimed && claimed !== officialBrand) {
      return { url, domain, risk: "medium", reason: "The message claims to be from " + claimed.name + ", but this link goes to " + officialBrand.name + "." };
    }
    return { url, domain, risk: "low", reason: "This is the real " + officialBrand.name + " website. Still, it's safest to type the address yourself." };
  }

  if (SHORTENERS.includes(domain)) {
    return { url, domain, risk: "medium", reason: "This is a shortened link that hides where it really goes." };
  }

  // Numbers swapped for letters, like "paypa1" for "paypal" or "amaz0n" for "amazon".
  for (const swapped of [domain.replace(/1/g, "l"), domain.replace(/1/g, "i")]) {
    const unswapped = swapped.replace(/0/g, "o").replace(/3/g, "e").replace(/5/g, "s").replace(/4/g, "a");
    const lookalike = brandInDomain(unswapped);
    if (lookalike && !named) {
      return { url, domain, risk: "high", reason: "This address swaps numbers for letters to look like " + lookalike.name + "." };
    }
  }

  if (named) {
    const realSite = named.sites.length === 1 ? " (" + named.sites[0] + ")" : "";
    return { url, domain, risk: "high", reason: "This uses the name " + named.name + ", but it is not the real " + named.name + " website" + realSite + "." };
  }

  if (claimed) {
    const realSite = claimed.sites.length === 1 ? claimed.sites[0] : "a real " + claimed.name + " website";
    return { url, domain, risk: "high", reason: "The message says it's from " + claimed.name + ", but this link doesn't go to " + realSite + "." };
  }

  if (RISKY_ENDINGS.includes(ending)) {
    return { url, domain, risk: "high", reason: "Web addresses ending in ." + ending + " are often used by scammers." };
  }

  return { url, domain, risk: "unknown", reason: "We didn't spot anything odd in this address. Only open links you were expecting." };
}
