const properties = [
  {
    title: "Departamento vista al mar",
    city: "Iquique",
    location: "Playa Cavancha",
    price: 70,
    image: "assets/cities/iquique.jpg",
    description: "A pasos de la playa, totalmente equipado, ideal para descanso o trabajo.",
    guests: 2,
    rating: 4.8
  },
  {
    title: "Depto moderno en Providencia",
    city: "Santiago",
    location: "Providencia",
    price: 85,
    image: "assets/cities/santiago.jpg",
    description: "Ubicación premium, WiFi rápido, cerca del metro y restaurantes.",
    guests: 3,
    rating: 4.7
  }
];

window.addEventListener("load", () => {
  const container = document.querySelector("#propiedades-lista");
  if (!container) return;

  container.innerHTML = properties.map(p => `
    <article class="property-card">
      <div class="img-wrap">
        <img src="${p.image}" alt="${p.title}">
      </div>

      <div class="property-info">
        <div class="top">
          <span class="city">${p.city} · ${p.location}</span>
          <span class="rating">⭐ ${p.rating}</span>
        </div>

        <h3>${p.title}</h3>
        <p>${p.description}</p>

        <div class="bottom">
          <span>${p.guests} huéspedes</span>
          <strong>$${p.price} USD / noche</strong>
        </div>
      </div>
    </article>
  `).join("");
});