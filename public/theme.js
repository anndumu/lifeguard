let savedTheme = null;
try {
  savedTheme = localStorage.getItem("theme");
} catch (error) {}

if (savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
  document.documentElement.dataset.theme = "dark";
}

if ("IntersectionObserver" in window) {
  document.documentElement.classList.add("can-animate");
}

document.addEventListener("DOMContentLoaded", function () {
  const themeButton = document.getElementById("theme-button");

  function updateThemeButton() {
    if (document.documentElement.dataset.theme === "dark") {
      themeButton.textContent = "Light mode";
    } else {
      themeButton.textContent = "Dark mode";
    }
  }

  themeButton.addEventListener("click", function () {
    if (document.documentElement.dataset.theme === "dark") {
      document.documentElement.dataset.theme = "light";
    } else {
      document.documentElement.dataset.theme = "dark";
    }
    try {
      localStorage.setItem("theme", document.documentElement.dataset.theme);
    } catch (error) {}
    updateThemeButton();
  });

  updateThemeButton();
});
