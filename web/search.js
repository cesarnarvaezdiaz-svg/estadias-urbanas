/* search.js - versión corregida sin pegado */

document.addEventListener("DOMContentLoaded", () => {
  const heroForm = document.querySelector("#search-form");
  const globalForm = document.querySelector("#global-search-form");
  const propertiesGrid = document.querySelector("#properties-grid") || document.querySelector("#propiedades-lista");
  const sortSelect = document.querySelector("#property-sort");
  const cityInput = document.querySelector("#property-city-query");
  const wifiCheckbox = document.querySelector("#property-only-wifi");
  const propertiesMsg = document.querySelector("#properties-msg");
  const searchMsg = document.querySelector("#search-msg");
  const globalMsg = document.querySelector("#global-search-msg");

  if (!propertiesGrid) return;

  let isFiltering = false;
  let lastFilterTimer = null;

  function normalizar(texto) {
    return String(texto || "")
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function obtenerTarjetas() {
    return Array.from(propertiesGrid.querySelectorAll(".property-card, .property-card-pro"));
  }

  function obtenerPrecio(card) {
    const precioData = card.dataset.price || card.dataset.precio;
    if (precioData) return Number(precioData) || 0;

    const texto = card.innerText.replace(/\./g, "");
    const match = texto.match(/([0-9]{2,9})/);
    return match ? Number(match[1]) : 0;
  }

  function tieneWifi(card) {
    const texto = normalizar(card.innerText);
    return texto.includes("wifi") || texto.includes("wi-fi") || texto.includes("internet");
  }

  function setMensaje(elemento, mensaje) {
    if (elemento) elemento.textContent = mensaje;
  }

  function filtrarPropiedades() {
    if (isFiltering) return;

    isFiltering = true;

    const cards = obtenerTarjetas();
    const ciudad = normalizar(cityInput?.value);
    const soloWifi = Boolean(wifiCheckbox?.checked);
    const modoOrden = sortSelect?.value || "recommended";

    let visibles = [];

    cards.forEach((card) => {
      const texto = normalizar(card.innerText);

      const coincideCiudad = !ciudad || texto.includes(ciudad);
      const coincideWifi = !soloWifi || tieneWifi(card);

      const visible = coincideCiudad && coincideWifi;

      card.hidden = !visible;

      if (visible) visibles.push(card);
    });

    if (modoOrden !== "recommended") {
      visibles.sort((a, b) => {
        const precioA = obtenerPrecio(a);
        const precioB = obtenerPrecio(b);

        if (modoOrden === "price-asc") return precioA - precioB;
        if (modoOrden === "price-desc") return precioB - precioA;

        return 0;
      });

      const fragment = document.createDocumentFragment();
      visibles.forEach((card) => fragment.appendChild(card));
      propertiesGrid.appendChild(fragment);
    }

    if (visibles.length === 0) {
      setMensaje(propertiesMsg, "No encontramos propiedades con esos filtros.");
    } else {
      setMensaje(propertiesMsg, `Mostrando ${visibles.length} de ${cards.length} propiedades.`);
    }

    isFiltering = false;
  }

  function filtrarConPausa() {
    clearTimeout(lastFilterTimer);
    lastFilterTimer = setTimeout(filtrarPropiedades, 250);
  }

  function buscarDesdeHero(event) {
    event.preventDefault();

    const destino = heroForm.querySelector('[name="destino"]')?.value || "";
    const checkin = document.querySelector("#checkin-date")?.value || "";
    const checkout = document.querySelector("#checkout-date")?.value || "";
    const fechas = checkin && checkout ? `${checkin} al ${checkout}` : "";
    const huespedes = heroForm.querySelector('[name="huespedes"]')?.value || "";

    if (cityInput) cityInput.value = destino;

    filtrarPropiedades();

    setMensaje(
      searchMsg,
      `Buscando ${destino || "propiedades"} · ${fechas || "fechas flexibles"} · ${huespedes || "1"} huésped(es).`
    );

    document.querySelector("#propiedades")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function buscarDesdeGlobal(event) {
    event.preventDefault();

    const busqueda =
      globalForm.querySelector('[name="query"]')?.value ||
      globalForm.querySelector("#global-city-select")?.value ||
      "";

    if (cityInput) cityInput.value = busqueda;

    filtrarPropiedades();

    setMensaje(globalMsg, `Filtrando propiedades por: ${busqueda || "todas"}.`);

    document.querySelector("#propiedades")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  heroForm?.addEventListener("submit", buscarDesdeHero);
  globalForm?.addEventListener("submit", buscarDesdeGlobal);
  cityInput?.addEventListener("input", filtrarConPausa);
  wifiCheckbox?.addEventListener("change", filtrarPropiedades);
  sortSelect?.addEventListener("change", filtrarPropiedades);

  // setTimeout(filtrarPropiedades, 800);
  // 🔥 FORZAR IMÁGENES REALES EN PROPIEDADES
setTimeout(() => {
  const cards = document.querySelectorAll("#properties-grid .property-card, #propiedades-lista .property-card-pro");

  const fotos = [
    "assets/cities/santiago.jpg",
    "assets/cities/iquique.jpg",
    "assets/cities/rio.jpg"
  ];

  cards.forEach((card, i) => {
    if (!fotos[i]) return;

    let img = card.querySelector("img");

    if (!img) {
      img = document.createElement("img");
      card.prepend(img);
    }

    img.src = fotos[i];
    img.style.width = "100%";
    img.style.height = "180px";
    img.style.objectFit = "cover";
    img.style.borderRadius = "12px";
    img.style.marginBottom = "10px";
  });
}, 1200);
});
