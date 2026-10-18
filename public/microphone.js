// "Say it out loud": records from the microphone, then Gemini listens and checks it.
// The recording is sent once to be checked and is never saved.

const micButton = document.getElementById("mic-button");
const micStatus = document.getElementById("mic-status");
const MAX_SECONDS = 60;

let recorder = null;
let recordedChunks = [];
let secondsRecorded = 0;
let recordingTimer = null;

micButton.addEventListener("click", function () {
  if (recorder && recorder.state === "recording") {
    recorder.stop();
  } else {
    startRecording();
  }
});

async function startRecording() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
    showError("This browser can't record sound. Try the voicemail button instead.");
    return;
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    showError("Lifeguard needs permission to use your microphone. Tap \"Allow\" when your browser asks, then try again.");
    return;
  }

  recordedChunks = [];
  recorder = new MediaRecorder(stream);
  recorder.ondataavailable = function (event) {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };
  recorder.onstop = function () {
    clearInterval(recordingTimer);
    // Turn the microphone off right away.
    for (const track of stream.getTracks()) {
      track.stop();
    }
    showRecording(false);
    sendRecording(recorder.mimeType);
  };

  recorder.start();
  secondsRecorded = 0;
  showRecording(true);
  recordingTimer = setInterval(function () {
    secondsRecorded = secondsRecorded + 1;
    showRecording(true);
    if (secondsRecorded >= MAX_SECONDS) {
      recorder.stop();
    }
  }, 1000);
}

function showRecording(isRecording) {
  if (isRecording) {
    micButton.textContent = "Stop and check";
    micButton.classList.add("recording");
    micStatus.textContent = "Recording " + formatTime(secondsRecorded) + ". Read the message out loud, then tap \"Stop and check.\"";
    micStatus.hidden = false;
  } else {
    micButton.textContent = "Or say it out loud";
    micButton.classList.remove("recording");
    micStatus.hidden = true;
  }
}

function formatTime(seconds) {
  return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
}

function sendRecording(recordedType) {
  const recording = new Blob(recordedChunks, { type: recordedType });
  if (secondsRecorded < 1 || recording.size < 1000) {
    showError("We didn't catch that. Tap \"Or say it out loud,\" speak clearly, then tap \"Stop and check.\"");
    return;
  }
  if (recording.size > MAX_FILE_SIZE) {
    showError("That recording is too long. Please try a shorter one.");
    return;
  }

  // iPhones record in a different format than other phones, so we tell Gemini which one it is.
  let mimeType = "audio/webm";
  if (recordedType.includes("mp4") || recordedType.includes("aac")) {
    mimeType = "audio/m4a";
  } else if (recordedType.includes("ogg")) {
    mimeType = "audio/ogg";
  }

  messageBox.value = "";
  clearFileName();
  readAsBase64(recording, function (base64) {
    checkMessage({ audio: base64, mimeType: mimeType, source: "microphone" });
  });
}
