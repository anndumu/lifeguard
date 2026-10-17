const messageBox = document.getElementById("message");
const photoInput = document.getElementById("photo");
const photoName = document.getElementById("photo-name");
const answerBox = document.getElementById("answer");
const emptyText = document.getElementById("empty");
const loadingText = document.getElementById("loading");
const errorText = document.getElementById("error");
const resultBox = document.getElementById("result");

const VERDICT_WORDS = {
  scam: "Red flag: this is a scam",
  suspicious: "Yellow flag: be careful",
  safe: "Green flag: this looks safe",
};

let currentResult = null;

for (const example of EXAMPLES) {
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
    clearPhoto();
    checkMessage({ text: example.message });
  });
  document.getElementById("examples").appendChild(card);
}

photoInput.addEventListener("change", function () {
  const photo = photoInput.files[0];
  if (!photo) {
    return;
  }

  photoName.textContent = "Screenshot: " + photo.name;
  photoName.hidden = false;

  if (photo.size > 3000000) {
    showError("That picture is too large. Try a smaller screenshot.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function () {
    const base64 = reader.result.split(",")[1];
    checkMessage({ image: base64, mimeType: photo.type });
  };
  reader.readAsDataURL(photo);
  photoInput.value = "";
});

function clearPhoto() {
  photoInput.value = "";
  photoName.hidden = true;
}

document.getElementById("check-button").addEventListener("click", function () {
  if (messageBox.value.trim() !== "") {
    clearPhoto();
    checkMessage({ text: messageBox.value });
  } else {
    showError("Paste a message first, or check a screenshot instead.");
  }
});

async function checkMessage(input) {
  emptyText.hidden = true;
  resultBox.hidden = true;
  errorText.hidden = true;
  loadingText.hidden = false;
  showAnswerBox();

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
    const backup = findBackup(input.text);
    if (backup) {
      showResult(backup, input.text);
    } else {
      showError("Lifeguard couldn't check this right now. Wait a minute, then press \"Check this message\" again.");
    }
  }

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
  for (const example of EXAMPLES) {
    if (example.message === text) {
      return example.backup;
    }
  }
  return null;
}

function showResult(result, originalText) {
  currentResult = result;
  const redFlags = result.red_flags || [];
  const steps = result.what_to_do || [];

  document.getElementById("verdict-banner").className = result.verdict;
  document.getElementById("verdict").textContent = VERDICT_WORDS[result.verdict];
  document.getElementById("summary").textContent = result.summary;

  const messageSection = document.getElementById("message-section");
  if (originalText) {
    let html = escapeHtml(originalText);
    for (const flag of redFlags) {
      if (flag.phrase) {
        const phrase = escapeHtml(flag.phrase);
        html = html.split(phrase).join("<mark>" + phrase + "</mark>");
      }
    }
    document.getElementById("highlighted-message").innerHTML = html;
    messageSection.hidden = false;
  } else {
    messageSection.hidden = true;
  }

  const flagList = document.getElementById("red-flags");
  flagList.innerHTML = "";
  for (const flag of redFlags) {
    addListItem(flagList, "\"" + flag.phrase + "\": " + flag.reason);
  }
  if (redFlags.length === 0) {
    addListItem(flagList, "No warning signs found.");
  }

  const stepList = document.getElementById("what-to-do");
  stepList.innerHTML = "";
  for (const step of steps) {
    addListItem(stepList, step);
  }

  resultBox.hidden = false;
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
}

function escapeHtml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

document.getElementById("read-button").addEventListener("click", function () {
  const words = VERDICT_WORDS[currentResult.verdict] + ". " + currentResult.summary + " What to do: " + currentResult.what_to_do.join(" ");
  const speech = new SpeechSynthesisUtterance(words);
  speech.rate = 0.85;
  speechSynthesis.cancel();
  speechSynthesis.speak(speech);
});

document.getElementById("family-button").addEventListener("click", function () {
  window.location.href = "sms:?&body=" + encodeURIComponent(currentResult.family_message);
});

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
