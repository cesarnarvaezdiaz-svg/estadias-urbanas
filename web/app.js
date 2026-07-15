(() => {
  'use strict';

  const appState = {
    bootedAt: null,
    ready: false,
    searches: [],
    newsletterLeads: [],
    contactRequests: [],
    lastTheme: "dark",
    metrics: null,
    quotes: [],
    cityFilters: [],
    ownerLeads: [],
    demoRequests: 0,
    mapFilters: [],
    calendarMoves: [],
    globalSearches: [],
    authEvents: [],
    performance: [],
    citiesLoaded: 0,
    logs: []
  };

  function now() {
    return new Date().toISOString();
  }

  function pushLog(type, payload) {
    const entry = { type, payload, at: now() };
    appState.logs.push(entry);
    if (appState.logs.length > 200) {
      appState.logs.shift();
    }

    console.log(`[Urban:${type}]`, payload);
  }

  function persistRuntimeSnapshot() {
    try {
      localStorage.setItem(
        'urban.runtime',
        JSON.stringify({
          ready: appState.ready,
          bootedAt: appState.bootedAt,
          searchCount: appState.searches.length,
          leadCount: appState.newsletterLeads.length,
          contactCount: appState.contactRequests.length,
          theme: appState.lastTheme,
          quoteCount: appState.quotes.length,
          estimatedConversion: estimateConversionRate(),
          funnelScore: funnelScore(),
          ownerLeads: appState.ownerLeads.length,
          demoRequests: appState.demoRequests,
          mapFilters: appState.mapFilters.length,
          calendarMoves: appState.calendarMoves.length,
          globalSearches: appState.globalSearches.length,
          authEvents: appState.authEvents.length,
          performanceMarks: appState.performance.length,
          citiesLoaded: appState.citiesLoaded,
          lastEventAt: appState.logs.at(-1)?.at || null
        })
      );
    } catch {
      // noop
    }
  }

  function onReady(event) {
    appState.ready = true;
    appState.bootedAt = now();
    pushLog('ready', event.detail || {});
    persistRuntimeSnapshot();
  }

  function onSearch(event) {
    const payload = event.detail || {};
    appState.searches.push(payload);
    pushLog('search', payload);

    if (appState.searches.length % 3 === 0) {
      pushLog('insight', {
        message: 'Se detect籀 alto inter矇s de b繳squeda en home.',
        count: appState.searches.length
      });
    }

    persistRuntimeSnapshot();
  }

  function onNewsletter(event) {
    const payload = event.detail || {};
    appState.newsletterLeads.push(payload);
    pushLog('newsletter', payload);

    if (appState.newsletterLeads.length === 1) {
      pushLog('milestone', {
        message: 'Primer lead de newsletter captado en sesi籀n actual.'
      });
    }

    persistRuntimeSnapshot();
  }


  function onContact(event) {
    const payload = event.detail || {};
    appState.contactRequests.push(payload);
    pushLog('contact', payload);
    persistRuntimeSnapshot();
  }

  function onTheme(event) {
    const mode = event.detail?.mode || 'dark';
    appState.lastTheme = mode;
    pushLog('theme', { mode });
    persistRuntimeSnapshot();
  }

  function onMetrics(event) {
    appState.metrics = event.detail || null;
    pushLog('metrics', appState.metrics);
  }


  function onQuote(event) {
    const payload = event.detail || {};
    appState.quotes.push(payload);
    pushLog('quote', payload);
    persistRuntimeSnapshot();
  }

  function estimateConversionRate() {
    const searches = appState.searches.length || 1;
    const leads = appState.newsletterLeads.length + appState.contactRequests.length;
    return Number(((leads / searches) * 100).toFixed(2));
  }

  function onVisibilityChange() {
    pushLog('visibility', { hidden: document.hidden });
  }

  function exportStateAsJson() {
    return JSON.stringify(appState, null, 2);
  }


  function onCityFilter(event) {
    const filter = event.detail?.filter || 'all';
    appState.cityFilters.push({ filter, at: now() });
    pushLog('city-filter', { filter });
  }

  function onOwnerLead(event) {
    const payload = event.detail || {};
    appState.ownerLeads.push(payload);
    pushLog('owner-lead', payload);
    persistRuntimeSnapshot();
  }

  function onDemoRequested(event) {
    appState.demoRequests += 1;
    pushLog('demo-requested', event.detail || {});
    persistRuntimeSnapshot();
  }

  function funnelScore() {
    const totalActions = appState.searches.length + appState.newsletterLeads.length + appState.contactRequests.length + appState.ownerLeads.length;
    const weighted = totalActions + appState.demoRequests * 2;
    return weighted;
  }


  function onMapFilter(event) {
    const payload = event.detail || {};
    appState.mapFilters.push(payload);
    pushLog('map-filter', payload);
  }

  function onPropertyLike(event) {
    const payload = event.detail || {};
    pushLog('property-like', payload);
  }

  function onPropertyOpen(event) {
    const payload = event.detail || {};
    pushLog('property-open', payload);
  }

  function onPaymentClick(event) {
    const payload = event.detail || {};
    pushLog('payment-click', payload);
  }

  function onFooterCopy(event) {
    const payload = event.detail || {};
    pushLog('footer-copy', payload);
  }

  function onPlaceSelect(event) {
    const payload = event.detail || {};
    pushLog('place-select', payload);
  }

  function onImagePreview(event) {
    const payload = event.detail || {};
    pushLog('image-preview', payload);
  }

  function onScrollTop(event) {
    const payload = event.detail || {};
    pushLog('scroll-top', payload);
  }

  function onReservationOpen(event) {
    const payload = event.detail || {};
    pushLog('reservation-open', payload);
  }

  function onReservationSubmit(event) {
    const payload = event.detail || {};
    pushLog('reservation-submit', payload);
  }

  function onCityGuideOpen(event) {
    const payload = event.detail || {};
    pushLog('city-guide-open', payload);
  }

  function onPlanSelect(event) {
    const payload = event.detail || {};
    pushLog('plan-select', payload);
  }

  function onBlogClick(event) {
    const payload = event.detail || {};
    pushLog('blog-click', payload);
  }

  function onCompareFeature(event) {
    const payload = event.detail || {};
    pushLog('compare-feature', payload);
  }

  function onServiceHighlight(event) {
    const payload = event.detail || {};
    pushLog('service-highlight', payload);
  }

  function onFaqOpen(event) {
    const payload = event.detail || {};
    pushLog('faq-open', payload);
  }

  function onLanguageChange(event) {
    const payload = event.detail || {};
    pushLog('language-change', payload);
  }

  function onCurrencyChange(event) {
    const payload = event.detail || {};
    pushLog('currency-change', payload);
  }

  function onCalendarChange(event) {
    const payload = event.detail || {};
    appState.calendarMoves.push(payload);
    pushLog('calendar-change', payload);
  }

  function onGlobalSearch(event) {
    const payload = event.detail || {};
    appState.globalSearches.push(payload);
    pushLog('global-search', payload);
  }


  function onAuthEvent(type, event) {
    const payload = event.detail || null;
    appState.authEvents.push({ type, payload, at: now() });
    pushLog(type, payload);
    persistRuntimeSnapshot();
  }

  function onCitiesReady(event) {
    const count = Number(event.detail?.count || 0);
    appState.citiesLoaded = count;
    pushLog('cities-ready', { count });
    persistRuntimeSnapshot();
  }

  function onPerformance(event) {
    const payload = event.detail || {};
    appState.performance.push(payload);
    pushLog('performance', payload);
  }

  function initEventAudit() {
    const channels = ['urban:ready', 'urban:search', 'urban:newsletter', 'urban:contact', 'urban:theme'];
    channels.forEach((channel) => {
      document.addEventListener(channel, () => {
        const counterKey = `counter:${channel}`;
        const last = Number(sessionStorage.getItem(counterKey) || 0) + 1;
        sessionStorage.setItem(counterKey, String(last));
      });
    });
  }

  function initHeartbeat() {
    setInterval(() => {
      pushLog('heartbeat', {
        ready: appState.ready,
        searches: appState.searches.length,
        leads: appState.newsletterLeads.length,
        conversion: estimateConversionRate(),
        funnel: funnelScore()
      });
      persistRuntimeSnapshot();
    }, 30000);
  }

  function exposeDebugApi() {
    window.UrbanApp = {
      getState: () => structuredClone(appState),
      clearLogs: () => {
        appState.logs = [];
      },
      exportStateAsJson,
      resetSession: () => {
        appState.searches = [];
        appState.newsletterLeads = [];
        appState.contactRequests = [];
        appState.metrics = null;
        appState.quotes = [];
        appState.cityFilters = [];
        appState.ownerLeads = [];
        appState.demoRequests = 0;
        appState.mapFilters = [];
        appState.calendarMoves = [];
        appState.globalSearches = [];
        appState.authEvents = [];
        appState.performance = [];
        appState.citiesLoaded = 0;
        appState.logs = [];
        appState.ready = false;
        appState.bootedAt = null;
        persistRuntimeSnapshot();
      }
    };
  }

  function init() {
    document.addEventListener('urban:ready', onReady);
    document.addEventListener('urban:search', onSearch);
    document.addEventListener('urban:newsletter', onNewsletter);
    document.addEventListener('urban:contact', onContact);
    document.addEventListener('urban:theme', onTheme);
    document.addEventListener('urban:metrics', onMetrics);
    document.addEventListener('urban:quote', onQuote);
    document.addEventListener('urban:city-filter', onCityFilter);
    document.addEventListener('urban:owner-lead', onOwnerLead);
    document.addEventListener('urban:demo-requested', onDemoRequested);
    document.addEventListener('urban:map-filter', onMapFilter);
    document.addEventListener('urban:property-like', onPropertyLike);
    document.addEventListener('urban:property-open', onPropertyOpen);
    document.addEventListener('urban:payment-click', onPaymentClick);
    document.addEventListener('urban:footer-copy', onFooterCopy);
    document.addEventListener('urban:place-select', onPlaceSelect);
    document.addEventListener('urban:image-preview', onImagePreview);
    document.addEventListener('urban:scroll-top', onScrollTop);
    document.addEventListener('urban:property-reserve-open', onReservationOpen);
    document.addEventListener('urban:reservation-submit', onReservationSubmit);
    document.addEventListener('urban:city-guide-open', onCityGuideOpen);
    document.addEventListener('urban:plan-select', onPlanSelect);
    document.addEventListener('urban:blog-click', onBlogClick);
    document.addEventListener('urban:compare-feature', onCompareFeature);
    document.addEventListener('urban:service-highlight', onServiceHighlight);
    document.addEventListener('urban:faq-open', onFaqOpen);
    document.addEventListener('urban:language-change', onLanguageChange);
    document.addEventListener('urban:currency-change', onCurrencyChange);
    document.addEventListener('urban:calendar-change', onCalendarChange);
    document.addEventListener('urban:global-search', onGlobalSearch);
    document.addEventListener('urban:auth:ready', (event) => onAuthEvent('auth-ready', event));
    document.addEventListener('urban:auth:login', (event) => onAuthEvent('auth-login', event));
    document.addEventListener('urban:auth:register', (event) => onAuthEvent('auth-register', event));
    document.addEventListener('urban:auth:logout', (event) => onAuthEvent('auth-logout', event));
    document.addEventListener('urban:performance', onPerformance);
    document.addEventListener('urban:cities:ready', onCitiesReady);
    document.addEventListener('visibilitychange', onVisibilityChange);

    exposeDebugApi();
    initEventAudit();
    initHeartbeat();
    pushLog('init', { message: 'App controller inicializado.' });
  }

  init();
  // Nos aseguramos de que el c車digo se ejecute solo cuando el HTML ya carg車 completamente
// Usamos delegaci車n de eventos: escuchamos los clics en todo el documento
document.addEventListener('click', function(evento) {
    
    let botonSocial = evento.target.closest('.booking-social-btn');
    
    if (botonSocial) {
        evento.preventDefault();
        
        let proveedor = botonSocial.getAttribute('data-social-provider');
        
        if (proveedor === 'google') {
            // 1. Tus variables
            let cliente_id = '211056906904-j0fo6gmarci60n9g73f4ksrccua3ub23.apps.googleusercontent.com'; 
            let ruta_redireccion = 'https://www.estadiasurbanas.com/callback_google.php';
            
            // 2. Armamos la ruta, pero esta vez "codificamos" el enlace de retorno
            let url_google = "https://accounts.google.com/o/oauth2/v2/auth";
            url_google = url_google + "?client_id=" + cliente_id;
            
            // AQUI ESTA LA MAGIA: encodeURIComponent transforma el https:// en texto seguro
            url_google = url_google + "&redirect_uri=" + encodeURIComponent(ruta_redireccion);
            
            url_google = url_google + "&response_type=code";
            url_google = url_google + "&scope=email%20profile";
            
            // 3. Redirigimos de forma segura
            window.location.href = url_google;
            
        } else {
            alert('El inicio de sesi車n con ' + proveedor + ' estar芍 disponible pr車ximamente.');
        }
    }
});
})();
