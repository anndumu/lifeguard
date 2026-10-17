let savedTheme = null;
let savedTextSize = null;
try {
  savedTheme = localStorage.getItem("theme");
  savedTextSize = localStorage.getItem("text-size");
} catch (error) {}

if (savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
  document.documentElement.dataset.theme = "dark";
}

if (savedTextSize === "big") {
  document.documentElement.classList.add("big-text");
}

if ("IntersectionObserver" in window) {
  document.documentElement.classList.add("can-animate");
}

function saveSetting(name, value) {
  try {
    localStorage.setItem(name, value);
  } catch (error) {}
}

document.addEventListener("DOMContentLoaded", function () {
  const themeButton = document.getElementById("theme-button");
  const textSizeButton = document.getElementById("text-size-button");

  function updateButtons() {
    if (document.documentElement.dataset.theme === "dark") {
      themeButton.textContent = "Light mode";
    } else {
      themeButton.textContent = "Dark mode";
    }

    if (document.documentElement.classList.contains("big-text")) {
      textSizeButton.textContent = "Normal text";
    } else {
      textSizeButton.textContent = "Bigger text";
    }
  }

  themeButton.addEventListener("click", function () {
    if (document.documentElement.dataset.theme === "dark") {
      document.documentElement.dataset.theme = "light";
    } else {
      document.documentElement.dataset.theme = "dark";
    }
    saveSetting("theme", document.documentElement.dataset.theme);
    updateButtons();
  });

  textSizeButton.addEventListener("click", function () {
    document.documentElement.classList.toggle("big-text");
    if (document.documentElement.classList.contains("big-text")) {
      saveSetting("text-size", "big");
    } else {
      saveSetting("text-size", "normal");
    }
    updateButtons();
  });

  updateButtons();
});
