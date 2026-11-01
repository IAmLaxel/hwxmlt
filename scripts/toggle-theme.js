document.documentElement.dataset.theme = savedTheme;

function toggleTheme() {
  const newTheme =
    document.documentElement.dataset.theme === "light" ? "dark" : "light";

  document.documentElement.dataset.theme = newTheme;
  localStorage.setItem("theme", newTheme);
}
