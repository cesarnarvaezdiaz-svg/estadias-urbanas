const currencyRatesFromUsd = {
  USD: 1,
  EUR: 0.92,
  CLP: 950,
  MXN: 17,
  COP: 4050
};

const currencyMeta = {
  USD: { locale: "en-US", currency: "USD", label: "USD / noche" },
  EUR: { locale: "es-ES", currency: "EUR", label: "EUR / noche" },
  CLP: { locale: "es-CL", currency: "CLP", label: "CLP / noche" },
  MXN: { locale: "es-MX", currency: "MXN", label: "MXN / noche" },
  COP: { locale: "es-CO", currency: "COP", label: "COP / noche" }
};

function formatConvertedPrice(valueUsd, currency) {
  const meta = currencyMeta[currency] || currencyMeta.USD;
  const rate = currencyRatesFromUsd[currency] || 1;
  const converted = Number(valueUsd || 0) * rate;

  return new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency: meta.currency,
    maximumFractionDigits: currency === "USD" || currency === "EUR" ? 0 : 0
  }).format(converted);
}

window.updatePrices = function () {
  const selector = document.getElementById("currency-select");
  const currency = selector?.value || "USD";
  const meta = currencyMeta[currency] || currencyMeta.USD;

  document.querySelectorAll(".precio-dinamico").forEach((box) => {
    const valueUsd = Number(box.getAttribute("data-price-usd") || box.getAttribute("data-precio") || 0);
    const output = box.querySelector("[data-price-output]") || box.querySelector("strong");
    const label = box.querySelector(".currency-label");

    if (output) output.textContent = formatConvertedPrice(valueUsd, currency);
    if (label) label.textContent = meta.label;
  });

  try {
    localStorage.setItem("urban.currency", currency);
    localStorage.setItem("monedaElegida", currency);
  } catch {
    // noop
  }
};

window.addEventListener("DOMContentLoaded", () => {
  const selector = document.getElementById("currency-select");
  if (!selector) return;

  const saved = localStorage.getItem("urban.currency") || localStorage.getItem("monedaElegida") || "USD";
  if (currencyRatesFromUsd[saved]) selector.value = saved;

  selector.addEventListener("change", window.updatePrices);
  window.updatePrices();
  document.addEventListener("urban:properties:rendered", window.updatePrices);
});
