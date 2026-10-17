// Practice mode: "Spot the scam."
// Gemini writes 5 fresh practice messages. If it can't be reached,
// we use 5 of the built-in messages from practice-messages.js instead.

const practiceStart = document.getElementById("practice-start");
const practiceLoading = document.getElementById("practice-loading");
const practiceGame = document.getElementById("practice-game");
const practiceProgress = document.getElementById("practice-progress");
const practiceMessage = document.getElementById("practice-message");
const practiceButtons = document.getElementById("practice-buttons");
const practiceFeedback = document.getElementById("practice-feedback");
const practiceResult = document.getElementById("practice-result");
const practiceExplanation = document.getElementById("practice-explanation");
const practiceNext = document.getElementById("practice-next");
const practiceEnd = document.getElementById("practice-end");
const practiceScore = document.getElementById("practice-score");

let practiceQuestions = [];
let questionNumber = 0;
let score = 0;

practiceStart.addEventListener("click", startPractice);
document.getElementById("practice-again").addEventListener("click", startPractice);
document.getElementById("practice-scam").addEventListener("click", function () {
  answerQuestion(true);
});
document.getElementById("practice-safe").addEventListener("click", function () {
  answerQuestion(false);
});
practiceNext.addEventListener("click", function () {
  questionNumber = questionNumber + 1;
  if (questionNumber < practiceQuestions.length) {
    showQuestion();
  } else {
    showScore();
  }
});

async function startPractice() {
  practiceStart.hidden = true;
  practiceEnd.hidden = true;
  practiceGame.hidden = true;
  practiceLoading.hidden = false;

  try {
    const response = await fetch("/api/practice", { method: "POST" });
    if (!response.ok) {
      throw new Error("Practice failed");
    }
    const data = await response.json();
    if (!Array.isArray(data.questions) || data.questions.length === 0) {
      throw new Error("No questions");
    }
    practiceQuestions = data.questions;
  } catch (error) {
    practiceQuestions = pickRandom(PRACTICE_MESSAGES, 5);
  }

  practiceLoading.hidden = true;
  questionNumber = 0;
  score = 0;
  showQuestion();
}

function showQuestion() {
  const question = practiceQuestions[questionNumber];
  practiceProgress.textContent = "Message " + (questionNumber + 1) + " of " + practiceQuestions.length;
  practiceMessage.textContent = question.message;
  practiceButtons.hidden = false;
  practiceFeedback.hidden = true;
  practiceGame.hidden = false;
}

function answerQuestion(saidScam) {
  const question = practiceQuestions[questionNumber];
  const isRight = saidScam === question.is_scam;
  if (isRight) {
    score = score + 1;
  }

  practiceResult.textContent = isRight ? "Right!" : "Not quite.";
  practiceResult.className = "practice-result " + (isRight ? "right" : "wrong");

  let explanation = question.is_scam ? "This was a scam" : "This was safe";
  if (question.scam_type) {
    explanation += " (" + question.scam_type + ")";
  }
  practiceExplanation.textContent = explanation + ". " + (question.explanation || "");

  // Highlight the giveaways right in the message (uses the same function as the checker).
  const flags = (question.red_flags || []).map(function (phrase) {
    return { phrase: phrase };
  });
  practiceMessage.innerHTML = buildHighlightedHtml(question.message, flags);

  practiceButtons.hidden = true;
  practiceFeedback.hidden = false;
  practiceNext.textContent = questionNumber === practiceQuestions.length - 1 ? "See my score" : "Next message";
}

function showScore() {
  practiceGame.hidden = true;
  let cheer = "Keep practicing. Every scam you learn to spot makes you safer.";
  if (score === practiceQuestions.length) {
    cheer = "Perfect! You're a scam spotter.";
  } else if (score >= practiceQuestions.length - 1) {
    cheer = "Great job! You caught almost all of them.";
  }
  practiceScore.textContent = "You got " + score + " out of " + practiceQuestions.length + " right. " + cheer;
  practiceEnd.hidden = false;
}

function pickRandom(list, count) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temporary = copy[i];
    copy[i] = copy[j];
    copy[j] = temporary;
  }
  return copy.slice(0, count);
}
