(() => {
  'use strict';

  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const state = {
    searches: [],
    leads: [],
    ui: {
      menuOpen: false
    },
    locale: {
      languages: [],
      currencies: [],
      language: 'es',
      currency: 'USD'
    }
  };

  function setMessage(node, text, type = 'ok') {
    if (!node) return;
    node.textContent = text;
    node.style.color = type === 'error' ? '#ffabab' : '#92ffc4';
  }

  function i18nText(key, fallback) {
    return (window.UrbanI18n?.t ? window.UrbanI18n.t(key) : fallback) || fallback;
  }

  function validateSearch(destino, fechas) {
    if (!destino) return { ok: false, reason: i18nText('searchDestinationRequired', 'Debes ingresar un destino.') };
    if (!fechas) return { ok: false, reason: i18nText('searchDatesRequired', 'Debes completar las fechas.') };
    if (destino.trim().length < 2) return { ok: false, reason: i18nText('searchDestinationShort', 'El destino es muy corto.') };
    return { ok: true };
  }

  function persistSearch(payload) {
    state.searches.push(payload);
    try {
      localStorage.setItem('urban.searches', JSON.stringify(state.searches.slice(-20)));
    } catch {
      // noop
    }
  }

  function hydrateSearches() {
    try {
      const saved = localStorage.getItem('urban.searches');
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) state.searches = parsed;
    } catch {
      // noop
    }
  }

  function initSearchForm() {
    const form = qs('#search-form');
    const msg = qs('#search-msg');
    if (!form) return;

    initGuestPicker(form);

    let isSearching = false;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (isSearching) return;
      const data = new FormData(form);
      const destino = String(data.get('destino') || '').trim();
      const checkin = qs('#checkin-date')?.value || '';
      const checkout = qs('#checkout-date')?.value || '';
      const fechas = checkin && checkout ? `${checkin} al ${checkout}` : '';
      const huespedes = String(data.get('huespedes') || '1');

      const validation = validateSearch(destino, fechas);
      if (!validation.ok) {
        setMessage(msg, validation.reason, 'error');
        return;
      }

      isSearching = true;
      const submitButton = form.querySelector('button[type="submit"]');
      const previousText = submitButton?.textContent || '';
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = i18nText('searchLoading', 'Buscando...');
      }

      try {
        const matchedCity = await resolveCityName(destino);

        const payload = {
          destino,
          fechas,
          huespedes,
          at: new Date().toISOString(),
          matchedCity: matchedCity ? matchedCity.name : null
        };

        persistSearch(payload);
        const cityTemplate = i18nText('searchSearchingIn', 'Buscando en {city}...');
        const fallbackTemplate = i18nText('searchSearchingFallback', 'Buscando opciones premium en {destination}...');
        setMessage(
          msg,
          matchedCity
            ? cityTemplate.replace('{city}', matchedCity.name)
            : fallbackTemplate.replace('{destination}', destino)
        );
        document.dispatchEvent(new CustomEvent('urban:search', { detail: payload }));
        qs('#propiedades')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        updateLiveStats();
      } finally {
        isSearching = false;
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = previousText;
        }
      }
    });
  }

  function initGuestPicker(form) {
    const toggle = qs('#guest-picker-toggle', form);
    const popover = qs('#guest-picker-popover', form);
    const summary = qs('#guest-picker-summary', form);
    const done = qs('.guest-done-btn', form);
    const priceInput = qs('#search-price-max', form);
    if (!toggle || !popover || !summary) return;

    const guestState = {
      adults: Number(qs('#search-adults', form)?.value || 2),
      children: Number(qs('#search-children', form)?.value || 0),
      rooms: Number(qs('#search-rooms', form)?.value || 1),
      beds: Number(qs('#search-beds', form)?.value || 1)
    };

    const limits = {
      adults: [1, 20],
      children: [0, 12],
      rooms: [1, 10],
      beds: [1, 20]
    };

    const closePicker = () => {
      popover.hidden = true;
      popover.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    };

    const sync = () => {
      Object.entries(guestState).forEach(([key, value]) => {
        const input = qs(`#search-${key}`, form);
        const count = qs(`[data-stepper="${key}"] [data-count]`, form);
        if (input) input.value = String(value);
        if (count) count.textContent = String(value);
      });

      const totalGuests = guestState.adults + guestState.children;
      const guestInput = qs('#search-guests-value', form);
      if (guestInput) guestInput.value = String(totalGuests);
      const adultsLabel = guestState.adults === 1 ? i18nText('searchAdultsSingular', 'adulto') : i18nText('searchAdultsPlural', 'adultos');
      const childrenLabel = guestState.children === 1 ? i18nText('searchChildrenSingular', 'niño') : i18nText('searchChildrenPlural', 'niños');
      const roomsLabel = guestState.rooms === 1 ? i18nText('searchRoomsSingular', 'habitación') : i18nText('searchRoomsPlural', 'habitaciones');
      summary.textContent = `${guestState.adults} ${adultsLabel} · ${guestState.children} ${childrenLabel} · ${guestState.rooms} ${roomsLabel}`;
    };

    const syncCurrencyPlaceholder = (currency = qs('#currency-select')?.value || 'USD') => {
      if (priceInput) priceInput.placeholder = currency;
    };

    toggle.addEventListener('click', () => {
      const open = popover.hidden;
      popover.hidden = !open;
      popover.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });

    popover.addEventListener('click', (event) => {
      const button = event.target.closest('[data-step]');
      if (!button) return;
      const stepper = button.closest('[data-stepper]');
      const key = stepper?.dataset.stepper;
      if (!key || !limits[key]) return;

      const [min, max] = limits[key];
      const next = guestState[key] + Number(button.dataset.step || 0);
      guestState[key] = Math.max(min, Math.min(max, next));
      sync();
    });

    done?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      closePicker();
      form.dispatchEvent(new Event('change', { bubbles: true }));
    });

    document.addEventListener('click', (event) => {
      if (popover.hidden || form.contains(event.target)) return;
      closePicker();
    });

    document.addEventListener('urban:currency-change', (event) => {
      syncCurrencyPlaceholder(event.detail?.currency);
    });
    document.addEventListener('urban:language-applied', sync);

    sync();
    syncCurrencyPlaceholder();
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function getPreferredCity() {
    const globalSelect = qs('#global-city-select');
    if (globalSelect && globalSelect.value) return globalSelect.value;
    const destinationInput = qs('#search-form input[name="destino"]');
    const destinationSelect = qs('#destino-select');
    return destinationSelect?.value?.trim() || destinationInput?.value?.trim() || null;
  }

  function phpEndpoint(fileName) {
    const isLocalStaticPreview = window.location.protocol === 'file:' || window.location.port === '4177';
    return isLocalStaticPreview
      ? `http://127.0.0.1:4188/${fileName}`
      : fileName;
  }

  async function postJsonEndpoint(fileName, payload) {
    const response = await fetch(phpEndpoint(fileName), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('El servidor no respondió con JSON.');
    }
    const data = await response.json();
    if (!response.ok || data.status !== 'success') {
      throw new Error(data.message || 'No se pudo completar la solicitud.');
    }
    return data;
  }

  function persistLead(payload) {
    state.leads.push(payload);
    try {
      localStorage.setItem('urban.leads', JSON.stringify(state.leads.slice(-50)));
    } catch {
      // noop
    }
  }

  function hydrateLeads() {
    try {
      const saved = localStorage.getItem('urban.leads');
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) state.leads = parsed;
    } catch {
      // noop
    }
  }

  function initNewsletterForm() {
    const form = qs('#newsletter-form');
    const msg = qs('#newsletter-msg');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const data = new FormData(form);
      const email = String(data.get('email') || '').trim().toLowerCase();
      const trap = String(data.get('company') || '').trim();
      if (!validateEmail(email)) {
        setMessage(msg, 'Ingresa un email valido.', 'error');
        return;
      }
      if (trap) {
        setMessage(msg, 'Suscripcion recibida.');
        form.reset();
        return;
      }

      const payload = {
        email,
        source: 'home_newsletter',
        at: new Date().toISOString(),
        inferredCity: getPreferredCity(),
        city: getPreferredCity(),
        language: state.locale.language,
        currency: state.locale.currency,
        company: trap
      };

      const button = form.querySelector('button[type="submit"]');
      const previousText = button?.textContent || '';
      if (button) {
        button.disabled = true;
        button.textContent = 'Guardando...';
      }

      try {
        const result = await postJsonEndpoint('newsletter_subscribe.php', payload);
        persistLead({ ...payload, serverStorage: result.storage, duplicate: result.duplicate });
        setMessage(msg, result.message || 'Suscripcion confirmada. Te avisaremos cuando haya ofertas reales.');
        form.reset();
        document.dispatchEvent(new CustomEvent('urban:newsletter', { detail: { ...payload, result } }));
        updateLiveStats();
      } catch (error) {
        setMessage(msg, error.message || 'No se pudo guardar la suscripcion.', 'error');
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = previousText;
        }
      }
    });
  }

  function initMenu() {
    const btn = qs('#menu-btn');
    const menu = qs('#menu');
    if (!btn || !menu) return;

    btn.setAttribute('aria-expanded', 'false');

    btn.addEventListener('click', () => {
      state.ui.menuOpen = !state.ui.menuOpen;
      menu.classList.toggle('open', state.ui.menuOpen);
      btn.setAttribute('aria-expanded', String(state.ui.menuOpen));
    });

    qsa('#menu a').forEach((link) => {
      link.addEventListener('click', () => {
        state.ui.menuOpen = false;
        menu.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.ui.menuOpen) {
        state.ui.menuOpen = false;
        menu.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function initThemeToggle() {
    const btn = qs('#theme-btn');
    if (!btn) return;

    try {
      const saved = localStorage.getItem('urban.theme');
      if (saved === 'light') document.body.classList.add('light');
    } catch {
      // noop
    }

    btn.addEventListener('click', () => {
      document.body.classList.toggle('light');
      const mode = document.body.classList.contains('light') ? 'light' : 'dark';
      try {
        localStorage.setItem('urban.theme', mode);
      } catch {
        // noop
      }
      document.dispatchEvent(new CustomEvent('urban:theme', { detail: { mode } }));
    });
  }


  function parseHostPhotoUrls(value) {
    const seen = new Set();
    return String(value || '')
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => /^https?:\/\//i.test(item) || /^(assets|fotos\s+agustinas\s+plaza)\//i.test(item))
      .filter((item) => {
        const key = item.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 15);
  }

  function publishHostPropertyPreview(payload, result = {}) {
    const photos = parseHostPhotoUrls(payload.fotos_url);
    const price = Number(payload.precio_noche);
    const guests = Math.max(1, parseInt(String(payload.capacidad || '').match(/\d+/)?.[0] || '2', 10));
    const listing = {
      id: result.id || `local-${Date.now()}`,
      title: `${payload.tipo_vivienda} en ${payload.ciudad}`,
      city: payload.ciudad.split(',')[0].trim() || payload.ciudad,
      location: payload.direccion,
      price: Number.isFinite(price) && price > 0 ? price : 70,
      minRooms: 1,
      maxRooms: Math.max(1, parseInt(String(payload.capacidad || '').match(/(\d+)\s*(habitaci|hab)/i)?.[1] || '1', 10)),
      minBeds: 1,
      maxBeds: Math.max(1, guests),
      image: photos[0] || 'assets/cities/santiago.jpg',
      gallery: photos.length ? photos : ['assets/cities/santiago.jpg'],
      description: payload.mensaje,
      guests,
      rating: 4.9,
      reviews: 0,
      type: payload.tipo_vivienda,
      distance: 'Publicación ingresada por anfitrión',
      distanceKm: '',
      featured: true,
      features: ['Reserva por fechas', 'Calendario disponible', 'Solicitud de anfitrión']
    };

    try {
      const saved = JSON.parse(localStorage.getItem('urban.hostProperties') || '[]');
      saved.unshift(listing);
      localStorage.setItem('urban.hostProperties', JSON.stringify(saved.slice(0, 30)));
    } catch {
      // noop
    }

    document.dispatchEvent(new CustomEvent('urban:host-property-created', { detail: listing }));
  }

  function initContactForm() {
    const form = qs('#contact-form');
    const msg = qs('#contact-msg');
    if (!form || !msg) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const nombre = String(data.get('nombre') || '').trim();
      const email = String(data.get('email') || '').trim().toLowerCase();
      const telefono = String(data.get('telefono') || '').trim();
      const ciudad = String(data.get('ciudad') || '').trim();
      const tipoVivienda = String(data.get('tipo_vivienda') || '').trim();
      const capacidad = String(data.get('capacidad') || '').trim();
      const direccion = String(data.get('direccion') || '').trim();
      const mensaje = String(data.get('mensaje') || '').trim();
      const precioNoche = String(data.get('precio_noche') || '').trim();
      const fotosUrl = String(data.get('fotos_url') || '').trim();

      const photos = parseHostPhotoUrls(fotosUrl);

      if (!nombre || !email || !telefono || !ciudad || !tipoVivienda || !capacidad || !direccion || !mensaje) {
        setMessage(msg, 'Completa los datos de propietario e inmueble para evaluar la publicación.', 'error');
        return;
      }
      if (!validateEmail(email)) {
        setMessage(msg, 'Email inválido para la solicitud de anfitrión.', 'error');
        return;
      }
      if (photos.length === 0) {
        setMessage(msg, 'Ingresa al menos una foto válida (URL http/https) para publicar la propiedad.', 'error');
        return;
      }
      if (!precioNoche || Number(precioNoche) <= 0) {
        setMessage(msg, 'Ingresa un precio por noche mayor a cero.', 'error');
        return;
      }

      const payload = {
        tipo_solicitud: 'anfitrion_propietario',
        nombre,
        email,
        telefono,
        ciudad,
        tipo_vivienda: tipoVivienda,
        capacidad,
        direccion,
        mensaje,
        precio_noche: precioNoche,
        fotos_url: fotosUrl,
        at: new Date().toISOString(),
        inferredCity: getPreferredCity()
      };

      const button = form.querySelector('button[type="submit"]');
      const previousText = button?.textContent || '';
      if (button) {
        button.disabled = true;
        button.textContent = 'Guardando en MySQL...';
      }

      try {
        const result = await postJsonEndpoint('solicitud_anfitrion.php', payload);
        persistContact({ ...payload, serverId: result.id, commission: result.commission });
        publishHostPropertyPreview(payload, result);
        setMessage(msg, result.message || 'Solicitud de anfitrión guardada y propiedad publicada para reservas.');
        form.reset();
        document.dispatchEvent(new CustomEvent('urban:contact', { detail: { ...payload, result } }));
        document.dispatchEvent(new CustomEvent('urban:owner-lead', { detail: { ...payload, result } }));
        updateLiveStats();
      } catch (error) {
        persistContact(payload);
        publishHostPropertyPreview(payload);
        setMessage(msg, 'No se pudo guardar online, pero la propiedad quedó visible en este navegador para probar reservas.', 'error');
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = previousText;
        }
      }
    });
  }

  function initHeroToolbox() {
    const focusBtn = qs('#focus-search-btn');
    const copyBtn = qs('#copy-contact-btn');
    const msg = qs('#hero-toolbox-msg');

    focusBtn?.addEventListener('click', () => {
      const target = qs('#destino-select') || qs('#search-form input, #search-form select');
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.focus();
      if (msg) msg.textContent = 'Listo: elige destino y fechas para consultar disponibilidad.';
    });

    copyBtn?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText('contacto@estadiasurbanas.com');
        if (msg) msg.textContent = 'Correo copiado: contacto@estadiasurbanas.com';
      } catch {
        if (msg) msg.textContent = 'No pude copiar automáticamente, usa contacto@estadiasurbanas.com';
      }
    });
  }

  function emitMetrics() {
    document.dispatchEvent(
      new CustomEvent('urban:metrics', {
        detail: {
          searchesStored: state.searches.length,
          leadsStored: state.leads.length,
          viewport: { width: window.innerWidth, height: window.innerHeight }
        }
      })
    );
  }


  function getCurrencyMeta(code = state.locale.currency) {
    return state.locale.currencies.find((item) => item.code === code) || { code: 'USD', locale: 'en-US', rateToUsd: 1 };
  }

  function convertUsdToSelectedCurrency(valueUsd) {
    const meta = getCurrencyMeta();
    const rateToUsd = Number(meta.rateToUsd || 1);
    if (!rateToUsd || Number.isNaN(rateToUsd)) return valueUsd;
    return valueUsd / rateToUsd;
  }

  function formatCurrency(valueUsd) {
    const meta = getCurrencyMeta();
    const localized = convertUsdToSelectedCurrency(Number(valueUsd || 0));
    return new Intl.NumberFormat(meta.locale || 'en-US', {
      style: 'currency',
      currency: meta.code || 'USD',
      maximumFractionDigits: 0
    }).format(localized);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function debounce(fn, wait = 200) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }

  async function loadJsonConfig(path, fallback = []) {
    try {
      const response = await fetch(path, { headers: { Accept: 'application/json' } });
      if (!response.ok) return fallback;
      const data = await response.json();
      return Array.isArray(data) ? data : fallback;
    } catch {
      return fallback;
    }
  }

  async function initLocaleControls() {
    const languageSelect = qs('#language-select');
    const currencySelect = qs('#currency-select');
    if (!languageSelect || !currencySelect) return;

    state.locale.languages = await loadJsonConfig('data/languages.json', [
      { code: 'es', name: 'Español', nativeName: 'Español' },
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'pt', name: 'Português', nativeName: 'Português' }
    ]);
    state.locale.currencies = [
      { code: 'USD', name: 'Dólar americano', locale: 'en-US', rateToUsd: 1 },
      { code: 'EUR', name: 'Euro', locale: 'es-ES', rateToUsd: 1.09 },
      { code: 'CLP', name: 'Peso chileno', locale: 'es-CL', rateToUsd: 1 / 950 },
      { code: 'MXN', name: 'Peso mexicano', locale: 'es-MX', rateToUsd: 1 / 17 },
      { code: 'COP', name: 'Peso colombiano', locale: 'es-CO', rateToUsd: 1 / 4050 }
    ];

    const savedLanguage = localStorage.getItem('urban.language') || 'es';
    const savedCurrency = localStorage.getItem('urban.currency') || 'USD';
    state.locale.language = savedLanguage;
    state.locale.currency = savedCurrency;

    languageSelect.innerHTML = '';
    state.locale.languages.forEach((lang) => {
      const option = document.createElement('option');
      option.value = lang.code;
      option.textContent = lang.nativeName || lang.name || lang.code;
      languageSelect.appendChild(option);
    });
    languageSelect.value = state.locale.languages.some((lang) => lang.code === savedLanguage) ? savedLanguage : state.locale.languages[0]?.code || 'es';
    state.locale.language = languageSelect.value;

    currencySelect.innerHTML = '';
    state.locale.currencies.forEach((currency) => {
      const option = document.createElement('option');
      option.value = currency.code;
      option.textContent = currency.code;
      currencySelect.appendChild(option);
    });
    currencySelect.value = state.locale.currencies.some((currency) => currency.code === savedCurrency) ? savedCurrency : 'USD';
    state.locale.currency = currencySelect.value;

    languageSelect.addEventListener('change', () => {
      state.locale.language = languageSelect.value;
      localStorage.setItem('urban.language', state.locale.language);
      if (window.UrbanI18n && typeof window.UrbanI18n.applyLanguage === 'function') window.UrbanI18n.applyLanguage(state.locale.language);
      document.dispatchEvent(new CustomEvent('urban:language-change', { detail: { language: state.locale.language } }));
    });

    currencySelect.addEventListener('change', () => {
      state.locale.currency = currencySelect.value;
      localStorage.setItem('urban.currency', state.locale.currency);
      if (typeof window.updatePrices === 'function') window.updatePrices();
      initPriceMap();
      document.dispatchEvent(new CustomEvent('urban:currency-change', { detail: { currency: state.locale.currency } }));
    });
  }

  function updateLiveStats() {
    const s = qs('#stat-search');
    const l = qs('#stat-leads');
    const c = qs('#stat-contact');
    if (s) s.textContent = String(state.searches.length);
    if (l) l.textContent = String(state.leads.length);

    try {
      const contacts = JSON.parse(localStorage.getItem('urban.contacts') || '[]');
      if (c) c.textContent = String(Array.isArray(contacts) ? contacts.length : 0);
    } catch {
      if (c) c.textContent = '0';
    }
  }

  function initQuoteForm() {
    const form = qs('#quote-form');
    const msg = qs('#quote-msg');
    if (!form || !msg) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const noches = clamp(Number(data.get('noches') || 1), 1, 365);
      const plan = Number(data.get('plan') || 49);
      const descuento = clamp(Number(data.get('descuento') || 0), 0, 60);

      const subtotal = noches * plan;
      const total = subtotal * (1 - descuento / 100);
      setMessage(msg, `Total estimado: ${formatCurrency(total)} (${noches} noches, ${descuento}% off)`);

      document.dispatchEvent(
        new CustomEvent('urban:quote', {
          detail: { noches, plan, descuento, subtotal, total }
        })
      );
    });
  }

  function initFaqFilter() {
    const input = qs('#faq-filter');
    const items = qsa('.faq-item');
    if (!input || !items.length) return;

    const applyFilter = debounce(() => {
      const query = input.value.trim().toLowerCase();
      items.forEach((item) => {
        const text = item.textContent?.toLowerCase() || '';
        item.style.display = text.includes(query) ? '' : 'none';
      });
    }, 120);

    input.addEventListener('input', applyFilter);
  }

  function persistContact(payload) {
    try {
      const current = JSON.parse(localStorage.getItem('urban.contacts') || '[]');
      const next = Array.isArray(current) ? [...current, payload] : [payload];
      localStorage.setItem('urban.contacts', JSON.stringify(next.slice(-50)));
    } catch {
      // noop
    }
  }


  function initCityFilters() {
    const buttons = qsa('[data-city-filter]');
    const cards = qsa('.city-item');
    if (!buttons.length || !cards.length) return;

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-city-filter') || 'all';
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        cards.forEach((card) => {
          const city = card.getAttribute('data-city') || 'all';
          card.style.display = filter === 'all' || city === filter ? '' : 'none';
        });

        document.dispatchEvent(new CustomEvent('urban:city-filter', { detail: { filter } }));
      });
    });
  }

  function initCityGuidePanel() {
    const cards = qsa('.city-item');
    const title = qs('#city-guide-title');
    const text = qs('#city-guide-text');
    if (!cards.length || !title || !text) return;

    const openGuide = (card) => {
      cards.forEach((item) => item.classList.remove('active'));
      card.classList.add('active');
      const name = card.dataset.name || card.querySelector('h3')?.textContent?.trim() || 'Ciudad';
      const guide = card.dataset.guide || card.textContent?.trim() || 'Información próximamente.';
      title.textContent = `Guía rápida: ${name}`;
      text.textContent = guide;
      document.dispatchEvent(new CustomEvent('urban:city-guide-open', { detail: { name, guide } }));
    };

    cards.forEach((card) => {
      card.setAttribute('tabindex', '0');
      card.addEventListener('click', () => openGuide(card));
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openGuide(card);
        }
      });
    });
  }

  function initInteractiveSections() {
    qsa('.price-card .btn').forEach((button) => {
      button.addEventListener('click', () => {
        const plan = button.closest('.price-card')?.querySelector('h3')?.textContent?.trim() || 'plan';
        setMessage(qs('#global-search-msg'), `Plan ${plan} seleccionado. Completa el formulario para reservar.`);
        document.dispatchEvent(new CustomEvent('urban:plan-select', { detail: { plan, at: new Date().toISOString() } }));
      });
    });

    qsa('.blog-card a').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const title = link.closest('.blog-card')?.querySelector('h3')?.textContent?.trim() || 'recurso';
        setMessage(qs('#global-search-msg'), `Artículo "${title}" disponible próximamente.`);
        document.dispatchEvent(new CustomEvent('urban:blog-click', { detail: { title } }));
      });
    });

    qsa('.compare-table tbody tr').forEach((row) => {
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => {
        qsa('.compare-table tbody tr').forEach((item) => item.classList.remove('active'));
        row.classList.add('active');
        const feature = row.querySelector('td')?.textContent?.trim() || 'feature';
        setMessage(qs('#global-search-msg'), `Comparando característica: ${feature}.`);
        document.dispatchEvent(new CustomEvent('urban:compare-feature', { detail: { feature } }));
      });
    });

    qsa('.service-list li').forEach((item) => {
      item.style.cursor = 'pointer';
      item.addEventListener('click', () => {
        const service = item.textContent?.trim() || '';
        setMessage(qs('#global-search-msg'), `Servicio destacado: ${service}`);
        document.dispatchEvent(new CustomEvent('urban:service-highlight', { detail: { service } }));
      });
    });

    qsa('#faq details, #faq-list details').forEach((detail) => {
      detail.addEventListener('toggle', () => {
        if (!detail.open) return;
        const question = detail.querySelector('summary')?.textContent?.trim() || 'FAQ';
        document.dispatchEvent(new CustomEvent('urban:faq-open', { detail: { question } }));
      });
    });
  }

  function initOwnerForm() {
    const form = qs('#owner-form');
    const msg = qs('#owner-msg');
    if (!form || !msg) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const payload = {
        nombre: String(data.get('nombre') || '').trim(),
        email: String(data.get('email') || '').trim().toLowerCase(),
        ciudad: String(data.get('ciudad') || '').trim(),
        tipo: String(data.get('tipo') || '').trim(),
        comentario: String(data.get('comentario') || '').trim(),
        at: new Date().toISOString(),
        inferredCity: getPreferredCity()
      };

      if (!payload.nombre || !payload.email || !payload.ciudad || !payload.tipo) {
        setMessage(msg, 'Completa los datos para publicar tu propiedad.', 'error');
        return;
      }
      if (!validateEmail(payload.email)) {
        setMessage(msg, 'Email inválido en formulario de propietario.', 'error');
        return;
      }

      setMessage(msg, '¡Recibido! Nuestro equipo comercial te contactará.');
      form.reset();
      document.dispatchEvent(new CustomEvent('urban:owner-lead', { detail: payload }));
    });
  }

  function initDemoButton() {
    const btn = qs('#demo-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const toast = document.createElement('div');
      toast.className = 'demo-toast';
      toast.textContent = 'Demo solicitada ✅ En breve te escribimos.';
      document.body.appendChild(toast);

      setTimeout(() => toast.remove(), 2600);
      document.dispatchEvent(new CustomEvent('urban:demo-requested', { detail: { at: new Date().toISOString() } }));
    });
  }

  function initFooterInteractions() {
    const email = qs('#footer-email');
    const payButtons = qsa('.pay-chip');

    if (email) {
      email.style.cursor = 'pointer';
      email.title = 'Haz clic para copiar el correo';
      email.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(email.textContent || '');
          setMessage(qs('#global-search-msg'), 'Correo copiado al portapapeles.');
          document.dispatchEvent(new CustomEvent('urban:footer-copy', { detail: { value: email.textContent || '' } }));
        } catch {
          setMessage(qs('#global-search-msg'), 'No se pudo copiar el correo.', 'error');
        }
      });
    }

    payButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const provider = button.dataset.pay || 'unknown';
        setMessage(qs('#global-search-msg'), `Método seleccionado: ${provider.replace('_', ' ')}.`);
        document.dispatchEvent(new CustomEvent('urban:payment-click', { detail: { provider, at: new Date().toISOString() } }));
      });
    });
  }

  function initDestinationInteractions() {
    const imageModal = qs('#image-modal');
    const imagePreview = qs('#image-preview');
    const imageTitle = qs('#image-title');
    const imageClose = qs('#image-close');
    const triggers = qsa('.trend-trigger');

    const closeImageModal = () => {
      if (!imageModal) return;
      imageModal.classList.remove('open');
      imageModal.setAttribute('aria-hidden', 'true');
    };

    triggers.forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const card = trigger.closest('.trend-item');
        const city = card?.dataset.city || trigger.textContent?.trim() || 'Destino';
        const destinationInput = qs('#search-form input[name="destino"]');
        if (destinationInput) destinationInput.value = city;
        setMessage(qs('#global-search-msg'), `Explorando ${city}...`);
        document.dispatchEvent(new CustomEvent('urban:place-select', { detail: { city } }));
      });

      const img = trigger.querySelector('img');
      if (!img || !imageModal || !imagePreview || !imageTitle) return;

      img.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        imagePreview.src = img.currentSrc || img.src;
        imagePreview.alt = img.alt || 'Destino';
        imageTitle.textContent = img.alt || 'Vista del destino';
        imageModal.classList.add('open');
        imageModal.setAttribute('aria-hidden', 'false');
        document.dispatchEvent(new CustomEvent('urban:image-preview', { detail: { title: imageTitle.textContent } }));
      });
    });

    imageClose?.addEventListener('click', closeImageModal);
    imageModal?.addEventListener('click', (event) => {
      if (event.target === imageModal) closeImageModal();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeImageModal();
    });
  }

  function initScrollTopButton() {
    const button = qs('#scroll-top-btn');
    if (!button) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        button.classList.toggle('visible', window.scrollY > 360);
        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    button.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.dispatchEvent(new CustomEvent('urban:scroll-top', { detail: { at: new Date().toISOString() } }));
    });
    onScroll();
  }

  let cityMapData = [
    { id: 'stgo', name: 'Santiago', country: 'chile', price: 92, x: 34, y: 40, lat: -33.45, lng: -70.66 },
    { id: 'antofa', name: 'Antofagasta', country: 'chile', price: 88, x: 22, y: 58, lat: -23.65, lng: -70.4 },
    { id: 'vina', name: 'Viña del Mar', country: 'chile', price: 96, x: 28, y: 44, lat: -33.02, lng: -71.55 },
    { id: 'med', name: 'Medellín', country: 'colombia', price: 81, x: 60, y: 28, lat: 6.24, lng: -75.57 },
    { id: 'bog', name: 'Bogotá', country: 'colombia', price: 99, x: 68, y: 36, lat: 4.71, lng: -74.07 },
    { id: 'cali', name: 'Cali', country: 'colombia', price: 76, x: 56, y: 46, lat: 3.45, lng: -76.53 }
  ];

  const fallbackCoordinates = {
    santiago: { x: 36, y: 70, lat: -33.45, lng: -70.66 },
    antofagasta: { x: 30, y: 55, lat: -23.65, lng: -70.4 },
    'vina del mar': { x: 33, y: 67, lat: -33.02, lng: -71.55 },
    medellin: { x: 66, y: 34, lat: 6.24, lng: -75.57 },
    bogota: { x: 70, y: 38, lat: 4.71, lng: -74.07 },
    cali: { x: 64, y: 43, lat: 3.45, lng: -76.53 }
  };

  function projectLatLngToMap(lat, lng) {
    const minLat = -56;
    const maxLat = 13;
    const minLng = -82;
    const maxLng = -66;
    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 100;
    return {
      x: clamp(x, 8, 92),
      y: clamp(y, 8, 92)
    };
  }

  const calendarState = {
    month: new Date().getMonth(),
    year: new Date().getFullYear()
  };

  const mapRuntime = {
    instance: null,
    markerLayer: null
  };


  function syncCitiesFromCatalog() {
    document.addEventListener('urban:cities:ready', (event) => {
      const remote = Array.isArray(event.detail?.cities) ? event.detail.cities : [];
      if (!remote.length) return;

      const normalizedForMap = remote
        .filter((city) => ['chile', 'colombia'].includes(String(city.country || '').trim().toLowerCase()))
        .map((city, idx) => {
          const name = String(city.name || '').trim();
          const key = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
          const fallback = fallbackCoordinates[key] || {};
          const lat = Number(city.lat ?? fallback.lat ?? 0);
          const lng = Number(city.lng ?? fallback.lng ?? 0);
          const projected = lat && lng ? projectLatLngToMap(lat, lng) : { x: fallback.x || (26 + (idx * 11) % 60), y: fallback.y || (20 + (idx * 9) % 55) };
          return {
            id: city.id || `city_${idx}`,
            name: name || `Ciudad ${idx + 1}`,
            country: String(city.country || '').trim().toLowerCase() || 'unknown',
            price: Number(city.price || 80),
            x: projected.x,
            y: projected.y,
            lat,
            lng
          };
        })
        .filter((city, idx, list) => list.findIndex((item) => item.name.toLowerCase() === city.name.toLowerCase()) === idx)
        .slice(0, 24);

      if (normalizedForMap.length) cityMapData = normalizedForMap;
      syncMapCityFilterOptions();
      syncGlobalSearchSuggestions();
      initPriceMap();
    });
  }

  function syncGlobalSearchSuggestions() {
    const select = qs('#global-city-select');
    if (!select) return;

    const uniqueNames = [...new Set(cityMapData.map((city) => String(city.name || '').trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'es')
    );

    const currentValue = select.value || '';
    select.innerHTML = '<option value="">Ciudades destacadas</option>';
    uniqueNames.forEach((name) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });
    select.value = uniqueNames.includes(currentValue) ? currentValue : '';
  }

  async function resolveCityName(query) {
    if (!window.UrbanCities || typeof window.UrbanCities.searchCities !== 'function') return null;
    if (typeof window.UrbanCities.init === 'function') {
      await window.UrbanCities.init();
    }
    const matches = window.UrbanCities.searchCities(query);
    return matches.length ? matches[0] : null;
  }

  function initGlobalSearch() {
    const form = qs('#global-search-form');
    const msg = qs('#global-search-msg');
    const citySelect = qs('#global-city-select');
    if (!form || !msg) return;

    if (citySelect) {
      citySelect.addEventListener('change', () => {
        const selected = citySelect.value;
        if (!selected) return;
        const input = form.querySelector('input[name="query"]');
        if (input) input.value = selected;
        setMessage(msg, `Ciudad seleccionada: ${selected}`);
      });
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const query = String(new FormData(form).get('query') || '').trim();
      if (!query) {
        setMessage(msg, 'Escribe algo para buscar.', 'error');
        return;
      }

      const match = await resolveCityName(query);
      if (match) {
        setMessage(msg, `Ciudad encontrada: ${match.name}.`);
      } else {
        setMessage(msg, `Resultados sugeridos para: ${query}`);
      }
      document.dispatchEvent(new CustomEvent('urban:global-search', { detail: { query, match } }));
    });
  }

  function updateMapInsights(items, selectedCity = 'all', maxPrice = 140) {
    const summary = qs('#map-summary');
    const bestPrice = qs('#map-best-price');
    const bestCity = qs('#map-best-city');
    const recommendation = qs('#map-recommendation');

    if (!items.length) {
      if (summary) summary.textContent = 'Sin resultados para esos filtros.';
      if (bestPrice) bestPrice.textContent = '-';
      if (bestCity) bestCity.textContent = '-';
      if (recommendation) recommendation.textContent = 'Sube el presupuesto o cambia la ciudad para ver disponibilidad.';
      return;
    }

    const ordered = [...items].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    const best = ordered[0];
    const avg = Math.round(items.reduce((acc, c) => acc + Number(c.price || 0), 0) / items.length);
    const cityLabel = selectedCity === 'all' ? `${items.length} ciudades visibles` : selectedCity;

    if (summary) summary.textContent = `${cityLabel} · promedio ${formatCurrency(avg)}`;
    if (bestPrice) bestPrice.textContent = formatCurrency(best.price);
    if (bestCity) bestCity.textContent = best.name;
    if (recommendation) {
      recommendation.textContent = Number(best.price) <= Number(maxPrice)
        ? `Reserva sugerida desde ${formatCurrency(best.price)} por noche en ${best.name}.`
        : 'Ajusta el presupuesto para encontrar una tarifa disponible.';
    }
  }

  function renderStaticMap(items) {
    const canvas = qs('#map-canvas');
    if (!canvas) return;

    canvas.innerHTML = '';
    const mapImage = document.createElement('img');
    mapImage.className = 'map-image';
    mapImage.src = 'assets/map-latam.svg';
    mapImage.alt = 'Mapa base de Sudamérica';
    canvas.appendChild(mapImage);

    const backdrop = document.createElement('div');
    backdrop.className = 'map-backdrop';
    canvas.appendChild(backdrop);

    items.forEach((city) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `map-dot ${city.country}`;
      dot.style.left = `${city.x}%`;
      dot.style.top = `${city.y}%`;
      dot.title = `${city.name} · ${formatCurrency(city.price)}`;
      dot.setAttribute('aria-label', `${city.name} desde ${formatCurrency(city.price)} por noche`);
      canvas.appendChild(dot);

      const label = document.createElement('span');
      label.className = 'map-city-label';
      label.textContent = `${city.name} · ${formatCurrency(city.price)}`;
      label.style.left = `calc(${city.x}% + 12px)`;
      label.style.top = `calc(${city.y}% - 8px)`;
      canvas.appendChild(label);

      dot.addEventListener('mouseenter', () => {
        label.classList.add('active');
      });
      dot.addEventListener('mouseleave', () => {
        label.classList.remove('active');
      });
    });

    updateMapInsights(items);
  }

  function ensureLeafletMap() {
    const canvas = qs('#map-canvas');
    if (!canvas || !window.L) return null;
    if (mapRuntime.instance) return mapRuntime.instance;

    canvas.innerHTML = '';
    canvas.classList.add('leaflet-ready');
    const map = window.L.map(canvas, { zoomControl: true, attributionControl: true, worldCopyJump: true }).setView([12, -38], 2);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 13,
      minZoom: 2,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    mapRuntime.markerLayer = window.L.layerGroup().addTo(map);
    mapRuntime.instance = map;
    return map;
  }

  function renderLeafletMap(items) {
    const map = ensureLeafletMap();
    if (!map || !mapRuntime.markerLayer) {
      renderStaticMap(items);
      return;
    }

    mapRuntime.markerLayer.clearLayers();
    const bounds = [];

    items.forEach((city) => {
      const lat = Number(city.lat || 0);
      const lng = Number(city.lng || 0);
      if (!lat || !lng) return;

      const marker = window.L.circleMarker([lat, lng], {
        radius: 7,
        color: '#102040',
        weight: 2,
        fillColor: city.country === 'colombia' ? '#f6cb6e' : '#7ca8ff',
        fillOpacity: 0.95
      });
      marker.bindPopup(`<strong>${city.name}</strong><br/>Precio promedio: ${formatCurrency(city.price)}`);
      marker.addTo(mapRuntime.markerLayer);
      bounds.push([lat, lng]);
    });

    map.setView([12, -38], 2);

    updateMapInsights(items);
  }

  function renderMap(items) {
    if (window.L) {
      renderLeafletMap(items);
      return;
    }
    renderStaticMap(items);
  }

  function syncMapCityFilterOptions() {
    const citySelect = qs('#map-city-filter');
    if (!citySelect) return;

    const currentValue = citySelect.value || 'all';
    const names = [...new Set(cityMapData.map((city) => String(city.name || '').trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'es')
    );

    citySelect.innerHTML = '<option value="all">Todos</option>';
    names.forEach((name) => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      citySelect.appendChild(opt);
    });

    citySelect.value = names.includes(currentValue) ? currentValue : 'all';
  }

  function initPriceMap() {
    const city = qs('#map-city-filter');
    const price = qs('#map-price-filter');
    const reset = qs('#map-reset');
    if (!city || !price || !reset) return;

    syncMapCityFilterOptions();

    const apply = () => {
      const selectedCity = city.value;
      const maxPrice = Number(price.value || 140);
      const priceValue = qs('#map-price-value');
      if (priceValue) priceValue.textContent = `USD ${maxPrice}`;
      const filtered = cityMapData.filter((item) => (selectedCity === 'all' || item.name === selectedCity) && item.price <= maxPrice);
      renderMap(filtered);
      updateMapInsights(filtered, selectedCity, maxPrice);
      document.dispatchEvent(new CustomEvent('urban:map-filter', { detail: { selectedCity, maxPrice, count: filtered.length } }));
    };

    city.addEventListener('change', apply);
    price.addEventListener('input', apply);
    reset.addEventListener('click', () => {
      city.value = 'all';
      price.value = '140';
      apply();
    });

    apply();
  }

  function monthName(month, year) {
    return new Date(year, month, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  }

  function renderCalendar() {
    const title = qs('#cal-title');
    const grid = qs('#calendar-grid');
    const msg = qs('#calendar-msg');
    if (!title || !grid) return;

    title.textContent = monthName(calendarState.month, calendarState.year);
    grid.innerHTML = '';

    const firstDay = new Date(calendarState.year, calendarState.month, 1);
    const lastDay = new Date(calendarState.year, calendarState.month + 1, 0);
    const offset = (firstDay.getDay() + 6) % 7;

    for (let i = 0; i < offset; i += 1) {
      const blank = document.createElement('div');
      grid.appendChild(blank);
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day';
      cell.tabIndex = 0;
      const busy = day % 3 === 0 || day % 5 === 0;
      if (busy) cell.classList.add('busy');
      cell.dataset.day = String(day);
      cell.dataset.busy = busy ? '1' : '0';
      cell.setAttribute('role', 'button');
      cell.setAttribute(
        'aria-label',
        `${day} de ${monthName(calendarState.month, calendarState.year)} - ${busy ? 'Alta demanda' : 'Disponible'}`
      );
      cell.innerHTML = `<strong>${day}</strong><small>${busy ? 'Alta demanda' : 'Disponible'}</small>`;
      grid.appendChild(cell);
    }

    if (msg) {
      msg.textContent = 'Haz click en un día para ver disponibilidad estimada.';
    }
  }

  function initCalendar() {
    const prev = qs('#cal-prev');
    const next = qs('#cal-next');
    if (!prev || !next) return;

    const move = (direction) => {
      calendarState.month += direction;
      if (calendarState.month < 0) {
        calendarState.month = 11;
        calendarState.year -= 1;
      }
      if (calendarState.month > 11) {
        calendarState.month = 0;
        calendarState.year += 1;
      }
      renderCalendar();
      document.dispatchEvent(new CustomEvent('urban:calendar-change', { detail: { month: calendarState.month, year: calendarState.year } }));
    };

    prev.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));

    const grid = qs('#calendar-grid');
    const msg = qs('#calendar-msg');
    if (grid) {
      const selectDay = (target) => {
        const cell = target.closest('.calendar-day');
        if (!cell) return;
        grid.querySelectorAll('.calendar-day.selected').forEach((node) => node.classList.remove('selected'));
        cell.classList.add('selected');
        if (msg) {
          const isBusy = cell.dataset.busy === '1';
          msg.textContent = isBusy
            ? `Seleccionaste el día ${cell.dataset.day}: alta demanda, reserva con anticipación.`
            : `Seleccionaste el día ${cell.dataset.day}: disponibilidad estimada alta.`;
        }
      };

      grid.addEventListener('click', (event) => selectDay(event.target));
      grid.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectDay(event.target);
        }
      });
    }

    renderCalendar();
  }


  function initAuthUiHooks() {
    document.addEventListener('urban:auth:ready', (event) => {
      const user = event.detail?.user;
      if (user) {
        setMessage(qs('#global-search-msg'), `Sesión activa: ${user.email}`);
      }
    });

    document.addEventListener('urban:auth:login', (event) => {
      const user = event.detail;
      setMessage(qs('#global-search-msg'), `Bienvenido ${user?.name || 'usuario'}.`);
      document.dispatchEvent(new CustomEvent('urban:metrics', { detail: { authLogin: true } }));
    });

    document.addEventListener('urban:auth:logout', () => {
      setMessage(qs('#global-search-msg'), 'Sesión cerrada.');
    });
  }

  function initPerformanceMarks() {
    if (!('performance' in window)) return;
    performance.mark('urban-boot-start');

    window.addEventListener('load', () => {
      performance.mark('urban-window-load');
      performance.measure('urban_boot_to_load', 'urban-boot-start', 'urban-window-load');
      const measures = performance.getEntriesByName('urban_boot_to_load');
      const value = measures[0]?.duration || 0;
      document.dispatchEvent(new CustomEvent('urban:performance', { detail: { bootToLoadMs: Number(value.toFixed(2)) } }));
    });
  }

  function boot() {
    hydrateSearches();
    hydrateLeads();
    initMenu();
    initAuthUiHooks();
    initPerformanceMarks();
    initLocaleControls();
    initGlobalSearch();
    syncGlobalSearchSuggestions();
    if (window.UrbanExperience && typeof window.UrbanExperience.init === 'function') {
      window.UrbanExperience.init();
    }
    if (window.UrbanUx && typeof window.UrbanUx.init === 'function') {
      window.UrbanUx.init();
    }
    initThemeToggle();
    initSearchForm();
    initNewsletterForm();
    initContactForm();
    initQuoteForm();
    initHeroToolbox();
    initFaqFilter();
    initCityFilters();
    initCityGuidePanel();
    initInteractiveSections();
    initOwnerForm();
    syncCitiesFromCatalog();
    initDemoButton();
    initFooterInteractions();
    initDestinationInteractions();
    initScrollTopButton();
    initPriceMap();
    initCalendar();
    emitMetrics();
    updateLiveStats();

    document.dispatchEvent(
      new CustomEvent('urban:ready', {
        detail: {
          searches: state.searches.length,
          leads: state.leads.length
        }
      })
    );
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
