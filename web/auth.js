(() => {
  'use strict';

  const STORAGE_KEY = 'urban.auth.user';
  const PROFILE_STORAGE_PREFIX = 'urban.profile.';
  const qs = (selector, root = document) => root.querySelector(selector);

  const state = {
    mode: 'login',
    user: null,
    summaryEmail: null,
    accountSummary: null
  };

  function loadUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('urban_user');
      if (!raw) return null;
      const user = JSON.parse(raw);
      return user && user.email ? user : null;
    } catch {
      return null;
    }
  }

  function authDisplayName(user) {
    const name = String(user?.name || '').trim();
    const normalizedName = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    if (name && normalizedName !== 'huesped') return name;
    return String(user?.email || 'usuario').split('@')[0];
  }

  function createAuthButton(text, className, action) {
    const button = document.createElement('button');
    button.className = className;
    button.type = 'button';
    button.textContent = text;
    if (action) button.setAttribute('data-auth-action', action);
    return button;
  }

  function bindAuthActionButton(button) {
    button.addEventListener('click', () => {
      const action = button.getAttribute('data-auth-action');
      if (action === 'open-register') openModal('register');
      if (action === 'open-login') openModal('login');
    });
  }

  function renderGuestActions() {
    const desktop = qs('.auth-actions');
    if (desktop) {
      desktop.innerHTML = '';
      const register = createAuthButton('Registrarse', 'auth-action register-header-btn', 'open-register');
      const login = createAuthButton('Iniciar sesión', 'auth-action auth-action-secondary login-btn', 'open-login');
      desktop.append(register, login);
      bindAuthActionButton(register);
      bindAuthActionButton(login);
    }

    const menu = qs('.menu-auth-actions');
    if (menu) {
      menu.innerHTML = '';
      const login = createAuthButton('Iniciar sesión', 'auth-action auth-action-secondary login-btn', 'open-login');
      menu.append(login);
      bindAuthActionButton(login);
    }
  }

  function renderUserActions(user) {
    const displayName = authDisplayName(user);
    document.body.classList.add('is-authenticated');
    document.body.dataset.sessionUser = displayName;
    setSessionNotice('');

    document.querySelectorAll('.auth-actions, .menu-auth-actions').forEach((container) => {
      container.innerHTML = '';

      const greeting = createAuthButton(`Hola, ${displayName}`, 'auth-action login-btn');
      greeting.setAttribute('aria-disabled', 'true');
      greeting.setAttribute('data-session-greeting', 'true');

      const accountButton = createAuthButton('Mi cuenta', 'auth-action auth-action-secondary account-panel-btn');
      accountButton.addEventListener('click', () => openAccountPanel(user));

      const logoutButton = createAuthButton('Cerrar sesión', 'auth-action auth-action-secondary');
      logoutButton.addEventListener('click', logout);

      container.append(greeting, accountButton, logoutButton);
    });

    loadAccountSummary(user);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[char]);
  }

  function profileStorageKey(email) {
    return PROFILE_STORAGE_PREFIX + String(email || '').trim().toLowerCase();
  }

  function loadLocalBillingProfile(email) {
    try {
      const raw = localStorage.getItem(profileStorageKey(email));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveLocalBillingProfile(email, profile) {
    try {
      localStorage.setItem(profileStorageKey(email), JSON.stringify(profile));
    } catch {
      // noop
    }
  }

  function fallbackAccountSummary(user) {
    return {
      status: 'success',
      loyalty: {
        points: 0,
        tier: 'Club',
        nights: 0,
        bookings: 0
      },
      reservations: {
        total: 0,
        active: 0,
        recent: []
      },
      profile: loadLocalBillingProfile(user?.email) || {}
    };
  }

  function ensureAccountSummaryBar() {
    let bar = qs('#account-summary-bar');
    if (bar) return bar;

    bar = document.createElement('section');
    bar.id = 'account-summary-bar';
    bar.className = 'account-summary-bar';
    bar.setAttribute('aria-live', 'polite');
    bar.innerHTML = `
      <div class="container account-summary-inner">
        <div>
          <span class="account-summary-eyebrow">Mi cuenta</span>
          <strong id="account-summary-title">Cargando tu resumen...</strong>
        </div>
        <dl class="account-summary-stats">
          <div><dt>Puntos</dt><dd id="account-summary-points">--</dd></div>
          <div><dt>Nivel</dt><dd id="account-summary-tier">Club</dd></div>
          <div><dt>Reservas</dt><dd id="account-summary-bookings">--</dd></div>
        </dl>
        <div class="account-summary-actions">
          <button class="account-summary-link" type="button" data-account-panel>Mi panel</button>
          <button class="account-summary-link account-summary-link-secondary" type="button" data-open-reservations>Reservas</button>
        </div>
      </div>
    `;

    const topbar = qs('.topbar');
    if (topbar?.insertAdjacentElement) {
      topbar.insertAdjacentElement('afterend', bar);
    } else {
      document.body.insertBefore(bar, document.body.firstChild);
    }

    bar.querySelector('[data-account-panel]')?.addEventListener('click', () => openAccountPanel(state.user));
    bar.querySelector('[data-open-reservations]')?.addEventListener('click', openReservationsLookup);

    return bar;
  }

  function ensureAccountPanel() {
    let modal = qs('#account-panel-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'account-panel-modal';
    modal.className = 'auth-modal account-panel-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="auth-panel card account-panel-card">
        <div class="auth-header">
          <div>
            <span class="account-summary-eyebrow">Intranet de huésped</span>
            <h3 id="account-panel-title">Mi cuenta</h3>
          </div>
          <button id="account-panel-close" class="btn btn-ghost" type="button" aria-label="Cerrar mi cuenta">
            <svg class="close-icon" aria-hidden="true" viewBox="0 0 24 24" focusable="false">
              <path d="M6 6l12 12M18 6 6 18"></path>
            </svg>
          </button>
        </div>
        <div id="account-panel-body" class="account-panel-body"></div>
      </div>
    `;
    document.body.appendChild(modal);

    const closePanel = () => {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    };
    qs('#account-panel-close', modal)?.addEventListener('click', closePanel);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closePanel();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.classList.contains('open')) closePanel();
    });

    return modal;
  }

  function formatHostMoney(value) {
    if (value === null || value === undefined || value === '') return 'Por definir';
    return `USD $${Number(value || 0).toLocaleString('es-CL')}`;
  }

  function renderHostPanel(host) {
    const properties = Array.isArray(host?.properties) ? host.properties : [];
    const policy = host?.commission_policy || {};
    const policyText = policy.label || '11% comision Estadias Urbanas + IVA sobre la comision';

    if (!properties.length) {
      return `
        <section class="account-panel-section host-panel-section">
          <div class="account-panel-section-head">
            <h4>Panel anfitrión</h4>
            <span class="account-secure-note">Para propietarios</span>
          </div>
          <p class="account-panel-empty">No hay propiedades asociadas a este email. Si registras una vivienda con este mismo correo, aparecerá aquí con fotos, descripción, precio y estado.</p>
          <a class="account-inline-link" href="#contacto">Registrar una vivienda</a>
        </section>
      `;
    }

    return `
      <section class="account-panel-section host-panel-section">
        <div class="account-panel-section-head">
          <h4>Panel anfitrión</h4>
          <span class="account-secure-note">${escapeHtml(policyText)}</span>
        </div>
        <div class="host-property-list">
          ${properties.map((property) => {
            const commission = property.commission || {};
            const photos = Array.isArray(property.photos) ? property.photos : [];
            return `
              <article class="host-property-card">
                <div class="host-property-media">
                  ${photos.length ? `<img src="${escapeHtml(photos[0])}" alt="Foto de ${escapeHtml(property.title || 'propiedad')}" loading="lazy">` : '<span>Fotos pendientes</span>'}
                </div>
                <div class="host-property-content">
                  <span class="host-status">${escapeHtml(property.status || 'en_revision')}</span>
                  <h5>${escapeHtml(property.title || 'Propiedad en revision')}</h5>
                  <p>${escapeHtml(property.description || 'Sin descripción registrada.')}</p>
                  <dl class="host-property-metrics">
                    <div><dt>Precio noche</dt><dd>${formatHostMoney(property.price_usd)}</dd></div>
                    <div><dt>Comision + IVA</dt><dd>${formatHostMoney((commission.commission_usd || 0) + (commission.iva_usd || 0))}</dd></div>
                    <div><dt>Pago anfitrión</dt><dd>${formatHostMoney(commission.host_net_usd)}</dd></div>
                  </dl>
                  <small>${escapeHtml(property.city || '')} · ${escapeHtml(property.capacity || '')}</small>
                </div>
              </article>
            `;
          }).join('')}
        </div>
      </section>
    `;
  }

  function renderAccountPanel(user, summary) {
    const modal = ensureAccountPanel();
    const body = qs('#account-panel-body', modal);
    const displayName = authDisplayName(user);
    const loyalty = summary?.loyalty || {};
    const reservations = summary?.reservations || {};
    const recent = Array.isArray(reservations.recent) ? reservations.recent : [];
    const profile = summary?.profile || {};

    qs('#account-panel-title', modal).textContent = `Hola, ${displayName}`;
    body.innerHTML = `
      <section class="account-panel-hero">
        <div>
          <span>Nivel ${escapeHtml(loyalty.tier || 'Club')}</span>
          <strong>${Number(loyalty.points || 0).toLocaleString('es-CL')} puntos</strong>
          <p>${Number(reservations.active || 0)} reserva(s) activa(s) · ${Number(loyalty.nights || 0)} noche(s) acumulada(s)</p>
        </div>
      </section>
      <div class="account-panel-grid">
        <article>
          <span>Reservas totales</span>
          <strong>${Number(reservations.total || 0).toLocaleString('es-CL')}</strong>
        </article>
        <article>
          <span>Reservas activas</span>
          <strong>${Number(reservations.active || 0).toLocaleString('es-CL')}</strong>
        </article>
        <article>
          <span>Nivel</span>
          <strong>${escapeHtml(loyalty.tier || 'Club')}</strong>
        </article>
      </div>
      <section class="account-panel-section">
        <div class="account-panel-section-head">
          <h4>Reservas recientes</h4>
          <button type="button" class="account-inline-link" data-open-reservations>Ver todas</button>
        </div>
        <div class="account-panel-reservations">
          ${recent.length ? recent.map((item) => `
            <article class="account-reservation-row">
              <div>
                <strong>${escapeHtml(item.property)}</strong>
                <span>${escapeHtml(item.folio)} · ${escapeHtml(item.status)}</span>
              </div>
              <p>${escapeHtml(item.check_in)} al ${escapeHtml(item.check_out)} · ${Number(item.guests || 1)} huésped(es)</p>
            </article>
          `).join('') : '<p class="account-panel-empty">Cuando hagas una reserva, aparecerá aquí con su folio y estado.</p>'}
        </div>
      </section>
      ${renderHostPanel(summary?.host)}
      <section class="account-panel-section">
        <div class="account-panel-section-head">
          <h4>Facturación y pago</h4>
          <span class="account-secure-note">Tarjeta protegida por Mercado Pago</span>
        </div>
        <form id="account-billing-form" class="account-billing-form">
          <label><span>Nombre para facturación</span><input name="billing_name" autocomplete="name" value="${escapeHtml(profile.billing_name || user.name || '')}"></label>
          <label><span>RUT / Documento</span><input name="document_id" autocomplete="off" value="${escapeHtml(profile.document_id || '')}"></label>
          <label><span>Celular</span><input name="phone" autocomplete="tel" value="${escapeHtml(profile.phone || '')}"></label>
          <label class="account-field-wide"><span>Dirección</span><input name="address" autocomplete="street-address" value="${escapeHtml(profile.address || '')}"></label>
          <label><span>Ciudad</span><input name="city" autocomplete="address-level2" value="${escapeHtml(profile.city || '')}"></label>
          <label><span>Region / Estado</span><input name="region" autocomplete="address-level1" value="${escapeHtml(profile.region || '')}"></label>
          <label><span>País</span><input name="country" autocomplete="country-name" value="${escapeHtml(profile.country || '')}"></label>
          <label><span>Código postal</span><input name="postal_code" autocomplete="postal-code" value="${escapeHtml(profile.postal_code || '')}"></label>
          <label><span>Método preferido</span>
            <select name="preferred_payment">
              <option value="mercadopago" ${(profile.preferred_payment || 'mercadopago') === 'mercadopago' ? 'selected' : ''}>Mercado Pago</option>
              <option value="credit_card" ${profile.preferred_payment === 'credit_card' ? 'selected' : ''}>Tarjeta de crédito</option>
              <option value="debit_card" ${profile.preferred_payment === 'debit_card' ? 'selected' : ''}>Tarjeta de débito</option>
              <option value="transfer" ${profile.preferred_payment === 'transfer' ? 'selected' : ''}>Transferencia</option>
            </select>
          </label>
          <label><span>Titular de tarjeta</span><input name="cardholder_name" autocomplete="cc-name" value="${escapeHtml(profile.cardholder_name || '')}"></label>
          <label><span>Ultimos 4 digitos</span><input name="card_last4" inputmode="numeric" maxlength="4" autocomplete="off" value="${escapeHtml(profile.card_last4 || '')}"></label>
          <p class="account-payment-warning account-field-wide">Por seguridad no guardamos número completo, CVV ni vencimiento de tarjetas. Esos datos se ingresan solo al pagar en Mercado Pago.</p>
          <p id="account-billing-msg" class="account-billing-msg account-field-wide" aria-live="polite"></p>
          <button type="submit" class="btn btn-primary account-field-wide">Guardar datos de facturación</button>
        </form>
      </section>
      <div class="account-panel-actions">
        <button type="button" class="btn btn-primary" data-open-reservations>Consultar mis reservas</button>
        <button type="button" class="btn btn-ghost" data-account-scroll-properties>Buscar alojamiento</button>
      </div>
    `;

    body.querySelectorAll('[data-open-reservations]').forEach((button) => button.addEventListener('click', openReservationsLookup));
    body.querySelector('[data-account-scroll-properties]')?.addEventListener('click', () => {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      qs('#propiedades')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    qs('#account-billing-form', body)?.addEventListener('submit', (event) => saveBillingProfile(event, user));
  }

  async function saveBillingProfile(event, user) {
    event.preventDefault();
    const form = event.currentTarget;
    const msg = qs('#account-billing-msg', form);
    const button = form.querySelector('button[type="submit"]');
    const previousText = button?.textContent || '';
    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries());
    payload.email = user.email;
    payload.card_last4 = String(payload.card_last4 || '').replace(/[^0-9]/g, '');

    if (payload.card_last4 && payload.card_last4.length !== 4) {
      if (msg) {
        msg.textContent = 'Ingresa solo los ultimos 4 digitos.';
        msg.className = 'account-billing-msg account-field-wide error';
      }
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = 'Guardando...';
    }
    if (msg) {
      msg.textContent = 'Guardando datos...';
      msg.className = 'account-billing-msg account-field-wide';
    }

    try {
      const result = await postJson('perfil_usuario.php', payload);
      saveLocalBillingProfile(user.email, result.profile || payload);
      state.accountSummary = {
        ...(state.accountSummary || {}),
        profile: result.profile || payload
      };
      if (msg) {
        msg.textContent = 'Datos guardados correctamente.';
        msg.className = 'account-billing-msg account-field-wide ok';
      }
    } catch (error) {
      console.warn('No se pudo guardar el perfil de usuario', error);
      saveLocalBillingProfile(user.email, payload);
      state.accountSummary = {
        ...(state.accountSummary || fallbackAccountSummary(user)),
        profile: payload
      };
      if (msg) {
        msg.textContent = 'Datos guardados en este dispositivo. Al subir los PHP actualizados se guardaran en MySQL.';
        msg.className = 'account-billing-msg account-field-wide ok';
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = previousText;
      }
    }
  }

  function openAccountPanel(user = state.user) {
    if (!user?.email) {
      openModal('login');
      return;
    }

    const modal = ensureAccountPanel();
    const body = qs('#account-panel-body', modal);
    body.innerHTML = '<p class="account-panel-empty">Cargando tus puntos y reservas...</p>';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');

    if (state.accountSummary) {
      renderAccountPanel(user, state.accountSummary);
      return;
    }

    loadAccountSummary(user).then(() => {
      renderAccountPanel(user, state.accountSummary);
    }).catch(() => {
      body.innerHTML = '<p class="account-panel-empty">No pudimos cargar tu intranet en este momento.</p>';
    });
  }

  function openReservationsLookup() {
    const modal = qs('#my-reservations-modal');
    const emailInput = qs('#my-reservations-email');
    if (state.user?.email && emailInput && !emailInput.value) emailInput.value = state.user.email;
    if (modal) {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  function removeAccountSummaryBar() {
    qs('#account-summary-bar')?.remove();
    qs('#account-panel-modal')?.remove();
    state.summaryEmail = null;
    state.accountSummary = null;
  }

  async function loadAccountSummary(user) {
    const email = String(user?.email || '').trim().toLowerCase();
    if (!email) return;

    const bar = ensureAccountSummaryBar();
    qs('#account-summary-title', bar).textContent = `Hola, ${authDisplayName(user)}. Este es tu avance.`;

    if (state.summaryEmail === email && bar.dataset.loaded === 'true') return;
    state.summaryEmail = email;

    try {
      const endpoint = endpointUrl('cuenta_resumen.php');
      const response = await fetch(`${endpoint}?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        credentials: endpoint === 'cuenta_resumen.php' ? 'same-origin' : 'omit',
        headers: { Accept: 'application/json' }
      });
      const data = await response.json();
      if (!response.ok || data.status === 'error') throw new Error(data.message || 'No se pudo cargar tu resumen.');
      state.accountSummary = data;

      const points = Number(data.loyalty?.points || 0);
      const tier = String(data.loyalty?.tier || 'Club');
      const bookings = Number(data.reservations?.total ?? data.loyalty?.bookings ?? 0);
      const active = Number(data.reservations?.active || 0);

      qs('#account-summary-points', bar).textContent = points.toLocaleString('es-CL');
      qs('#account-summary-tier', bar).textContent = tier;
      qs('#account-summary-bookings', bar).textContent = bookings.toLocaleString('es-CL');
      qs('#account-summary-title', bar).textContent = active > 0
        ? `Tienes ${active} reserva(s) activa(s).`
        : 'Aun no tienes reservas activas.';
      bar.dataset.loaded = 'true';
    } catch {
      state.accountSummary = fallbackAccountSummary(user);
      qs('#account-summary-title', bar).textContent = 'No hay reservas activas.';
      qs('#account-summary-points', bar).textContent = '0';
      qs('#account-summary-tier', bar).textContent = 'Club';
      qs('#account-summary-bookings', bar).textContent = '0';
      bar.dataset.loaded = 'true';
    }
  }

  function setSessionNotice() {
    qs('#session-notice')?.remove();
  }

  function saveUser(user) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem('urban_user', JSON.stringify(user));
    } catch {
      // noop
    }
    renderUserActions(user);
  }

  function clearUser() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('urban_user');
    } catch {
      // noop
    }
  }

  function setAuthMessage(text, type = 'ok') {
    const msg = qs('#auth-msg');
    if (!msg) return;
    msg.textContent = text;
    msg.style.color = type === 'error' ? '#ffabab' : '#92ffc4';
  }

  function validatePassword(password) {
    if (password.length < 10) return 'Minimo 10 caracteres.';
    if (!/[A-Z]/.test(password)) return 'Agrega al menos una mayuscula.';
    if (!/[a-z]/.test(password)) return 'Agrega al menos una minuscula.';
    if (!/[0-9]/.test(password)) return 'Agrega al menos un número.';
    if (!/[^A-Za-z0-9]/.test(password)) return 'Agrega al menos un simbolo.';
    return null;
  }

  function endpointUrl(fileName) {
    if (window.UrbanApp?.endpoint) return window.UrbanApp.endpoint(fileName);
    return window.location.protocol === 'file:' ? `https://www.estadiasurbanas.com/${fileName}` : fileName;
  }

  function socialLoginUrl(provider) {
    const cleanProvider = encodeURIComponent(provider);
    if (provider === 'google') {
      const googleClientId = '211056906904-j0fo6gmarci60n9g73f4ksrccua3ub23.apps.googleusercontent.com';
      const redirectUri = 'https://www.estadiasurbanas.com/callback_google.php';
      const params = new URLSearchParams({
        client_id: googleClientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'email profile',
        prompt: 'select_account'
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }
    const localHost = ['127.0.0.1', 'localhost', '::1'].includes(window.location.hostname);
    if (window.location.protocol === 'file:' || localHost) {
      return `https://www.estadiasurbanas.com/oauth_start.php?provider=${cleanProvider}`;
    }
    return endpointUrl(`oauth_start.php?provider=${cleanProvider}`);
  }

  async function postJson(fileName, payload) {
    const endpoint = endpointUrl(fileName);
    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        credentials: endpoint === fileName ? 'same-origin' : 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch {
      throw new Error('No se pudo conectar con el servidor de usuarios. Si estas probando desde una copia local, sube tambien login.php, registrar_usuario.php y auth.js actualizados.');
    }

    const text = await response.text();
    let result = null;

    try {
      result = JSON.parse(text);
    } catch {
      throw new Error('El servidor no respondió JSON válido. Revisa el archivo PHP en HostGator.');
    }

    if (!response.ok || result.status !== 'success') {
      throw new Error(result.message || 'No se pudo completar la solicitud.');
    }

    return result;
  }

  async function getServerSession() {
    try {
      const endpoint = endpointUrl('session.php');
      const response = await fetch(endpoint, {
        method: 'GET',
        credentials: endpoint === 'session.php' ? 'same-origin' : 'omit',
        headers: { Accept: 'application/json' }
      });
      const result = await response.json();
      return result?.logged_in && result.user?.email ? result.user : null;
    } catch {
      return null;
    }
  }

  function setMode(mode) {
    state.mode = mode;

    const title = qs('#auth-title');
    const text = qs('#auth-text');
    const submit = qs('#auth-submit');
    const nameField = qs('#auth-name-field');
    const phoneField = qs('#auth-phone-field');
    const passwordField = qs('#auth-form input[name="password"]');
    const nameInput = qs('#auth-form input[name="name"]');
    const phoneInput = qs('#auth-form input[name="phone"]');

    if (title) title.textContent = mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión';
    if (text) {
      text.textContent =
        mode === 'register'
          ? 'Crea tu cuenta para reservar más rápido y mantener tus datos de contacto.'
          : 'Ingresa con tu email y contraseña para acceder a tu cuenta.';
    }
    if (submit) submit.textContent = mode === 'register' ? 'Registrarse' : 'Iniciar sesión';
    if (nameField) nameField.classList.toggle('hidden', mode !== 'register');
    if (phoneField) phoneField.classList.toggle('hidden', mode !== 'register');
    if (nameInput) nameInput.required = mode === 'register';
    if (phoneInput) phoneInput.required = mode === 'register';
    if (passwordField) {
      passwordField.autocomplete = mode === 'register' ? 'new-password' : 'current-password';
      passwordField.minLength = mode === 'register' ? 10 : 1;
      let hint = qs('#auth-password-hint');
      if (!hint) {
        hint = document.createElement('p');
        hint.id = 'auth-password-hint';
        hint.className = 'auth-password-hint';
        passwordField.closest('label')?.appendChild(hint);
      }
      hint.textContent = mode === 'register'
        ? 'Usa 10 caracteres con mayúscula, minúscula, número y símbolo.'
        : 'Tu contraseña se envía protegida al servidor.';
      hint.hidden = false;
    }
    setAuthMessage('');
  }

  function ensurePasswordToggle() {
    const passwordField = qs('#auth-form input[name="password"]');
    if (!passwordField) return null;

    passwordField.id = passwordField.id || 'auth-password';
    passwordField.classList.add('password-input');

    let wrapper = passwordField.closest('.password-input-wrap');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'password-input-wrap';
      passwordField.parentNode.insertBefore(wrapper, passwordField);
      wrapper.appendChild(passwordField);
    }

    let toggle = qs('#auth-password-toggle', wrapper);
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.id = 'auth-password-toggle';
      toggle.className = 'password-toggle-btn';
      toggle.type = 'button';
      wrapper.appendChild(toggle);
    }

    return { passwordField, toggle };
  }

  function syncPasswordToggle() {
    const controls = ensurePasswordToggle();
    if (!controls) return;
    const { passwordField, toggle } = controls;

    const isVisible = passwordField.type === 'text';
    toggle.setAttribute('aria-label', isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña');
    toggle.setAttribute('aria-pressed', String(isVisible));
    toggle.setAttribute('title', isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña');
    toggle.innerHTML = isVisible
      ? `<svg class="password-eye-icon" aria-hidden="true" viewBox="0 0 24 24" focusable="false">
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"></path>
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M4 4l16 16"></path>
        </svg>`
      : `<svg class="password-eye-icon" aria-hidden="true" viewBox="0 0 24 24" focusable="false">
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>`;
  }

  function bindPasswordToggle() {
    const controls = ensurePasswordToggle();
    if (!controls) return;
    const { passwordField, toggle } = controls;

    toggle.addEventListener('click', () => {
      passwordField.type = passwordField.type === 'password' ? 'text' : 'password';
      syncPasswordToggle();
      passwordField.focus();
    });

    syncPasswordToggle();
  }

  function bindSocialLogin() {
    document.querySelectorAll('[data-social-provider]').forEach((button) => {
      button.addEventListener('click', () => {
        const provider = button.getAttribute('data-social-provider');
        if (!provider) return;
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        window.location.href = socialLoginUrl(provider);
      });
    });
  }

  function handleAuthRedirectMessage() {
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get('auth');
    const authError = params.get('auth_error');

    if (authStatus === 'success') {
      setSessionNotice('');
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    }

    if (authError) {
      const messages = {
        oauth_config: 'Este proveedor aún no está configurado.',
        oauth_state: 'No se pudo validar la sesión social. Intenta nuevamente.',
        oauth_token: 'No se pudo validar la cuenta social.',
        oauth_email: 'El proveedor no entregó un email verificable.',
        oauth_db: 'No pudimos conectar con la base de datos. Revisa la configuración DB_* en HostGator.',
        oauth_provider: 'Proveedor no permitido.'
      };
      setAuthMessage(messages[authError] || 'No se pudo iniciar sesión social.', 'error');
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    }
  }

  function openModal(mode = 'login') {
    setMode(mode);
    const modal = qs('#auth-modal');
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    const modal = qs('#auth-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function requireAuth(message = 'Para guardar alojamientos o reservar, inicia sesión o crea una cuenta. Así protegemos tus datos y tu solicitud') {
    const user = state.user || loadUser();
    if (user?.email) {
      state.user = user;
      return true;
    }

    openModal('login');
    setAuthMessage(message, 'error');
    return false;
  }

  async function handleRegister(data) {
    const email = String(data.get('email') || '').trim().toLowerCase();
    const password = String(data.get('password') || '');
    const name = String(data.get('name') || '').trim() || 'Huésped';
    const phone = String(data.get('phone') || '').trim();
    const trap = String(data.get('company') || '').trim();

    if (trap) {
      setAuthMessage('No se pudo procesar el registro.', 'error');
      return;
    }

    const passError = validatePassword(password);
    if (passError) {
      setAuthMessage(passError, 'error');
      return;
    }

    try {
      const result = await postJson('registrar_usuario.php', { name, email, password, phone, company: trap });
      state.user = result.user;
      saveUser(result.user);
      setAuthMessage(`Cuenta creada. Hola, ${authDisplayName(result.user)}.`);

      document.dispatchEvent(new CustomEvent('urban:auth:register', { detail: result.user }));
      document.dispatchEvent(new CustomEvent('urban:auth:login', { detail: result.user }));

      setTimeout(closeModal, 900);
    } catch (error) {
      setAuthMessage(error.message || 'Error de conexion con el servidor', 'error');
    }
  }

  async function handleLogin(data) {
    const email = String(data.get('email') || '').trim().toLowerCase();
    const password = String(data.get('password') || '');

    if (!email || !password) {
      setAuthMessage('Ingresa email y contraseña.', 'error');
      return;
    }

    try {
      const result = await postJson('login.php', { email, password });
      state.user = result.user;
      saveUser(result.user);
      setAuthMessage(`Sesión iniciada. Hola, ${authDisplayName(result.user)}.`);

      document.dispatchEvent(new CustomEvent('urban:auth:login', { detail: result.user }));
      setTimeout(closeModal, 500);
    } catch (error) {
      setAuthMessage(error.message || 'Error al iniciar sesión', 'error');
    }
  }

  async function logout() {
    const previous = state.user || loadUser();
    try {
      await fetch('logout.php', { method: 'POST', credentials: 'same-origin' });
    } catch {
      // local cleanup still matters if the request fails
    }
    state.user = null;
    document.body.classList.remove('is-authenticated');
    delete document.body.dataset.sessionUser;
    clearUser();
    removeAccountSummaryBar();
    renderGuestActions();
    setSessionNotice('');
    document.dispatchEvent(new CustomEvent('urban:auth:logout', { detail: previous || null }));
  }

  function bindTriggers() {
    document.querySelectorAll('[data-auth-action]').forEach(bindAuthActionButton);

    qs('#auth-close')?.addEventListener('click', closeModal);

    const modal = qs('#auth-modal');
    if (modal) {
      modal.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeModal();
      if (event.key.toLowerCase() === 'l' && event.altKey) openModal('login');
    });
  }

  function bindForm() {
    const form = qs('#auth-form');
    if (!form) return;

    let isSubmitting = false;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (isSubmitting) return;
      const data = new FormData(form);
      const submit = qs('#auth-submit');
      const previousText = submit?.textContent || '';
      isSubmitting = true;
      if (submit) {
        submit.disabled = true;
        submit.textContent = state.mode === 'register' ? 'Creando cuenta...' : 'Ingresando...';
      }

      try {
        if (state.mode === 'register') {
          await handleRegister(data);
        } else {
          await handleLogin(data);
        }
      } finally {
        isSubmitting = false;
        if (submit) {
          submit.disabled = false;
          submit.textContent = previousText;
        }
      }
    });
  }

  async function initAuth() {
    state.user = loadUser();
    bindTriggers();
    bindForm();
    bindPasswordToggle();
    bindSocialLogin();
    handleAuthRedirectMessage();

    const serverUser = await getServerSession();
    if (serverUser) {
      state.user = serverUser;
      saveUser(serverUser);
    }

    if (state.user?.email) {
      renderUserActions(state.user);
      document.dispatchEvent(new CustomEvent('urban:auth:ready', { detail: { hasSession: true, user: state.user } }));
    } else {
      renderGuestActions();
      document.dispatchEvent(new CustomEvent('urban:auth:ready', { detail: { hasSession: false, user: null } }));
    }
  }

  window.UrbanAuth = {
    openModal,
    closeModal,
    requireAuth,
    logout,
    getUser: () => state.user
  };

  document.addEventListener('DOMContentLoaded', initAuth);
})();
