(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGSAP = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  var loader = $('#loader');
  var lenis = null;

  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* =============================================================
     HELPERS
  ============================================================= */
  function splitWords(el, mask) {
    var words = [];
    (function walk(node, grad) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span');
            w.className = mask === false ? 'w-nm' : 'w';
            var wi = document.createElement('span');
            wi.className = 'wi' + (grad ? ' grad' : '');
            wi.textContent = p;
            w.appendChild(wi); frag.appendChild(w); words.push(wi);
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1 && ch.tagName !== 'BR') {
          var g = ch.classList.contains('grad');
          if (g) ch.classList.remove('grad');
          walk(ch, g || grad);
        }
      });
    })(el, false);
    return words;
  }

  function splitChars(el) {
    var txt = el.textContent; el.textContent = ''; var out = [];
    txt.split('').forEach(function (c) {
      var w = document.createElement('span'); w.className = 'w';
      var wi = document.createElement('span'); wi.className = 'wi'; wi.textContent = c;
      w.appendChild(wi); el.appendChild(w); out.push(wi);
    });
    return out;
  }

  /* =============================================================
     MOBILE MENU
  ============================================================= */
  var ham = $('#ham'), mob = $('#mobile-menu'), nav = $('#nav');
  function setMenu(open) {
    ham.classList.toggle('open', open);
    mob.classList.toggle('open', open);
    ham.setAttribute('aria-expanded', String(open));
    if (lenis) { open ? lenis.stop() : lenis.start(); }
    else document.body.style.overflow = open ? 'hidden' : '';
  }
  ham.addEventListener('click', function () { setMenu(!mob.classList.contains('open')); });

  /* =============================================================
     ANCHORS
  ============================================================= */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var t = $(id);
      if (!t) return;
      e.preventDefault();
      if (mob.classList.contains('open')) setMenu(false);
      if (lenis) lenis.scrollTo(t, { offset: id === '#hero' ? 0 : -64, duration: 1.5 });
      else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  /* =============================================================
     FAQ
  ============================================================= */
  $$('.faq-item').forEach(function (it) {
    var q = $('.faq-q', it);
    q.addEventListener('click', function () {
      var wasOpen = it.classList.contains('is-open');
      $$('.faq-item.is-open').forEach(function (o) { o.classList.remove('is-open'); $('.faq-q', o).setAttribute('aria-expanded', 'false'); });
      if (!wasOpen) { it.classList.add('is-open'); q.setAttribute('aria-expanded', 'true'); }
      if (hasGSAP) setTimeout(function () { ScrollTrigger.refresh(); }, 650);
    });
  });

  /* =============================================================
     FORM -> WHATSAPP
  ============================================================= */
  var form = $('#booking-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = $('#nombre'), t = $('#telefono');
      var ok = true;
      [n, t].forEach(function (f) {
        var bad = !f.value.trim();
        f.parentElement.classList.toggle('invalid', bad);
        if (bad) ok = false;
      });
      if (!ok) { (n.value.trim() ? t : n).focus(); return; }
      var msg = [
        'Hola, quiero agendar una consulta con el Dr. Miguel Maldonado.', '',
        'Nombre: ' + n.value.trim(),
        'Teléfono: ' + t.value.trim(),
        'Tratamiento de interés: ' + $('#tratamiento').value,
        $('#mensaje').value.trim() ? 'Notas: ' + $('#mensaje').value.trim() : null, '',
        'Quedo al pendiente para confirmar un horario. ¡Gracias!'
      ].filter(function (x) { return x !== null; }).join('\n');
      var btn = $('#form-btn span'), old = btn.textContent;
      btn.textContent = 'Abriendo WhatsApp...';
      window.open('https://wa.me/525591061046?text=' + encodeURIComponent(msg), '_blank', 'noopener');
      setTimeout(function () { btn.textContent = old; }, 2600);
    });
  }

  /* =============================================================
     MAP TABS (Jacarandas / Xalpa)
  ============================================================= */
  var mapFrame = $('#map-iframe'), mapTabs = $$('.map-tab');
  mapTabs.forEach(function (b) {
    b.addEventListener('click', function () {
      if (!mapFrame || b.classList.contains('is-on')) return;
      mapTabs.forEach(function (o) {
        var on = o === b;
        o.classList.toggle('is-on', on);
        o.setAttribute('aria-pressed', String(on));
      });
      mapFrame.title = b.dataset.title;
      mapFrame.src = b.dataset.map;
    });
  });

  /* =============================================================
     SPOTLIGHT (cursor-follow glow on cards)
  ============================================================= */
  if (fine) {
    $$('.spot').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* =============================================================
     HERO CANVAS (constellation)
  ============================================================= */
  (function () {
    var canvas = $('#hero-canvas'); if (!canvas || reduce) return;
    var hero = $('#hero'), ctx = canvas.getContext('2d');
    var W, H, pts = [], raf = null, mx = -999, my = -999;
    var COLS = ['15,107,84', '242,163,58', '15,107,84', '90,170,200'];
    function resize() {
      var r = hero.getBoundingClientRect();
      W = canvas.width = r.width; H = canvas.height = r.height;
      var n = Math.min(70, Math.floor(W * H / 16000));
      pts = [];
      for (var i = 0; i < n; i++) pts.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2 + .8, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35, c: COLS[i % COLS.length], a: Math.random() * .4 + .2 });
    }
    resize(); window.addEventListener('resize', resize, { passive: true });
    hero.addEventListener('pointermove', function (e) { var r = hero.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    hero.addEventListener('pointerleave', function () { mx = my = -999; });
    function loop() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        var dx = p.x - mx, dy = p.y - my, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 130) { p.x += dx / d * .7; p.y += dy / d * .7; }
        p.x += p.vx; p.y += p.vy;
        if (p.x < -5) p.x = W + 5; if (p.x > W + 5) p.x = -5;
        if (p.y < -5) p.y = H + 5; if (p.y > H + 5) p.y = -5;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fillStyle = 'rgba(' + p.c + ',' + p.a + ')'; ctx.fill();
        for (var j = i + 1; j < pts.length; j++) {
          var q = pts[j], ax = p.x - q.x, ay = p.y - q.y, dd = ax * ax + ay * ay;
          if (dd < 11000) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.strokeStyle = 'rgba(15,107,84,' + (1 - dd / 11000) * .16 + ')'; ctx.lineWidth = .7; ctx.stroke(); }
        }
      }
      raf = requestAnimationFrame(loop);
    }
    loop();
    new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { if (!raf) loop(); } else { cancelAnimationFrame(raf); raf = null; }
    }).observe(hero);
  })();

  /* =============================================================
     NO GSAP / REDUCED MOTION: static fallback
  ============================================================= */
  if (!hasGSAP) {
    loader.classList.add('done');
    var hn = $('#nav');
    window.addEventListener('scroll', function () { hn.classList.toggle('scrolled', window.scrollY > 40); }, { passive: true });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* =============================================================
     LENIS SMOOTH SCROLL
  ============================================================= */
  if (!reduce) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* =============================================================
     STATE TRIGGERS (run even with reduced motion)
  ============================================================= */
  var progress = $('#progress');
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: function (s) {
      progress.style.transform = 'scaleX(' + s.progress + ')';
      var y = s.scroll();
      nav.classList.toggle('scrolled', y > 40);
      if (!mob.classList.contains('open')) {
        if (y > 500 && s.direction === 1) nav.classList.add('hide');
        else if (s.direction === -1 || y < 500) nav.classList.remove('hide');
      }
    }
  });

  $$('[data-spy]').forEach(function (a) {
    var sec = $('#' + a.dataset.spy); if (!sec) return;
    var endSec = (a.dataset.spyEnd && $('#' + a.dataset.spyEnd)) || sec;
    ScrollTrigger.create({ trigger: sec, endTrigger: endSec, start: 'top 55%', end: 'bottom 55%', onToggle: function (s) { a.classList.toggle('active', s.isActive); } });
  });

  /* story steps */
  var story = $('.story'), frames = $$('.frame'), panels = $$('.panel'), dots = $$('.stage-dots i');
  var frameTimers = [];
  function setStep(i) {
    story.dataset.step = i;
    frames.forEach(function (f, k) {
      if (k === i) {
        clearTimeout(frameTimers[k]);
        f.classList.remove('play'); void f.offsetWidth;
        f.classList.add('is-active', 'play');
      } else if (f.classList.contains('is-active')) {
        f.classList.remove('is-active');
        (function (ff, kk) { frameTimers[kk] = setTimeout(function () { ff.classList.remove('play'); }, 800); })(f, k);
      }
    });
    panels.forEach(function (p, k) { p.classList.toggle('is-active', k === i); });
    dots.forEach(function (d, k) { d.classList.toggle('on', k === i); });
  }
  frames[0].classList.add('play');
  panels.forEach(function (p, i) {
    ScrollTrigger.create({ trigger: p, start: 'top 62%', end: 'bottom 62%', onToggle: function (s) { if (s.isActive) setStep(i); } });
  });

  /* process step lighting */
  $$('[data-p]').forEach(function (s) {
    ScrollTrigger.create({ trigger: s, start: 'top 66%', onEnter: function () { s.classList.add('on'); }, onLeaveBack: function () { s.classList.remove('on'); } });
  });

  /* stats counters */
  $$('[data-count]').forEach(function (el) {
    var target = parseInt(el.dataset.count, 10);
    if (reduce) { el.textContent = target; return; }
    var o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: function () { gsap.to(o, { v: target, duration: 1.6, ease: 'power2.out', onUpdate: function () { el.textContent = Math.round(o.v); } }); }
    });
  });

  /* =============================================================
     SPLIT TEXT PREP
  ============================================================= */
  var heroTitle = $('[data-hero-split]');
  var heroWords = heroTitle ? splitWords(heroTitle) : [];
  var statement = $('[data-scrub]');
  var stWords = statement ? splitWords(statement, false) : [];
  var headWords = $$('[data-split]').map(function (h) { return { el: h, words: splitWords(h) }; });
  var footLetters = $('#foot-word') ? splitChars($('#foot-word')) : [];

  /* =============================================================
     MOTION (skipped with reduced motion)
  ============================================================= */
  function startMotion() {
    /* ---------- hero scrub-out ---------- */
    gsap.to('.hero-scene', { yPercent: -9, scale: .93, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero-copy', { yPercent: -10, opacity: .1, ease: 'none', scrollTrigger: { trigger: '#hero', start: '25% top', end: 'bottom top', scrub: true } });
    gsap.to('.aurora', { yPercent: 22, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });

    /* ---------- marquee with velocity ---------- */
    var track = $('#marquee-track');
    if (track) {
      var tw = gsap.to(track, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
      var idle;
      ScrollTrigger.create({
        trigger: '.marquee', start: 'top bottom', end: 'bottom top',
        onUpdate: function (s) {
          var v = 1 + Math.min(Math.abs(s.getVelocity()) / 320, 6);
          gsap.to(tw, { timeScale: s.direction * v, duration: .3, overwrite: true });
          clearTimeout(idle);
          idle = setTimeout(function () { gsap.to(tw, { timeScale: s.direction || 1, duration: 1.2 }); }, 140);
        }
      });
    }

    /* ---------- statement word scrub ---------- */
    if (stWords.length) {
      gsap.set(stWords, { opacity: .14 });
      gsap.to(stWords, { opacity: 1, ease: 'none', stagger: { each: .1 }, duration: .3, scrollTrigger: { trigger: statement, start: 'top 80%', end: 'bottom 55%', scrub: true } });
    }

    /* ---------- headings ---------- */
    headWords.forEach(function (h) {
      gsap.from(h.words, { yPercent: 118, rotate: 3, duration: 1.2, stagger: .045, ease: 'expo.out', scrollTrigger: { trigger: h.el, start: 'top 88%', once: true } });
    });

    /* ---------- fades + staggers ---------- */
    $$('[data-fade]').forEach(function (el) {
      gsap.from(el, { y: 40, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    $$('[data-stagger]').forEach(function (g) {
      gsap.from(g.children, { y: 50, opacity: 0, duration: 1, stagger: .12, ease: 'expo.out', scrollTrigger: { trigger: g, start: 'top 86%', once: true } });
    });

    /* ---------- story head glow ---------- */
    $$('.p-step').forEach(function (s) {
      gsap.from(s, { x: 50, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: s, start: 'top 90%', once: true } });
    });
    gsap.to('#p-line-fill', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.process-right', start: 'top 62%', end: 'bottom 70%', scrub: true } });

    /* ---------- stats ---------- */
    gsap.fromTo('.stats-bg span', { xPercent: 12 }, { xPercent: -34, ease: 'none', scrollTrigger: { trigger: '.stats', start: 'top bottom', end: 'bottom top', scrub: true } });

    /* ---------- gallery ---------- */
    $$('.g-item').forEach(function (it) {
      var mask = $('.g-mask', it), img = $('img', it);
      gsap.fromTo(mask, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: it, start: 'top 88%', once: true } });
      gsap.from(img, { scale: 1.35, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: it, start: 'top 88%', once: true } });
      gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: mask, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.from($('figcaption', it), { opacity: 0, x: -20, duration: 1, delay: .3, ease: 'expo.out', scrollTrigger: { trigger: it, start: 'top 85%', once: true } });
    });
    var gm = gsap.matchMedia();
    gm.add('(min-width: 700px)', function () {
      var amt = [-30, -90, -55];
      $$('.g-col').forEach(function (c, i) {
        gsap.to(c, { y: amt[i], ease: 'none', scrollTrigger: { trigger: '.g-grid', start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    });

    /* ---------- doctor ---------- */
    gsap.to('.doc-ring', { rotation: 140, ease: 'none', scrollTrigger: { trigger: '.doctor', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.doc-avatar', { scale: .7, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.doc-visual', start: 'top 80%', once: true } });
    var dv = $('.doc-visual');
    if (dv && fine) {
      dv.addEventListener('pointermove', function (e) {
        var r = dv.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
        gsap.to(dv, { rotationY: nx * 14, rotationX: -ny * 14, transformPerspective: 900, duration: .7, ease: 'power3.out' });
      });
      dv.addEventListener('pointerleave', function () { gsap.to(dv, { rotationY: 0, rotationX: 0, duration: 1, ease: 'elastic.out(1,.6)' }); });
    }

    /* ---------- contact blobs + footer ---------- */
    gsap.from('.book', { y: 80, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.book', start: 'top 90%', once: true } });
    if (footLetters.length) {
      gsap.from(footLetters, { yPercent: 105, duration: 1.4, stagger: .05, ease: 'expo.out', scrollTrigger: { trigger: '#foot-word', start: 'top 98%', once: true } });
    }

    /* ---------- magnetic buttons ---------- */
    if (fine) {
      $$('.magnetic').forEach(function (b) {
        var qx = gsap.quickTo(b, 'x', { duration: .5, ease: 'power3.out' });
        var qy = gsap.quickTo(b, 'y', { duration: .5, ease: 'power3.out' });
        b.addEventListener('pointermove', function (e) {
          var r = b.getBoundingClientRect();
          qx((e.clientX - r.left - r.width / 2) * .3); qy((e.clientY - r.top - r.height / 2) * .4);
        });
        b.addEventListener('pointerleave', function () { qx(0); qy(0); });
      });
    }

    /* ---------- horizontal services (desktop pin) ---------- */
    var mm = gsap.matchMedia();
    mm.add('(min-width: 1000px)', function () {
      var sec = $('.hs'), pin = $('.hs-pin'), tr = $('#hs-track'), fill = $('#hs-fill'), cur = $('#hs-cur');
      var cards = $$('.hs-card', tr);
      sec.classList.add('is-pinned');
      var dist = function () { return Math.max(0, tr.scrollWidth - window.innerWidth); };
      var tween = gsap.to(tr, {
        x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: {
          trigger: pin, start: 'top top', end: function () { return '+=' + dist(); },
          pin: true, scrub: .6, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: function (s) {
            fill.style.transform = 'scaleX(' + s.progress + ')';
            var idx = Math.min(cards.length - 1, Math.floor(s.progress * cards.length * .999));
            cur.textContent = String(idx + 1).padStart(2, '0');
          }
        }
      });
      cards.forEach(function (c) {
        gsap.fromTo($('.wm', c), { x: 70 }, { x: -70, ease: 'none', scrollTrigger: { trigger: c, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
        ScrollTrigger.create({ trigger: c, containerAnimation: tween, start: 'left 85%', once: true, onEnter: function () { c.classList.add('draw'); } });
      });
      return function () { sec.classList.remove('is-pinned'); };
    });
    mm.add('(max-width: 999px)', function () {
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('draw'); io.unobserve(e.target); } });
      }, { root: $('#hs-track'), threshold: .45 });
      $$('.hs-card').forEach(function (c) { io.observe(c); });
      return function () { io.disconnect(); };
    });
  }

  /* =============================================================
     HERO INTRO + LOOPS
  ============================================================= */
  function buildHeroIn() {
    var heroEl = $('#hero');
    var tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
    tl.from('.hero-badge', { y: 24, opacity: 0, duration: .9 }, 0)
      .from(heroWords, { yPercent: 118, rotate: 5, duration: 1.3, stagger: .06 }, .08)
      .from('.hero-sub', { y: 30, opacity: 0, duration: 1 }, .55)
      .from('.hero-actions .btn', { y: 30, opacity: 0, duration: 1, stagger: .1 }, .7)
      .from('.hero-trust li', { y: 20, opacity: 0, duration: .9, stagger: .08 }, .9)
      .from('.orbits', { scale: .7, opacity: 0, rotate: -25, duration: 2 }, .15)
      .from('.floor', { scaleX: .2, opacity: 0, duration: 1.4 }, .35)
      .from('.si-bottle', { y: -300, opacity: 0, duration: 1.5, ease: 'bounce.out' }, .4)
      .from('.si-pipette', { y: -140, opacity: 0, rotate: -12, duration: 1.3 }, .7)
      .from('.glass-card', { scale: .6, opacity: 0, y: 40, duration: 1.1, stagger: .12, ease: 'back.out(1.7)' }, .9)
      .add(function () { dropLoop(); mouseParallax(heroEl); }, 1.8);
    return tl;
  }

  function dropLoop() {
    var drop = $('.drop'), rips = $$('.ripples i'), rp = $('.ripples');
    if (!drop) return;
    gsap.set(drop, { xPercent: -50, yPercent: -30, scale: 0, transformOrigin: '50% 8%' });
    var tl = gsap.timeline({ repeat: -1, repeatDelay: .5 });
    tl.set(drop, { y: 0, scale: 0, opacity: 1 })
      .to(drop, { scale: 1, duration: .9, ease: 'power2.out' })
      .to(drop, { y: function () { var d = drop.getBoundingClientRect(), r = rp.getBoundingClientRect(); return Math.max(60, r.top + r.height * .5 - (d.top + d.height * .55)); }, scaleY: 1.3, scaleX: .85, duration: .8, ease: 'power2.in' })
      .set(drop, { opacity: 0 })
      .fromTo(rips, { scale: .15, opacity: .9 }, { scale: 1.15, opacity: 0, duration: 1.6, stagger: .22, ease: 'power2.out' }, '<');
  }

  function mouseParallax(heroEl) {
    if (!fine) return;
    var items = $$('.scene-item').map(function (el) {
      return { d: parseFloat(el.dataset.depth) || 20, x: gsap.quickTo(el, 'x', { duration: 1, ease: 'power3.out' }), y: gsap.quickTo(el, 'y', { duration: 1, ease: 'power3.out' }) };
    });
    var au = $$('.au').map(function (el, i) { return { d: 30 + i * 18, x: gsap.quickTo(el, 'x', { duration: 1.6, ease: 'power3.out' }), y: gsap.quickTo(el, 'y', { duration: 1.6, ease: 'power3.out' }) }; });
    heroEl.addEventListener('pointermove', function (e) {
      var r = heroEl.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
      items.forEach(function (s) { s.x(-nx * s.d * 1.6); s.y(-ny * s.d * 1.2); });
      au.forEach(function (s) { s.x(nx * s.d * 2); s.y(ny * s.d * 2); });
    });
  }

  /* =============================================================
     LOADER SEQUENCE
  ============================================================= */
  function finish() {
    loader.classList.add('done');
    ScrollTrigger.refresh();
  }

  if (reduce) {
    finish();
    return;
  }

  var num = $('#ld-num'), liquid = $('.ld-liquid');
  gsap.set(liquid, { y: 150 });
  var obj = { v: 0 };
  var ready = new Promise(function (r) { document.readyState === 'complete' ? r() : window.addEventListener('load', r); });
  var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  var guard = new Promise(function (r) { setTimeout(r, 5000); });

  var heroTl = buildHeroIn();
  startMotion();
  ScrollTrigger.refresh();

  var count = gsap.timeline();
  count.to(obj, { v: 100, duration: 2, ease: 'power2.inOut', onUpdate: function () { num.textContent = Math.round(obj.v); } }, 0)
       .to(liquid, { y: 6, duration: 2, ease: 'power2.inOut' }, 0);

  Promise.all([Promise.race([Promise.all([ready, fonts]), guard]), new Promise(function (r) { count.eventCallback('onComplete', r); })]).then(function () {
    var out = gsap.timeline({ onComplete: finish });
    out.to('.ld-core', { opacity: 0, y: -24, duration: .5, ease: 'power2.in' }, '+=.1')
       .to('.ld-p1', { yPercent: -100, duration: 1, ease: 'expo.inOut' }, '>-.1')
       .to('.ld-p2', { yPercent: 100, duration: 1, ease: 'expo.inOut' }, '<')
       .add(function () { heroTl.play(); }, '-=.7');
  });

})();
