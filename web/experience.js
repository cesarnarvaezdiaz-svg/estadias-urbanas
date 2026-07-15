(() => {
  'use strict';

  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const withTimeout = (promise, ms = 9000) =>
    Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
  const normalizeText = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  const CITY_IMAGE_OVERRIDES = {
    arica: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Arica_01.jpg/1280px-Arica_01.jpg',
    iquique: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Iquique_collage.jpg/1280px-Iquique_collage.jpg',
    antofagasta: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Antofagasta.jpg/1280px-Antofagasta.jpg',
    bogota: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Bogota_montaje.jpg/1280px-Bogota_montaje.jpg'
  };
  let initialized = false;
  let propertyCatalog = [];

  function setMessage(node, text, type = 'ok') {
    if (!node) return;
    node.textContent = text;
    node.style.color = type === 'error' ? '#ffabab' : '#92ffc4';
  }

  function normalizeProperty(id, raw = {}) {
    const photos = Array.isArray(raw.fotos) ? raw.fotos : [];
    return {
      id,
      title: String(raw.title || raw.titulo || raw.nombre || `Propiedad ${id}`),
      city: String(raw.city || raw.ciudad || raw.location || 'Sin ciudad'),
      country: String(raw.country || raw.pais || raw.país || ''),
      price: Number(raw.price || raw.precio || raw.precioBase || raw.rate || 0),
      type: String(raw.type || raw.tipo || 'Departamento'),
      description: String(raw.description || raw.descripcion || raw.desc || 'Propiedad equipada para estadías cortas y largas.'),
      amenities: Array.isArray(raw.amenities || raw.servicios) ? raw.amenities || raw.servicios : [],
      image: String(raw.image || raw.imagen || raw.foto || photos[0] || ''),
      likes: Number(raw.likes || 0)
    };
  }

  async function loadPropertiesFromBackend() {
    try {
      const response = await fetch('/api/properties', { headers: { Accept: 'application/json' } });
      if (!response.ok) return [];
      const payload = await response.json();
      if (!payload?.ok || !Array.isArray(payload.properties)) return [];
      return payload.properties.map((item) => normalizeProperty(item.id || `backend_${Math.random()}`, item));
    } catch {
      return [];
    }
  }

  function applyPropertyView() {
    const cityQuery = normalizeText(qs('#property-city-query')?.value || '');
    const onlyWifi = Boolean(qs('#property-only-wifi')?.checked);
    const sort = qs('#property-sort')?.value || 'recommended';

    let view = [...propertyCatalog];
    if (cityQuery) {
      view = view.filter((item) => normalizeText(item.city).includes(cityQuery));
    }
    if (onlyWifi) {
      view = view.filter((item) => item.amenities.some((amenity) => normalizeText(amenity).includes('wifi')));
    }

    if (sort === 'price-asc') {
      view.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-desc') {
      view.sort((a, b) => b.price - a.price);
    } else if (sort === 'likes-desc') {
      view.sort((a, b) => b.likes - a.likes);
    }

    return view;
  }

  function renderProperties(properties) {
    const grid = qs('#properties-grid');
    const msg = qs('#properties-msg');
    if (!grid || !msg) return;
    propertyCatalog = Array.isArray(properties) ? [...properties] : [];

    if (!propertyCatalog.length) {
      grid.innerHTML = `
        <article class="card property-card"><img src="assets/cities/santiago.svg?v=3" alt="Propiedad en Santiago" /><h3>Acceso sin llave</h3><p>Ingreso autónomo y seguro con códigos dinámicos.</p></article>
        <article class="card property-card"><img src="assets/cities/iquique.svg?v=3" alt="Propiedad en Iquique" /><h3>Fibra óptica</h3><p>Conexión estable para trabajo remoto o streaming.</p></article>
        <article class="card property-card"><img src="assets/cities/rio.svg?v=3" alt="Propiedad en Rio" /><h3>Smart TV</h3><p>Entretenimiento completo y conectividad instantánea.</p></article>
      `;
      setMessage(msg, 'No se encontraron propiedades remotas; mostrando destacados locales.', 'error');
      return;
    }

    const displayed = applyPropertyView();

    grid.innerHTML = displayed
      .slice(0, 6)
      .map(
        (p) => `<article class="card property-card">
          <img src="${p.image || 'assets/cities/santiago.svg?v=3'}" alt="${p.title}" loading="lazy" />
          <h3>${p.title}</h3>
          <p class="muted">${p.city}${p.country ? ` · ${p.country}` : ''} · ${p.type}</p>
          <p>${p.description}</p>
          <p><strong class="precio-dinamico" data-precio="${p.price}">Desde CLP $${p.price || '-'} / noche</strong></p>
          <p class="muted">${p.amenities.slice(0, 3).join(' · ') || 'Wifi · Espacio de trabajo · Check-in flexible'}</p>
          <div class="property-actions">
            <button class="btn btn-ghost property-like-btn" type="button" data-id="${p.id}">❤️ ${p.likes || 0}</button>
            <button class="btn btn-primary property-detail-btn" type="button" data-id="${p.id}">Ver publicación</button>
            <button class="btn btn-primary property-reserve-btn" type="button" data-id="${p.id}" data-title="${p.title}">Reservar</button>
          </div>
        </article>`
      )
      .join('');

    qsa('.property-like-btn', grid).forEach((btn) => {
      btn.addEventListener('click', () => {
        const current = Number(btn.textContent.replace(/\D+/g, '') || 0) + 1;
        btn.textContent = `❤️ ${current}`;
        document.dispatchEvent(new CustomEvent('urban:property-like', { detail: { id: btn.dataset.id, likes: current } }));
      });
    });
    qsa('.property-detail-btn', grid).forEach((btn) => {
      btn.addEventListener('click', () => {
        setMessage(msg, `Abriendo ficha de propiedad ${btn.dataset.id}...`);
        document.dispatchEvent(new CustomEvent('urban:property-open', { detail: { id: btn.dataset.id } }));
      });
    });
    qsa('.property-reserve-btn', grid).forEach((btn) => {
      btn.addEventListener('click', () => {
        openReservationModal(btn.dataset.title || `Propiedad ${btn.dataset.id || ''}`);
        document.dispatchEvent(new CustomEvent('urban:property-reserve-open', { detail: { id: btn.dataset.id || null } }));
      });
    });

    setMessage(msg, `${displayed.length} propiedades visibles de ${propertyCatalog.length} cargadas.`);
  }

  async function loadRemoteProperties() {
    const msg = qs('#properties-msg');
    if (msg) setMessage(msg, 'Cargando propiedades disponibles...');

    const backendProperties = await loadPropertiesFromBackend();
    if (backendProperties.length) {
      renderProperties(backendProperties);
      return;
    }

    renderProperties([]);
    document.dispatchEvent(new CustomEvent('urban:properties:ready', { detail: { count: 0 } }));
  }

  function initPropertiesControls() {
    const refresh = qs('#properties-refresh');
    const sort = qs('#property-sort');
    const cityQuery = qs('#property-city-query');
    const wifi = qs('#property-only-wifi');

    refresh?.addEventListener('click', () => {
      loadRemoteProperties();
    });
    sort?.addEventListener('change', () => renderProperties(propertyCatalog));
    cityQuery?.addEventListener('input', () => renderProperties(propertyCatalog));
    wifi?.addEventListener('change', () => renderProperties(propertyCatalog));
  }

  function openReservationModal(propertyTitle) {
    const modal = qs('#reservation-modal');
    const input = qs('#reservation-property');
    if (!modal || !input) return;
    input.value = propertyTitle;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeReservationModal() {
    const modal = qs('#reservation-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function initReservationForm() {
    const modal = qs('#reservation-modal');
    const close = qs('#reservation-close');
    const form = qs('#reservation-form');
    const msg = qs('#reservation-msg');
    if (!modal || !close || !form || !msg) return;
    if (form.matches('[data-reservation-form]')) return;

    close.addEventListener('click', closeReservationModal);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeReservationModal();
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const checkin = String(data.get('checkin') || '');
      const checkout = String(data.get('checkout') || '');
      if (!checkin || !checkout || checkout <= checkin) {
        setMessage(msg, 'Revisa las fechas de check-in/check-out.', 'error');
        return;
      }

      const payload = {
        property: String(data.get('property') || ''),
        name: String(data.get('name') || '').trim(),
        email: String(data.get('email') || '').trim().toLowerCase(),
        checkin,
        checkout,
        guests: Number(data.get('guests') || 1),
        at: new Date().toISOString()
      };

      if (!payload.name || !payload.email) {
        setMessage(msg, 'Completa nombre y email para reservar.', 'error');
        return;
      }

      setMessage(msg, 'Solicitud enviada. Te confirmaremos disponibilidad en minutos.');
      document.dispatchEvent(new CustomEvent('urban:reservation-submit', { detail: payload }));
      setTimeout(() => {
        form.reset();
        closeReservationModal();
      }, 900);
    });
  }

  function normalizeCity(id, raw = {}) {
    const image =
      raw.photo ||
      raw.foto ||
      raw.image ||
      raw.Image ||
      raw.imagen ||
      raw.cover ||
      raw.imageUrl ||
      raw.imageURL ||
      raw.imagenUrl ||
      raw.fotoUrl ||
      raw.fotoURL ||
      raw.urlFoto ||
      raw.img ||
      '';

    return {
      id,
      name: String(raw.name || raw.nombre || raw.ciudad || raw.city || id),
      country: String(raw.country || raw.pais || raw.país || 'Chile'),
      image: String(image),
      description: String(raw.description || raw.descripcion || ''),
      places: Array.isArray(raw.places || raw.lugaresInteres || raw.puntosInteres) ? raw.places || raw.lugaresInteres || raw.puntosInteres : []
    };
  }

  function fallbackCityImage(cityName) {
    const label = encodeURIComponent(cityName);
    return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop stop-color='%231f3a74'/><stop offset='1' stop-color='%23132a56'/></linearGradient></defs><rect width='1200' height='800' fill='url(%23g)'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='64' fill='white' font-family='Arial'>${label}</text></svg>`;
  }

  function normalizeImageUrl(value, cityName = 'city') {
    let url = String(value || '').trim().replace(/^"+|"+$/g, '');
    if (!url) return fallbackCityImage(cityName);
    if (url.startsWith('//')) url = `https:${url}`;
    if (url.startsWith('http://')) url = `https://${url.slice(7)}`;
    if (!/^https?:\/\//i.test(url)) return fallbackCityImage(cityName);
    if (url.includes('images.unsplash.com') && !url.includes('?')) {
      url = `${url}?auto=format&fit=crop&w=1200&q=80`;
    }
    return url;
  }

  function extractUnsplashId(value) {
    const text = String(value || '');
    const match = text.match(/photo-([a-zA-Z0-9_-]+)/);
    return match ? match[1] : '';
  }

  function imageCandidates(rawUrl, cityName) {
    const normalized = normalizeImageUrl(rawUrl, cityName);
    const cityKey = normalizeText(cityName);
    const isGoogleSearch = normalized.includes('google.com/search');
    const proxyBase = normalized.replace(/^https?:\/\//i, '');
    const candidates = [
      isGoogleSearch || !normalized ? CITY_IMAGE_OVERRIDES[cityKey] : normalized,
      `https://images.weserv.nl/?url=${encodeURIComponent(proxyBase)}&w=1200&output=jpg`,
      normalized,
      CITY_IMAGE_OVERRIDES[cityKey]
    ];
    const id = extractUnsplashId(rawUrl) || extractUnsplashId(normalized);
    if (id) {
      candidates.push(`https://images.unsplash.com/photo-${id}?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80`);
      candidates.push(`https://images.unsplash.com/photo-${id}?fm=jpg&auto=format&fit=crop&w=1200&q=80`);
      candidates.push(`https://source.unsplash.com/${id}/1200x800`);
      candidates.push(`https://images.weserv.nl/?url=${encodeURIComponent(`images.unsplash.com/photo-${id}`)}&w=1200`);
    }
    candidates.push(fallbackCityImage(cityName));
    return [...new Set(candidates.filter(Boolean))];
  }

  async function fetchCitiesFromLocalSource() {
    return [];
  }

  function defaultTopDescriptions(cityName) {
    const info = {
      arica: {
        description: 'Arica combina playa, clima cálido todo el año y excelente base para turismo natural e histórico.',
        places: ['Morro de Arica', 'Playa Chinchorro', 'Catedral San Marcos']
      },
      iquique: {
        description: 'Iquique destaca por su costanera, deportes náuticos y una fuerte actividad comercial.',
        places: ['Cavancha', 'Paseo Baquedano', 'Zofri']
      },
      antofagasta: {
        description: 'Antofagasta ofrece costa, gastronomía marina y conexión con rutas del desierto de Atacama.',
        places: ['La Portada', 'Costanera', 'Muelle Histórico']
      },
      bogota: {
        description: 'Bogotá es un hub cultural y corporativo con gran oferta gastronómica, arte y vida urbana.',
        places: ['La Candelaria', 'Monserrate', 'Museo del Oro']
      }
    };
    return info[normalizeText(cityName)] || { description: 'Destino recomendado para estadías urbanas.', places: ['Centro histórico'] };
  }

  function renderTopDestinations(cities) {
    const grid = qs('#top-destinations-grid');
    if (!grid) return;

    const desired = ['Arica', 'Iquique', 'Antofagasta', 'Bogotá'];
    const picked = desired.map((name) => cities.find((c) => normalizeText(c.name) === normalizeText(name))).filter(Boolean);

    grid.innerHTML = '';
    picked.forEach((city) => {
      const fallback = defaultTopDescriptions(city.name);
      const places = (city.places?.length ? city.places : fallback.places).join('|');
      const description = city.description || fallback.description;
      const article = document.createElement('article');
      article.className = 'card destination trend-item';
      article.dataset.city = city.name;
      article.dataset.description = description;
      article.dataset.places = places;

      const button = document.createElement('button');
      button.className = 'trend-trigger';
      button.type = 'button';

      const img = document.createElement('img');
      img.alt = city.name;
      img.loading = 'lazy';
      const candidates = imageCandidates(city.image, city.name);
      let idx = 0;
      const setCandidate = () => {
        img.src = candidates[Math.min(idx, candidates.length - 1)];
      };
      img.addEventListener('error', () => {
        if (idx < candidates.length - 1) {
          idx += 1;
          setCandidate();
        }
      });
      setCandidate();

      const body = document.createElement('div');
      body.className = 'destination-body';
      body.innerHTML = `<h3>${city.name}</h3><p>Destino destacado</p><span class="chip">Ver detalles</span>`;

      button.appendChild(img);
      button.appendChild(body);
      article.appendChild(button);
      grid.appendChild(article);
    });

    if (!picked.length) {
      grid.innerHTML = '<article class="card destination"><p class="muted">No se pudieron cargar los destinos destacados.</p></article>';
    }
  }

  async function initTopDestinations() {
    let cities = [];
    if (window.UrbanCities && typeof window.UrbanCities.init === 'function') {
      try {
        await withTimeout(window.UrbanCities.init(), 9000);
        if (typeof window.UrbanCities.getCities === 'function') {
          cities = window.UrbanCities.getCities().map((city) => normalizeCity(city.id, city));
        }
      } catch {
        // fallback below
      }
    }
    if (!cities.length) {
      cities = await fetchCitiesFromLocalSource();
    }
    renderTopDestinations(cities);
  }

  function initTrendingGalleryInteractions() {
    const modal = qs('#trend-modal');
    const title = qs('#trend-title');
    const description = qs('#trend-description');
    const places = qs('#trend-places');
    const closeBtn = qs('#trend-close');
    if (!modal || !title || !description || !places) return;

    const open = (card) => {
      title.textContent = card.dataset.city || 'Destino';
      description.textContent = card.dataset.description || 'Información próximamente.';
      const items = String(card.dataset.places || '')
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean);
      places.innerHTML = items.map((item) => `<li>${item}</li>`).join('');
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      closeBtn?.focus();
    };

    const close = () => {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    };

    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('.trend-trigger');
      if (!trigger) return;
      const card = trigger.closest('.trend-item');
      if (!card) return;
      open(card);
    });

    closeBtn?.addEventListener('click', close);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) close();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.classList.contains('open')) close();
    });
  }

  function init() {
    if (initialized) return;
    initialized = true;
    initPropertiesControls();
    initReservationForm();
    loadRemoteProperties();
    initTrendingGalleryInteractions();
  }

  window.UrbanExperience = {
    init,
    loadRemoteProperties
  };

  document.addEventListener('DOMContentLoaded', () => {
    init();
  });
})();
