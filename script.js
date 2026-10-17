const messageBox = document.getElementById("message");
const photoInput = document.getElementById("photo");
const loadingText = document.getElementById("loading");
const errorText = document.getElementById("error");
const resultBox = document.getElementById("result");

const VERDICT_WORDS = {
  scam: "This is a scam",
  suspicious: "Be careful: this looks suspicious",
  safe: "This looks safe",
};

let currentResult = null;

for (const example of EXAMPLES) {
  const button = document.createElement("button");
  button.textContent = example.label;
  button.addEventListener("click", function () {
    messageBox.value = example.message;
    photoInput.value = "";
  });
  document.getElementById("examples").appendChild(button);
}

document.getElementById("check-button").addEventListener("click", function () {
  const photo = photoInput.files[0];

  if (photo) {
    if (photo.size > 3000000) {
      showError("That picture is too big. Please try a smaller screenshot.");
      return;
    }
    const reader = new FileReader();
    reader.onload = function () {
      const base64 = reader.result.split(",")[1];
      checkMessage({ image: base64, mimeType: photo.type });
    };
    reader.readAsDataURL(photo);
  } else if (messageBox.value.trim() !== "") {
    checkMessage({ text: messageBox.value });
  } else {
    showError("Please paste a message or upload a screenshot first.");
  }
});

async function checkMessage(input) {
  resultBox.hidden = true;
  errorText.hidden = true;
  loadingText.hidden = false;

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
      showError("Sorry, Lifeguard couldn't check that right now. Please try again in a minute.");
    }
  }

  loadingText.hidden = true;
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
    addListItem(flagList, "No red flags found.");
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
  loadingText.hidden = true;
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
