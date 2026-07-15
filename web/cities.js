document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("destino-input");
  const results = document.getElementById("city-results");

  if (!input || !results) return;

  const cities = state.cities.map(c => c.name);

  input.addEventListener("input", () => {
    const value = input.value.toLowerCase();

    if (!value) {
      results.style.display = "none";
      return;
    }

    const filtered = cities.filter(c =>
      c.toLowerCase().includes(value)
    );

    results.innerHTML = filtered
      .map(c => `<div>${c}</div>`)
      .join("");

    results.style.display = "block";
  });

  results.addEventListener("click", (e) => {
    if (e.target.tagName === "DIV") {
      input.value = e.target.textContent;
      results.style.display = "none";
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".custom-select")) {
      results.style.display = "none";
    }
  });
});