(() => {
  'use strict';

  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* =========================
     SCROLL SUAVE
  ========================= */
  function initSmoothAnchors() {
    qsa('a[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        const href = link.getAttribute('href');
        if (!href || href === '#') return;
        const target = qs(href);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  /* =========================
     ANIMACIÓN AL HACER SCROLL
  ========================= */
  function initObserverReveals() {
    if (!('IntersectionObserver' in window)) return;
    const nodes = qsa('.card, .section, .hero-content');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    nodes.forEach(n => obs.observe(n));
  }

  /* =========================
     BARRA DE PROGRESO SCROLL
  ========================= */
  function initScrollProgress() {
    const bar = qs('#scroll-progress');
    if (!bar) return;

    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const val = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = val + '%';
    };

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* =========================
     BOTÓN SCROLL TOP
  ========================= */
  function initScrollTop() {
    const btn = qs('#scroll-top-btn');
    if (!btn) return;

    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 400);
    });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* =========================
     MICRO INTERACCIONES BOTONES
  ========================= */
  function initButtons() {
    qsa('.btn').forEach(btn => {
      btn.addEventListener('pointerdown', () => btn.classList.add('is-pressing'));
      btn.addEventListener('pointerup', () => btn.classList.remove('is-pressing'));
      btn.addEventListener('pointerleave', () => btn.classList.remove('is-pressing'));
    });
  }

  /* =========================
     MENU MOBILE
  ========================= */
  function initMenu() {
    const btn = qs('#menu-btn');
    const menu = qs('#menu');
    if (!btn || !menu) return;

    btn.addEventListener('click', () => {
      menu.classList.toggle('open');
    });
  }

  /* =========================
     TOAST NOTIFICACIONES
  ========================= */
  function showToast(msg = 'OK') {
    const toast = document.createElement('div');
    toast.className = 'demo-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }

  /* =========================
     FORMULARIOS UX
  ========================= */
  function initForms() {
    qsa('form').forEach(form => {
      if (form.matches('[data-reservation-form]')) return;

      form.addEventListener('submit', e => {
        const btn = qs('button[type="submit"]', form);
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Enviando...';
        }

        setTimeout(() => {
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'Enviar';
          }
          showToast('Formulario enviado');
        }, 1200);
      });
    });
  }

  /* =========================
     FAVORITOS (LIKE)
  ========================= */
  function initLikes() {
    qsa('.trend-like-btn, .property-like-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('is-liked')) return;
        btn.classList.add('is-liked');
        btn.textContent = '♥';
      });
    });
  }

  /* =========================
     MODO OSCURO / CLARO
  ========================= */
  function initTheme() {
    const toggle = document.createElement('button');
    toggle.textContent = '🌙';
    toggle.style.position = 'fixed';
    toggle.style.bottom = '80px';
    toggle.style.right = '15px';
    toggle.className = 'btn btn-ghost';
    document.body.appendChild(toggle);

    toggle.addEventListener('click', () => {
      document.body.classList.toggle('light');
      localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
    });

    if (localStorage.getItem('theme') === 'light') {
      document.body.classList.add('light');
    }
  }

  /* =========================
     ATAJOS TECLADO
  ========================= */
  function initKeyboard() {
    document.addEventListener('keydown', e => {
      if (e.altKey && e.key === 'b') {
        qs('#global-search-form input')?.focus();
      }
      if (e.key === 'Escape') {
        qsa('.open').forEach(el => el.classList.remove('open'));
      }
    });
  }

  /* =========================
     EFECTO HOVER CARDS
  ========================= */
  function initCardHover() {
    qsa('.card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-4px)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  /* =========================
     DETECTOR INACTIVIDAD
  ========================= */
  function initIdle() {
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        showToast('¿Sigues ahí? 👀');
      }, 60000);
    };
    ['mousemove', 'keydown', 'scroll'].forEach(evt =>
      window.addEventListener(evt, reset)
    );
    reset();
  }

  /* =========================
     AUTOFOCUS HASH
  ========================= */
  function initAutoFocus() {
    if (location.hash === '#contacto') {
      qs('#contact-form input')?.focus();
    }
  }

  /* =========================
     REDUCED MOTION
  ========================= */
  function initReducedMotion() {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      document.documentElement.classList.toggle('reduce-motion', mq.matches);
    };
    apply();
    mq.addEventListener('change', apply);
  }

  /* =========================
     INIT GENERAL
  ========================= */
  function init() {
    initSmoothAnchors();
    initObserverReveals();
    initScrollProgress();
    initScrollTop();
    initButtons();
    initMenu();
    initForms();
    initLikes();
    initTheme();
    initKeyboard();
    initCardHover();
    initIdle();
    initAutoFocus();
    initReducedMotion();
  }

  window.UrbanUx = {
    init
  };

})();
