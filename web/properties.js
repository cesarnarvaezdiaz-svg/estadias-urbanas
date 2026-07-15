const photoSet = (folder, files) => files.map((file) => `fotos agustinas plaza/${folder}/${file}`);

const uniquePhotos = (photos) => {
  const seen = new Set();
  return photos.filter((photo) => {
    const key = String(photo)
      .split("/")
      .pop()
      .toLowerCase()
      .replace(/\s+-\s+copia(?=\.)/g, "")
      .trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const agustinasGeneralPhotos = photoSet("fotos generales", [
  "WhatsApp Image 2026-02-05 at 17.40.29.jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.31.jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.32 (1).jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.32.jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.33 (1).jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.33.jpeg"
]);

const agustinasDoublePhotos = photoSet("Departamento 1 o 2 personas, 1 habitacion ( 1 cama doble ), 1 baño, sala y cocina americana", [
  "WhatsApp Image 2026-02-05 at 17.40.34 (1).jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.34.jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.41.jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.42 (1).jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.42 (2).jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.42.jpeg"
]);

const agustinasTwinPhotos = photoSet("Departamento 2 personas, 1 habitacion ( 2 camas single ), 1 baño, sala y cocina americana", [
  "1000139316.jpg",
  "1000139319.jpg",
  "1000139321.jpg",
  "1000139325.jpg",
  "1000139327.jpg",
  "1000139329.jpg",
  "1000139331.jpg",
  "1000139333.jpg"
]);

const agustinasDoubleSinglePhotos = photoSet("Departamento 3 personas, 2 habitaciones ( 1 cama doble 1 cama single ), 1 baño, sala y cocina americana", [
  "WhatsApp Image 2026-02-05 at 17.40.47.jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.48 (1).jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.48 (2).jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.48.jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.49.jpeg"
]);

const agustinasThreeSinglePhotos = photoSet("Departamento 3 personas, 2 habitaciones ( 3 camas single ), 1 baño, sala y cocina americana", [
  "WhatsApp Image 2026-02-05 at 17.40.42.jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.43 (1).jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.43.jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.44.jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.45.jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.46.jpeg"
]);

const agustinasFourMixedPhotos = photoSet("Departamento 4 personas, 2 habitaciones ( 1 cama doble y 2 camas single ), 1 baño, sala y cocina americana", [
  "WhatsApp Image 2026-02-05 at 17.40.50 (1).jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.50 (2).jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.50.jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.52 (1).jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.52 (2).jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.52.jpeg"
]);

const agustinasFourSinglePhotos = photoSet("Departamento 4 personas, 2 habitaciones ( 4 camas single ), 2 baño, sala y cocina americana", [
  "WhatsApp Image 2026-02-05 at 17.40.43 (1).jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.43.jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.44.jpeg",
  "WhatsApp Image 2026-02-05 at 17.40.46.jpeg"
]);

const agustinasRoomPhotos = [
  agustinasDoublePhotos,
  agustinasTwinPhotos,
  agustinasDoubleSinglePhotos,
  agustinasThreeSinglePhotos,
  agustinasFourMixedPhotos,
  agustinasFourSinglePhotos
];

const agustinasPhotos = uniquePhotos([...agustinasGeneralPhotos, ...agustinasRoomPhotos.flat()]);

function requirePropertyAuth(message) {
  if (window.UrbanAuth?.requireAuth) return window.UrbanAuth.requireAuth(message);
  window.UrbanAuth?.openModal?.("login");
  return false;
}

const agustinasOptions = [
  {
    title: "Departamento 1 o 2 personas - cama doble",
    occupancy: "1 a 2 personas",
    beds: "1 cama doble",
    rooms: "1 habitación",
    baths: "1 baño",
    price: 70,
    image: agustinasDoublePhotos[0],
    gallery: agustinasDoublePhotos,
    highlights: ["Cocina americana", "Sala", "Baño privado"]
  },
  {
    title: "Departamento 2 personas - dos camas single",
    occupancy: "2 personas",
    beds: "2 camas single",
    rooms: "1 habitación",
    baths: "1 baño",
    price: 72,
    image: agustinasTwinPhotos[0],
    gallery: agustinasTwinPhotos,
    highlights: ["Cocina americana", "Ideal trabajo", "Baño privado"]
  },
  {
    title: "Departamento 3 personas - cama doble y single",
    occupancy: "3 personas",
    beds: "1 cama doble + 1 single",
    rooms: "2 habitaciones",
    baths: "1 baño",
    price: 92,
    image: agustinasDoubleSinglePhotos[0],
    gallery: agustinasDoubleSinglePhotos,
    highlights: ["2 habitaciones", "Cocina americana", "Sala"]
  },
  {
    title: "Departamento 3 personas - tres camas single",
    occupancy: "3 personas",
    beds: "3 camas single",
    rooms: "2 habitaciones",
    baths: "1 baño",
    price: 92,
    image: agustinasThreeSinglePhotos[0],
    gallery: agustinasThreeSinglePhotos,
    highlights: ["2 habitaciones", "Flexible para equipos", "Baño privado"]
  },
  {
    title: "Departamento 4 personas - cama doble y dos single",
    occupancy: "4 personas",
    beds: "1 cama doble + 2 single",
    rooms: "2 habitaciones",
    baths: "1 baño",
    price: 110,
    image: agustinasFourMixedPhotos[0],
    gallery: agustinasFourMixedPhotos,
    highlights: ["2 habitaciones", "Familias", "Cocina americana"]
  },
  {
    title: "Departamento 4 personas - cuatro camas single",
    occupancy: "4 personas",
    beds: "4 camas single",
    rooms: "2 habitaciones",
    baths: "2 baños",
    price: 118,
    image: agustinasFourSinglePhotos[0],
    gallery: agustinasFourSinglePhotos,
    highlights: ["2 baños", "Equipos de trabajo", "Mayor comodidad"]
  }
];

const propertyCopy = {
  es: {
    agustinasDescription: "Departamentos equipados en Santiago Centro para 1 a 4 personas, con cocina americana, sala, baño privado y opciones de cama doble o camas single.",
    guatavitaDescription: "A pasos de todo, totalmente equipado, ideal para descanso o trabajo.",
    guests: "huéspedes",
    from: "Desde",
    night: "/ noche",
    details: "Ver detalles",
    reserve: "Reservar",
    reviewLabel: "Fabuloso",
    comments: "comentarios",
    distanceCenter: "A {distance} km del centro",
    roomAbbrev: "hab.",
    directBadge: "Disponible para reserva directa",
    features: ["WiFi gratis", "Cocina equipada", "Check-in flexible", "Opciones 1 y 2 habitaciones"],
    guatavitaFeatures: ["WiFi gratis", "Vista natural", "Soporte por WhatsApp"]
  },
  en: {
    agustinasDescription: "Furnished apartments in Santiago Centro for 1 to 4 guests, with kitchenette, living room, private bathroom and double or twin bed options.",
    guatavitaDescription: "Close to everything, fully equipped, ideal for rest or work.",
    guests: "guests",
    from: "From",
    night: "/ night",
    details: "View details",
    reserve: "Book",
    reviewLabel: "Excellent",
    comments: "reviews",
    distanceCenter: "{distance} km from downtown",
    roomAbbrev: "rooms",
    directBadge: "Available for direct booking",
    features: ["Free WiFi", "Equipped kitchen", "Flexible check-in", "1 and 2 bedroom options"],
    guatavitaFeatures: ["Free WiFi", "Nature view", "WhatsApp support"]
  },
  pt: {
    agustinasDescription: "Apartamentos equipados em Santiago Centro para 1 a 4 pessoas, com cozinha americana, sala, banheiro privativo e opções de cama de casal ou camas individuais.",
    guatavitaDescription: "Perto de tudo, totalmente equipado, ideal para descanso ou trabalho.",
    guests: "hóspedes",
    from: "Desde",
    night: "/ noite",
    details: "Ver detalhes",
    reserve: "Reservar",
    reviewLabel: "Fantástico",
    comments: "comentários",
    distanceCenter: "A {distance} km do centro",
    roomAbbrev: "quartos",
    directBadge: "Disponível para reserva direta",
    features: ["WiFi grátis", "Cozinha equipada", "Check-in flexível", "Opções de 1 e 2 quartos"],
    guatavitaFeatures: ["WiFi grátis", "Vista natural", "Suporte por WhatsApp"]
  }
};

const properties = [
  {
    title: "Apart Hotel Agustinas Plaza",
    city: "Santiago",
    location: "Santiago Centro",
    price: 70,
    minRooms: 1,
    maxRooms: 2,
    minBeds: 1,
    maxBeds: 4,
    image: agustinasPhotos[0],
    gallery: agustinasPhotos,
    descriptionKey: "agustinasDescription",
    guests: "1 a 4",
    rating: 4.8,
    reviewLabel: "Fabuloso",
    reviews: 436,
    type: "Departamento",
    distance: "A 0,6 km del centro",
    distanceKm: "0,6",
    featured: true,
    featuresKey: "features",
    options: agustinasOptions,
    unavailableRanges: []
  },
  {
    title: "Balcones de Guatavita",
    city: "Guatavita",
    location: "Cundinamarca",
    price: 70,
    minRooms: 1,
    maxRooms: 1,
    minBeds: 1,
    maxBeds: 2,
    image: "assets/cities/guatavita1.jpg",
    gallery: ["assets/cities/guatavita1.jpg"],
    descriptionKey: "guatavitaDescription",
    guests: 2,
    rating: 4.8,
    reviewLabel: "Fabuloso",
    reviews: 47,
    type: "Hospedaje",
    distance: "A 0,3 km del centro",
    distanceKm: "0,3",
    featured: false,
    featuresKey: "guatavitaFeatures",
    unavailableRanges: []
  }
];

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function currentPropertyCopy() {
  const lang = window.UrbanI18n?.getLang?.() || "es";
  return propertyCopy[lang] || propertyCopy.es;
}

function propertyId(property) {
  return String(property.title || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function savedPropertyIds() {
  try {
    return JSON.parse(sessionStorage.getItem("urban.savedProperties") || "[]");
  } catch (error) {
    return [];
  }
}

function setSavedPropertyIds(ids) {
  sessionStorage.setItem("urban.savedProperties", JSON.stringify([...new Set(ids)]));
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseFirstNumber(value, fallback = 0) {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : fallback;
}

function propertyStats(property) {
  const options = Array.isArray(property.options) ? property.options : [];
  const prices = [property.price, ...options.map((option) => option.price)].map(Number).filter((value) => Number.isFinite(value) && value > 0);
  const roomCounts = [
    property.minRooms,
    property.maxRooms,
    ...options.map((option) => parseFirstNumber(option.rooms))
  ].map(Number).filter((value) => Number.isFinite(value) && value > 0);
  const bedCounts = [
    property.minBeds,
    property.maxBeds,
    ...options.map((option) => parseFirstNumber(option.beds))
  ].map(Number).filter((value) => Number.isFinite(value) && value > 0);

  return {
    minPrice: prices.length ? Math.min(...prices) : Number(property.price || 0),
    maxRooms: roomCounts.length ? Math.max(...roomCounts) : Number(property.maxRooms || property.minRooms || 1),
    maxBeds: bedCounts.length ? Math.max(...bedCounts) : Number(property.maxBeds || property.minBeds || 1)
  };
}

function dateRangesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function propertyAvailableForDates(property, checkin, checkout) {
  if (!checkin || !checkout) return true;
  const start = new Date(`${checkin}T00:00:00`);
  const end = new Date(`${checkout}T00:00:00`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return true;

  const ranges = Array.isArray(property.unavailableRanges) ? property.unavailableRanges : [];
  return !ranges.some((range) => {
    const busyStart = new Date(`${range.start}T00:00:00`);
    const busyEnd = new Date(`${range.end}T00:00:00`);
    if (!Number.isFinite(busyStart.getTime()) || !Number.isFinite(busyEnd.getTime())) return false;
    return dateRangesOverlap(start, end, busyStart, busyEnd);
  });
}

function readPropertyFilters() {
  const form = document.querySelector("#property-filters");
  if (!form) {
    const searchForm = document.querySelector("#search-form");
    if (!searchForm) return {};
    const data = new FormData(searchForm);
    return {
      city: String(data.get("destino") || "").trim(),
      price: Number(data.get("price") || 0),
      rooms: Number(data.get("rooms") || 0),
      beds: Number(data.get("beds") || 0),
      type: String(data.get("type") || "").trim(),
      checkin: String(data.get("checkin") || document.querySelector("#checkin-date")?.value || "").trim(),
      checkout: String(data.get("checkout") || document.querySelector("#checkout-date")?.value || "").trim()
    };
  }
  const data = new FormData(form);
  return {
    city: String(data.get("city") || "").trim(),
    price: Number(data.get("price") || 0),
    rooms: Number(data.get("rooms") || 0),
    beds: Number(data.get("beds") || 0),
    type: String(data.get("type") || "").trim(),
    checkin: String(data.get("checkin") || "").trim(),
    checkout: String(data.get("checkout") || "").trim()
  };
}

function updatePropertyFilterSummary(visible, total) {
  const summary = document.querySelector("#property-filter-summary");
  if (!summary) return;
  summary.textContent = visible === total
    ? `${total} alojamientos disponibles.`
    : `${visible} de ${total} alojamientos coinciden con tus filtros.`;
}

function applyPropertyFilters() {
  const filters = readPropertyFilters();
  const cards = Array.from(document.querySelectorAll("#propiedades-lista .property-card-pro"));
  let visible = 0;

  cards.forEach((card) => {
    const property = properties.find((item) => propertyId(item) === card.dataset.propertyId);
    const isAvailable = property ? propertyAvailableForDates(property, filters.checkin, filters.checkout) : true;
    card.dataset.available = isAvailable ? "1" : "0";

    const cityOk = !filters.city || normalizeText(card.dataset.city) === normalizeText(filters.city);
    const typeOk = !filters.type || normalizeText(card.dataset.type) === normalizeText(filters.type);
    const priceOk = !filters.price || Number(card.dataset.minPrice || card.dataset.price || 0) <= filters.price;
    const roomsOk = !filters.rooms || Number(card.dataset.rooms || 0) >= filters.rooms;
    const bedsOk = !filters.beds || Number(card.dataset.beds || 0) >= filters.beds;
    const datesOk = !filters.checkin || !filters.checkout || isAvailable;
    const shouldShow = cityOk && typeOk && priceOk && roomsOk && bedsOk && datesOk;

    card.hidden = !shouldShow;
    card.classList.toggle("is-filtered-out", !shouldShow);
    if (shouldShow) visible += 1;
  });

  updatePropertyFilterSummary(visible, cards.length);
  document.dispatchEvent(new CustomEvent("urban:properties:filtered", { detail: { filters, visible } }));
}

function hydratePropertyFilterOptions() {
  const citySelect = document.querySelector("#filter-city");
  const typeSelect = document.querySelector("#filter-type");
  if (!citySelect || !typeSelect) return;

  const currentCity = citySelect.value;
  const currentType = typeSelect.value;
  const cities = [...new Set(properties.map((property) => property.city).filter(Boolean))].sort();
  const types = [...new Set(properties.map((property) => property.type).filter(Boolean))].sort();

  citySelect.innerHTML = `<option value="">Todas</option>${cities.map((city) => `<option value="${escapeHtml(city)}">${escapeHtml(city)}</option>`).join("")}`;
  typeSelect.innerHTML = `<option value="">Todos</option>${types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join("")}`;
  citySelect.value = cities.includes(currentCity) ? currentCity : "";
  typeSelect.value = types.includes(currentType) ? currentType : "";
}

function bindPropertyFilters() {
  const form = document.querySelector("#property-filters");
  if (!form) {
    const searchForm = document.querySelector("#search-form");
    if (!searchForm || searchForm.dataset.propertyFiltersBound === "true") return;
    searchForm.dataset.propertyFiltersBound = "true";
    searchForm.addEventListener("input", applyPropertyFilters);
    searchForm.addEventListener("change", applyPropertyFilters);
    return;
  }
  if (form.dataset.bound === "true") return;
  form.dataset.bound = "true";

  form.addEventListener("input", applyPropertyFilters);
  form.addEventListener("change", applyPropertyFilters);
  document.querySelector("#filter-reset")?.addEventListener("click", () => {
    form.reset();
    sessionStorage.removeItem("urban.activeCityFilter");
    applyPropertyFilters();
  });
}

function applyPropertyCityFilter(city) {
  const citySelect = document.querySelector("#filter-city");
  if (citySelect) {
    citySelect.value = [...citySelect.options].some((option) => normalizeText(option.value) === normalizeText(city))
      ? city
      : "";
  } else {
    const destination = document.querySelector("#destino-select");
    if (destination && [...destination.options].some((option) => normalizeText(option.value) === normalizeText(city))) {
      destination.value = city;
    }
  }
  applyPropertyFilters();
}

function bindSearchFormCityFilter() {
  const form = document.querySelector("#search-form");
  if (!form) return;

  form.addEventListener("submit", () => {
    const selectedCity = String(new FormData(form).get("destino") || "").trim();
    if (!selectedCity) return;

    sessionStorage.setItem("urban.activeCityFilter", selectedCity);
    setTimeout(() => applyPropertyCityFilter(selectedCity), 0);
  });
}

function ratingStars(rating) {
  const rounded = Math.round(Number(rating || 0));
  return Array.from({ length: 5 }, (_, index) =>
    `<span class="${index < rounded ? "is-filled" : ""}" aria-hidden="true">&#9733;</span>`
  ).join("");
}

function renderProperties() {
  const container = document.querySelector("#propiedades-lista");
  if (!container) return;

  const copy = currentPropertyCopy();
  const savedIds = savedPropertyIds();

  container.innerHTML = properties.map((p) => {
    const features = copy[p.featuresKey] || [];
    const id = propertyId(p);
    const isSaved = savedIds.includes(id);
    const stats = propertyStats(p);
    const filters = readPropertyFilters();
    const isAvailable = propertyAvailableForDates(p, filters.checkin, filters.checkout);
    return `
      <article class="property-card-pro" data-property-id="${escapeHtml(id)}" data-city="${escapeHtml(p.city)}" data-type="${escapeHtml(p.type || "")}" data-price="${p.price}" data-min-price="${stats.minPrice}" data-rooms="${stats.maxRooms}" data-beds="${stats.maxBeds}" data-available="${isAvailable ? "1" : "0"}" data-gallery='${escapeHtml(JSON.stringify(p.gallery || []))}' data-options='${escapeHtml(JSON.stringify(p.options || []))}'>
        <div class="img-wrap property-entry" role="button" tabindex="0" aria-label="Ver opciones de ${escapeHtml(p.title)}">
          <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}" loading="lazy">
          <div class="property-top-actions">
            <span class="rating rating-stars" aria-label="Calificacion ${escapeHtml(p.rating)} de 5">
              <strong>${escapeHtml(p.rating)}</strong>
              <span class="stars">${ratingStars(p.rating)}</span>
            </span>
            <button class="save-property ${isSaved ? "is-saved" : ""}" type="button" aria-pressed="${isSaved ? "true" : "false"}" aria-label="${isSaved ? "Quitar de guardados" : "Guardar propiedad"}" title="${isSaved ? "Guardado" : "Guardar"}">
              <svg class="heart-icon" aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                <path d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z"></path>
              </svg>
            </button>
          </div>
          ${p.featured ? `<span class="property-badge">${escapeHtml(copy.directBadge)}</span>` : ""}
        </div>

        <div class="info">
          <div class="property-type-line">
            <span>${escapeHtml(p.type || "Alojamiento")}</span>
            <span class="mini-stars" aria-label="Alojamiento destacado">${ratingStars(p.rating)}</span>
          </div>
          <div class="location">${escapeHtml(p.city)} - ${escapeHtml(p.location)}</div>
          <h3>${escapeHtml(p.title)}</h3>
          <div class="review-row">
            <span class="review-score">${escapeHtml(p.rating)}</span>
            <span>${escapeHtml(copy.reviewLabel || p.reviewLabel || "Fabuloso")}</span>
            <small>${escapeHtml(p.reviews || 0)} ${escapeHtml(copy.comments || "comentarios")}</small>
          </div>
          <div class="distance-row" aria-label="Distancia al centro">
            <span aria-hidden="true">⌖</span>
            <strong>${escapeHtml(p.distanceKm ? copy.distanceCenter.replace("{distance}", p.distanceKm) : p.distance || "A poca distancia del centro")}</strong>
          </div>
          <p>${escapeHtml(copy[p.descriptionKey])}</p>

          <div class="features">
            <span>${escapeHtml(p.guests)} ${escapeHtml(copy.guests)}</span>
            <span>${escapeHtml(stats.maxRooms)} ${escapeHtml(copy.roomAbbrev || "hab.")}</span>
            <span>${escapeHtml(stats.maxBeds)} camas</span>
            ${features.map((feature) => `<span>${escapeHtml(feature)}</span>`).join("")}
          </div>

          <div class="footer">
            <div class="price precio-dinamico" data-precio="${p.price}" data-price-usd="${p.price}">
              <small>${escapeHtml(copy.from)}</small>
              <strong data-price-output>USD $${p.price}</strong>
              <span class="currency-label">${escapeHtml(copy.night)}</span>
            </div>

            <div class="property-card-actions">
              <button class="btn-ver" type="button">${escapeHtml(copy.details)}</button>
              <button class="btn-reservar" type="button">${escapeHtml(copy.reserve)}</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join("");

  hydratePropertyFilterOptions();
  const activeCity = sessionStorage.getItem("urban.activeCityFilter") || "";
  if (activeCity) applyPropertyCityFilter(activeCity);
  applyPropertyFilters();

  document.dispatchEvent(new CustomEvent("urban:properties:rendered"));
}

window.addEventListener("DOMContentLoaded", () => {
  renderProperties();
  bindSearchFormCityFilter();
  bindPropertyFilters();

  const container = document.querySelector("#propiedades-lista");
  container?.addEventListener("click", (event) => {
    const saveButton = event.target.closest(".save-property");
    if (saveButton) {
      event.preventDefault();
      event.stopPropagation();

      if (!requirePropertyAuth("Inicia sesión o crea una cuenta para guardar alojamientos en tu lista")) return;

      const card = saveButton.closest(".property-card-pro");
      const id = card?.dataset.propertyId;
      if (!id) return;

      const saved = savedPropertyIds();
      const isSaved = saved.includes(id);
      const nextSaved = isSaved ? saved.filter((item) => item !== id) : [...saved, id];
      setSavedPropertyIds(nextSaved);

      saveButton.classList.toggle("is-saved", !isSaved);
      saveButton.setAttribute("aria-pressed", String(!isSaved));
      saveButton.setAttribute("aria-label", !isSaved ? "Quitar de guardados" : "Guardar propiedad");
      saveButton.setAttribute("title", !isSaved ? "Guardado" : "Guardar");
      return;
    }

    const reserve = event.target.closest(".btn-reservar");
    if (!reserve) return;

    if (!requirePropertyAuth("Para reservar, inicia sesión o crea una cuenta. Así protegemos tus datos y tu solicitud")) return;

    const card = reserve.closest(".property-card-pro");
    const title = card?.querySelector("h3")?.textContent?.trim() || "Propiedad";
    const modal = document.getElementById("reservation-modal");
    const input = document.getElementById("reservation-property");

    if (input) input.value = title;
    if (modal) {
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
    }
  });
});

document.addEventListener("urban:language-applied", renderProperties);

document.addEventListener("urban:search", (event) => {
  const city = event.detail?.matchedCity || event.detail?.destino || "";
  sessionStorage.setItem("urban.activeCityFilter", city);
  applyPropertyCityFilter(city);
});

