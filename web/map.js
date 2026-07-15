(() => {
  'use strict';

  const msgNode = document.querySelector('#map-page-msg');
  const setMsg = (text) => {
    if (msgNode) msgNode.textContent = text;
  };

  const fallbackCities = [
    { name: 'Santiago', country: 'Chile', price: 80, lat: -33.4489, lng: -70.6693 },
    { name: 'Iquique', country: 'Chile', price: 95, lat: -20.2307, lng: -70.1357 },
    { name: 'Antofagasta', country: 'Chile', price: 105, lat: -23.6509, lng: -70.3975 },
    { name: 'Bogota', country: 'Colombia', price: 75, lat: 4.711, lng: -74.0721 }
  ];

  function normalizeCity(raw = {}, index = 0) {
    return {
      id: raw.id || raw.codigo || `city-${index}`,
      name: String(raw.name || raw.nombre || raw.ciudad || `Ciudad ${index + 1}`),
      country: String(raw.country || raw.pais || raw.region || 'N/A'),
      price: Number(raw.price || raw.precio || raw.rate || 0),
      lat: Number(raw.lat || raw.latitude || raw.latitud || 0),
      lng: Number(raw.lng || raw.longitude || raw.longitud || 0)
    };
  }

  async function loadCities() {
    if (window.UrbanCities && typeof window.UrbanCities.init === 'function') {
      await window.UrbanCities.init();
      if (typeof window.UrbanCities.getCities === 'function') {
        const cities = window.UrbanCities.getCities().map(normalizeCity).filter((city) => city.lat && city.lng);
        if (cities.length) return cities;
      }
    }
    return fallbackCities.map(normalizeCity);
  }

  function createMap() {
    return L.map('real-map', { zoomControl: true }).setView([-20.5, -69.2], 4);
  }

  function addTileLayer(map) {
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
  }

  function addMarkers(map, cities) {
    const markers = [];
    cities.forEach((city) => {
      if (!city.lat || !city.lng) return;
      const marker = L.marker([city.lat, city.lng]).addTo(map);
      marker.bindPopup(`<strong>${city.name}</strong><br>${city.country}<br>Desde USD ${city.price || '-'}`);
      markers.push(marker);
    });
    return markers;
  }

  function fitToMarkers(map, markers) {
    if (!markers.length) return;
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.2));
  }

  async function init() {
    if (!window.L) {
      setMsg('No se pudo cargar Leaflet.');
      return;
    }

    const map = createMap();
    addTileLayer(map);

    const cities = await loadCities();
    const markers = addMarkers(map, cities);
    fitToMarkers(map, markers);
    setMsg(`${markers.length} ciudades cargadas.`);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
