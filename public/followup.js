// "Have a question? Ask Lifeguard": a short chat about the message that was just checked.
// The conversation lives only in this page's memory. It is never saved anywhere.

const followupList = document.getElementById("followup-list");
const followupInput = document.getElementById("followup-input");
const followupButton = document.getElementById("followup-button");

let followupHistory = [];

// Answers we can always give, even if Gemini can't be reached.
const FALLBACK_ANSWERS = {
  "What should I do if I already clicked?": "Stay calm. Don't type anything else on that page. If you entered a password, change it. If you shared bank or card details, call your bank using the number on your card. You can also report it at ReportFraud.ftc.gov.",
  "How do I report this?": "You can report scams to the FTC at ReportFraud.ftc.gov. For free help by phone, call the AARP Fraud Watch Network Helpline at 877-908-3360, weekdays 8am to 8pm. Then delete the message.",
  "Is it safe to call them back?": "Don't use any number from the message. If you're worried, look up the company's real number on your bill, your card, or their official website, and call that instead.",
};
const GENERIC_ANSWER = "Lifeguard couldn't answer right now. When in doubt, don't reply or click anything, and check with someone you trust.";

function resetFollowup() {
  followupHistory = [];
  followupList.innerHTML = "";
  followupInput.value = "";
}

for (const chip of document.querySelectorAll(".chip")) {
  chip.addEventListener("click", function () {
    askFollowup(chip.textContent);
  });
}

followupButton.addEventListener("click", function () {
  const question = followupInput.value.trim();
  if (question !== "") {
    askFollowup(question);
  }
});

followupInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    followupButton.click();
  }
});

async function askFollowup(question) {
  if (!currentResult) {
    return;
  }
  followupInput.value = "";
  addBubble("user", question);
  followupHistory.push({ role: "user", text: question });
  const answerBubble = addBubble("model", "Lifeguard is thinking...");
  followupButton.disabled = true;

  let answer = "";
  try {
    const response = await fetch("/api/followup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: currentText,
        result: {
          verdict: currentResult.verdict,
          summary: currentResult.summary,
          red_flags: currentResult.red_flags,
          what_to_do: currentResult.what_to_do,
        },
        history: followupHistory,
      }),
    });
    if (!response.ok) {
      throw new Error("Follow-up failed");
    }
    const data = await response.json();
    answer = data.answer || GENERIC_ANSWER;
  } catch (error) {
    answer = FALLBACK_ANSWERS[question] || GENERIC_ANSWER;
  }

  answerBubble.textContent = answer;
  followupHistory.push({ role: "model", text: answer });
  followupButton.disabled = false;
}

function addBubble(role, text) {
  const bubble = document.createElement("p");
  bubble.className = "bubble " + role;
  bubble.textContent = text;
  followupList.appendChild(bubble);
  return bubble;
}
