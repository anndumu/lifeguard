// Lifeguard: the message checker on the main page.

const messageBox = document.getElementById("message");
const photoInput = document.getElementById("photo");
const voicemailInput = document.getElementById("voicemail");
const fileName = document.getElementById("file-name");
const languageSelect = document.getElementById("language");
const answerBox = document.getElementById("answer");
const emptyText = document.getElementById("empty");
const loadingText = document.getElementById("loading");
const loadingMessage = document.getElementById("loading-message");
const errorText = document.getElementById("error");
const resultBox = document.getElementById("result");
const familyLink = document.getElementById("family-link");
const trustedName = document.getElementById("trusted-name");
const trustedNumber = document.getElementById("trusted-number");
const trustedHint = document.getElementById("trusted-hint");

const VERDICT_WORDS = {
  scam: "Red flag: this is a scam",
  suspicious: "Yellow flag: be careful",
  safe: "Green flag: this looks safe",
};

const RISK_WORDS = { high: "Not safe", medium: "Be careful", low: "Looks real", unknown: "Not sure" };

// Voices for "Read it to me". Most languages use their short code; these two need a longer one.
const SPEECH_LANGUAGES = { zh: "zh-CN", tl: "fil-PH" };

// Files bigger than this won't fit through Vercel once they're sent.
const MAX_FILE_SIZE = 3300000;
const AUDIO_TYPES = { mp3: "audio/mp3", m4a: "audio/m4a", wav: "audio/wav", ogg: "audio/ogg", webm: "audio/webm" };

const DEFAULT_FAMILY_MESSAGE = "Hi! I got a message that might be a scam. Can you take a look with me?";

let currentResult = null; // the latest answer
let currentText = "";     // the message (or voicemail transcript) that was checked
let currentSource = "";   // "microphone" when the person spoke the message out loud

// ---------- Saving on this device (works even if the browser blocks it) ----------

function remember(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {}
}

function recall(key) {
  try {
    return localStorage.getItem(key) || "";
  } catch (error) {
    return "";
  }
}

function forget(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {}
}

// ---------- Example buttons (EXAMPLES comes from examples.js, loaded before this file) ----------

const exampleList = typeof EXAMPLES !== "undefined" ? EXAMPLES : [];
for (const example of exampleList) {
  const card = document.createElement("button");
  card.className = "example";

  const image = document.createElement("img");
  image.src = example.image;
  image.alt = "";
  image.onerror = function () {
    image.hidden = true;
  };

  const label = document.createElement("span");
  label.textContent = example.label;

  card.appendChild(image);
  card.appendChild(label);
  card.addEventListener("click", function () {
    messageBox.value = example.message;
    clearFileName();
    checkMessage({ text: example.message });
  });
  document.getElementById("examples").appendChild(card);
}

// ---------- Ways to check: typed text, a screenshot, or a voicemail ----------

document.getElementById("check-button").addEventListener("click", function () {
  if (messageBox.value.trim() !== "") {
    clearFileName();
    checkMessage({ text: messageBox.value });
  } else {
    showError("Paste a message first, or check a screenshot or voicemail instead.");
  }
});

photoInput.addEventListener("change", function () {
  const photo = photoInput.files[0];
  photoInput.value = "";
  if (!photo) {
    return;
  }
  showFileName("Screenshot: " + photo.name);
  if (photo.size > MAX_FILE_SIZE) {
    showError("That picture is too large. Try a smaller screenshot.");
    return;
  }
  readAsBase64(photo, function (base64) {
    checkMessage({ image: base64, mimeType: photo.type });
  });
});

voicemailInput.addEventListener("change", function () {
  const audio = voicemailInput.files[0];
  voicemailInput.value = "";
  if (!audio) {
    return;
  }
  showFileName("Voicemail: " + audio.name);
  const ending = audio.name.split(".").pop().toLowerCase();
  const mimeType = AUDIO_TYPES[ending];
  if (!mimeType) {
    showError("Please choose an mp3, m4a, wav, ogg, or webm sound file.");
    return;
  }
  if (audio.size > MAX_FILE_SIZE) {
    showError("That recording is too large. Please try a shorter one (under 3 MB).");
    return;
  }
  readAsBase64(audio, function (base64) {
    checkMessage({ audio: base64, mimeType: mimeType });
  });
});

function readAsBase64(file, whenDone) {
  const reader = new FileReader();
  reader.onload = function () {
    whenDone(reader.result.split(",")[1]);
  };
  reader.onerror = function () {
    showError("Lifeguard couldn't open that file. Please try another one.");
  };
  reader.readAsDataURL(file);
}

function showFileName(text) {
  fileName.textContent = text;
  fileName.hidden = false;
}

function clearFileName() {
  fileName.hidden = true;
}

// ---------- Asking our server to check the message ----------

async function checkMessage(input) {
  input.language = languageSelect.value;
  currentSource = input.source || "";

  emptyText.hidden = true;
  resultBox.hidden = true;
  errorText.hidden = true;
  loadingText.hidden = false;
  loadingMessage.textContent = input.audio ? "Lifeguard is listening..." : "Lifeguard is checking...";
  showAnswerBox();

  const slowTimer = setTimeout(function () {
    loadingMessage.textContent = "Still checking. This can take up to 20 seconds.";
  }, 8000);

  try {
    const response = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error("Check failed");
    }
    const result = await response.json();
    showResult(result, input.text);
  } catch (error) {
    // If Gemini can't be reached, the demo examples still show a saved answer.
    const backup = findBackup(input.text);
    if (backup) {
      showResult(backup, input.text);
    } else {
      showError("Lifeguard couldn't check this right now. Wait a minute, then try again.");
    }
  }

  clearTimeout(slowTimer);
  loadingText.hidden = true;
}

function showAnswerBox() {
  const top = answerBox.getBoundingClientRect().top;
  if (top < 0 || top > window.innerHeight / 2) {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    answerBox.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }
}

function findBackup(text) {
  for (const example of exampleList) {
    if (example.message === text) {
      return example.backup;
    }
  }
  return null;
}

// ---------- Showing the answer ----------

function showResult(result, originalText) {
  currentResult = result || {};
  const verdict = getVerdict(currentResult);
  const redFlags = Array.isArray(currentResult.red_flags) ? currentResult.red_flags : [];
  const steps = Array.isArray(currentResult.what_to_do) ? currentResult.what_to_do : [];
  const linkChecks = Array.isArray(currentResult.link_checks) ? currentResult.link_checks : [];

  document.getElementById("verdict-banner").className = verdict;
  document.getElementById("verdict").textContent = getHeadline(currentResult);
  document.getElementById("summary").textContent = currentResult.summary || "";

  const languageLine = document.getElementById("language-line");
  languageLine.textContent = "Message language: " + (currentResult.detected_language || "");
  languageLine.hidden = !currentResult.detected_language;

  // The message (or what the caller said), with the warning signs highlighted.
  currentText = originalText || currentResult.transcript || "";
  const messageSection = document.getElementById("message-section");
  let heading = "The message";
  if (!originalText) {
    heading = currentSource === "microphone" ? "What we heard" : "What the caller said";
  }
  document.getElementById("message-heading").textContent = heading;
  if (currentText) {
    document.getElementById("highlighted-message").innerHTML = buildHighlightedHtml(currentText, redFlags);
    messageSection.hidden = false;
  } else {
    messageSection.hidden = true;
  }

  const flagList = document.getElementById("red-flags");
  flagList.innerHTML = "";
  for (const flag of redFlags) {
    if (flag && flag.phrase) {
      addListItem(flagList, "\"" + flag.phrase + "\": " + (flag.reason || ""));
    }
  }
  if (flagList.children.length === 0) {
    addListItem(flagList, "No warning signs found.");
  }

  showLinkChecks(linkChecks);

  const stepList = document.getElementById("what-to-do");
  stepList.innerHTML = "";
  for (const step of steps) {
    addListItem(stepList, String(step));
  }

  document.getElementById("report-box").hidden = verdict === "safe";
  updateFamilyLink();
  if (typeof resetFollowup === "function") {
    resetFollowup();
  }

  resultBox.hidden = false;
}

// Anything other than scam, suspicious, or safe is treated as suspicious.
function getVerdict(result) {
  return ["scam", "suspicious", "safe"].includes(result.verdict) ? result.verdict : "suspicious";
}

// The language the answer is written in: the one picked, or the message's own language on "Auto".
function getAnswerLanguage(result) {
  if (languageSelect.value !== "auto") {
    return languageSelect.value;
  }
  return (result.detected_language_code || "en").toLowerCase().slice(0, 2);
}

// Gemini writes a headline in the answer language. In English we use our own words.
function getHeadline(result) {
  if (result.headline && getAnswerLanguage(result) !== "en") {
    return result.headline;
  }
  return VERDICT_WORDS[getVerdict(result)];
}

function showLinkChecks(linkChecks) {
  const linkList = document.getElementById("link-list");
  linkList.innerHTML = "";
  for (const check of linkChecks) {
    const risk = RISK_WORDS[check.risk] ? check.risk : "unknown";
    const item = document.createElement("li");
    item.className = "risk-" + risk;
    const title = document.createElement("strong");
    title.textContent = RISK_WORDS[risk] + ": " + (check.domain || check.url || "");
    const reason = document.createElement("span");
    reason.textContent = check.reason || "";
    item.appendChild(title);
    item.appendChild(document.createElement("br"));
    item.appendChild(reason);
    linkList.appendChild(item);
  }
  document.getElementById("links-section").hidden = linkChecks.length === 0;
}

// Highlights each warning-sign phrase in the message.
// We find each phrase in the original text (ignoring upper/lower case), skip overlaps,
// and escape every piece of text so nothing in the message can run as code.
function buildHighlightedHtml(text, redFlags) {
  const lowerText = text.toLowerCase();
  const matches = [];
  for (const flag of redFlags) {
    const phrase = flag && flag.phrase ? String(flag.phrase).trim() : "";
    if (phrase === "") {
      continue;
    }
    const start = lowerText.indexOf(phrase.toLowerCase());
    if (start !== -1) {
      matches.push({ start: start, end: start + phrase.length });
    }
  }
  matches.sort(function (a, b) {
    return a.start - b.start;
  });

  let html = "";
  let position = 0;
  for (const match of matches) {
    if (match.start < position) {
      continue; // overlaps a phrase we already highlighted
    }
    html += escapeHtml(text.slice(position, match.start));
    html += "<mark>" + escapeHtml(text.slice(match.start, match.end)) + "</mark>";
    position = match.end;
  }
  html += escapeHtml(text.slice(position));
  return html;
}

function escapeHtml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function addListItem(list, text) {
  const item = document.createElement("li");
  item.textContent = text;
  list.appendChild(item);
}

function showError(message) {
  emptyText.hidden = true;
  loadingText.hidden = true;
  resultBox.hidden = true;
  errorText.textContent = message;
  errorText.hidden = false;
  showAnswerBox();
}

// ---------- Read it to me ----------

document.getElementById("read-button").addEventListener("click", function () {
  if (!currentResult || !("speechSynthesis" in window)) {
    return;
  }
  const language = getAnswerLanguage(currentResult);
  const steps = Array.isArray(currentResult.what_to_do) ? currentResult.what_to_do : [];
  let words = getHeadline(currentResult) + ". " + (currentResult.summary || "") + " ";
  if (steps.length > 0) {
    words += (language === "en" ? "What to do: " : "") + steps.join(" ");
  }
  const speech = new SpeechSynthesisUtterance(words);
  speech.lang = SPEECH_LANGUAGES[language] || language;
  speech.rate = 0.85;
  speechSynthesis.cancel();
  speechSynthesis.speak(speech);
});

// ---------- Ask family by text, and the trusted person ----------

// Phones can open a text message. Computers usually can't, so there we copy a message instead.
const IS_PHONE = /Android|iPhone|iPod/i.test(navigator.userAgent);

// A note under the family button, used on computers ("Copied! Paste it...").
const familyStatus = document.createElement("p");
familyStatus.className = "note family-status";
familyStatus.hidden = true;
document.querySelector(".result-buttons").after(familyStatus);

// The trusted person's phone number is only used on phones, so we hide that section on computers.
if (!IS_PHONE) {
  document.getElementById("trusted").hidden = true;
}

function updateFamilyLink() {
  const number = trustedNumber.value.replace(/[^0-9+]/g, "");
  const name = trustedName.value.trim();
  const message = (currentResult && currentResult.family_message) || DEFAULT_FAMILY_MESSAGE;
  familyStatus.hidden = true;
  if (IS_PHONE) {
    familyLink.href = "sms:" + number + "?body=" + encodeURIComponent(message);
    familyLink.textContent = name ? "Ask " + name + " by text" : "Ask family by text";
    trustedHint.hidden = number !== "";
  } else {
    familyLink.href = "#";
    familyLink.textContent = name ? "Copy a message for " + name : "Copy a message for family";
    trustedHint.hidden = true;
  }
}

// On computers: copy the family message plus the suspicious message, ready to paste anywhere.
familyLink.addEventListener("click", async function (event) {
  if (IS_PHONE) {
    return; // phones open the text app as normal
  }
  event.preventDefault();
  let text = (currentResult && currentResult.family_message) || DEFAULT_FAMILY_MESSAGE;
  if (currentText) {
    text += "\n\nHere's the message I got:\n\"" + currentText.slice(0, 1500) + "\"";
  }
  try {
    await navigator.clipboard.writeText(text);
    familyStatus.textContent = "Copied! Paste it into an email or message to someone you trust. Or just give them a call.";
  } catch (error) {
    familyStatus.textContent = "Copy this and send it to someone you trust:\n\n" + text;
  }
  familyStatus.hidden = false;
});

trustedName.value = recall("trusted-name");
trustedNumber.value = recall("trusted-number") || recall("family-number");

trustedName.addEventListener("input", function () {
  remember("trusted-name", trustedName.value);
  updateFamilyLink();
});

trustedNumber.addEventListener("input", function () {
  remember("trusted-number", trustedNumber.value);
  updateFamilyLink();
});

document.getElementById("trusted-remove").addEventListener("click", function () {
  trustedName.value = "";
  trustedNumber.value = "";
  forget("trusted-name");
  forget("trusted-number");
  forget("family-number");
  updateFamilyLink();
});

updateFamilyLink();

// ---------- Check another message ----------

document.getElementById("again-button").addEventListener("click", function () {
  resultBox.hidden = true;
  errorText.hidden = true;
  emptyText.hidden = false;
  messageBox.value = "";
  clearFileName();
  messageBox.scrollIntoView({ block: "center" });
  messageBox.focus();
});

// ---------- Gentle fade-in while scrolling ----------

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(function (entries) {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("shown");
        revealObserver.unobserve(entry.target);
      }
    }
  }, { threshold: 0.15 });

  for (const element of document.querySelectorAll(".reveal")) {
    revealObserver.observe(element);
  }
}
