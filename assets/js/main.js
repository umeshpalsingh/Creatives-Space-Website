/* Creatives Space — shared site script (all pages) */
(() => {
  'use strict';

  /* ------------------------------------------------------------------
     Config — set to a form endpoint (e.g. Formspree, Basin, or your CRM
     webhook) to receive quote requests by POST. When empty, the form
     falls back to a pre-filled text message to the business phone.
     ------------------------------------------------------------------ */
  const QUOTE_ENDPOINT = '';
  const PHONE = '+14795304767';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const page = document.body.dataset.page || 'home';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad = n => String(n).padStart(2, '0');

  /* ---------------- Split text into masked words ---------------- */
  function splitWords(el) {
    let i = 0;
    const walk = node => {
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === 3) {
          const parts = child.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const inner = document.createElement('span');
            inner.textContent = p;
            inner.style.setProperty('--i', i++);
            w.appendChild(inner);
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    walk(el);
    el.setAttribute('aria-label', label);
    $$('.w', el).forEach(w => w.setAttribute('aria-hidden', 'true'));
  }
  $$('[data-split]').forEach(splitWords);

  /* ---------------- Active navigation (WordPress menu classes) ---------------- */
  const navKey = href => href === 'index.html#reviews' ? 'reviews'
    : href.indexOf('#') > -1 ? '' : href.replace('.html', '').replace('index', 'home');
  const menuItems = $$('.menu-item');
  const setNav = key => menuItems.forEach(li => {
    const a = li.querySelector('a');
    const on = navKey(a.getAttribute('href')) === key;
    li.classList.toggle('current-menu-item', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  setNav(page);
  const reviewsSection = $('#reviews');
  if (page === 'home' && reviewsSection) {
    new IntersectionObserver(([e]) => setNav(e.isIntersecting ? 'reviews' : 'home'), { rootMargin: '-45% 0px -50% 0px' }).observe(reviewsSection);
  }

  /* ---------------- Preloader & hero entrance ---------------- */
  const heroH1 = $('[data-hero-split]');
  if (heroH1) $$('.w > span', heroH1).forEach(s => s.style.setProperty('--base', '250ms'));
  const skipPre = root.classList.contains('skip-pre');
  let readied = false;
  const ready = () => {
    if (readied) return; readied = true;
    root.classList.add('is-loaded');
    setTimeout(() => {
      root.classList.add('is-ready');
      heroH1 && heroH1.classList.add('is-in');
      startHero();
    }, reduce || skipPre ? 30 : 450);
  };
  // Don't wait for every image on the page (window.load) — only the hero image + fonts.
  if (skipPre) ready();
  else {
    const heroImg = $('img[fetchpriority="high"]');
    const imgReady = heroImg && !heroImg.complete
      ? new Promise(r => { heroImg.addEventListener('load', r, { once: true }); heroImg.addEventListener('error', r, { once: true }); })
      : Promise.resolve();
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    const minShow = new Promise(r => setTimeout(r, reduce ? 0 : Math.max(0, 900 - performance.now())));
    Promise.all([imgReady, fontsReady, minShow]).then(ready);
  }
  setTimeout(ready, 1800); // never block longer than this

  /* ---------------- Reveal on scroll ---------------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.__rv.forEach(el => el.classList.add('is-in')); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  // Fully clipped elements never intersect, so image reveals are triggered by their parent.
  const revealTarget = el => (el.dataset.reveal === 'img' ? el.parentElement : el);
  $$('[data-reveal], [data-split]:not([data-hero-split])').forEach(el => {
    const t = revealTarget(el);
    (t.__rv = t.__rv || []).push(el);
    io.observe(t);
  });
  // Safety net: anything skipped by a fast fling or anchor jump is revealed once scrolling settles.
  let settleTimer;
  const settle = () => {
    $$('[data-reveal]:not(.is-in), [data-split]:not(.is-in):not([data-hero-split])').forEach(el => {
      const t = revealTarget(el);
      if (t.getBoundingClientRect().top < innerHeight) { el.classList.add('is-in'); io.unobserve(t); }
    });
  };
  window.addEventListener('scroll', () => { clearTimeout(settleTimer); settleTimer = setTimeout(settle, 160); }, { passive: true });
  window.addEventListener('load', () => setTimeout(settle, 400));
  setTimeout(settle, 1900);

  /* ---------------- Header, progress, FAB ---------------- */
  const header = $('.site-header');
  const progress = $('.progress');
  const fab = $('.fab');
  let lastY = window.scrollY;
  function onScrollUI() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    header.classList.toggle('is-scrolled', y > 40);
    const menuOpen = root.classList.contains('menu-open');
    if (!menuOpen && y > 500 && y > lastY + 4) header.classList.add('is-hidden');
    else if (y < lastY - 4 || y < 500 || menuOpen) header.classList.remove('is-hidden');
    if (fab) fab.classList.toggle('is-shown', y > innerHeight * .8);
    lastY = y;
  }

  /* ---------------- Mobile menu ---------------- */
  const burger = $('.burger');
  const mobileMenu = $('.mobile-menu');
  function setMenu(open) {
    root.classList.toggle('menu-open', open);
    document.body.classList.toggle('is-locked', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mobileMenu.setAttribute('aria-hidden', !open);
    if (open) header.classList.remove('is-hidden');
  }
  burger.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
  $$('a', mobileMenu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && root.classList.contains('menu-open')) setMenu(false); });
  window.addEventListener('resize', () => { if (innerWidth > 1180 && root.classList.contains('menu-open')) setMenu(false); });

  /* ---------------- Hero slideshow (home) ---------------- */
  const slides = $$('.hero__slide');
  const thumbs = $$('.hero-card__thumb');
  const heroTitle = $('[data-hero-title]');
  const heroIdx = $('[data-hero-idx]');
  const heroBar = $('.hero-card__bar span');
  const heroTitles = thumbs.map(t => t.dataset.title || t.getAttribute('aria-label') || '');
  const HERO_DUR = 6500;
  const hasSlideshow = slides.length > 1;
  let heroI = 0, heroTimer = null;
  function showHero(i) {
    heroI = (i + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle('is-active', k === heroI));
    thumbs.forEach((t, k) => { t.classList.toggle('is-active', k === heroI); t.setAttribute('aria-selected', k === heroI); });
    if (heroTitle && heroTitles[heroI]) heroTitle.textContent = heroTitles[heroI];
    if (heroIdx) heroIdx.textContent = pad(heroI + 1);
    if (heroBar && !reduce) {
      heroBar.classList.remove('run'); void heroBar.offsetWidth; heroBar.style.setProperty('--dur', HERO_DUR + 'ms'); heroBar.classList.add('run');
    }
  }
  function startHero() {
    if (!hasSlideshow || reduce || heroTimer) return;
    showHero(0);
    heroTimer = setInterval(() => showHero(heroI + 1), HERO_DUR);
  }
  thumbs.forEach((t, k) => t.addEventListener('click', () => {
    clearInterval(heroTimer); heroTimer = null;
    showHero(k);
    if (!reduce) heroTimer = setInterval(() => showHero(heroI + 1), HERO_DUR);
  }));
  document.addEventListener('visibilitychange', () => {
    if (reduce || !hasSlideshow) return;
    if (document.hidden) { clearInterval(heroTimer); heroTimer = null; }
    else if (readied && !heroTimer) heroTimer = setInterval(() => showHero(heroI + 1), HERO_DUR);
  });

  /* ---------------- Pointer: depth, cursor, magnetic, tilt ---------------- */
  const pointer = { x: 0, y: 0, nx: 0, ny: 0, sx: 0, sy: 0 };
  const depthEls = $$('[data-depth]');
  const cursor = $('.cursor');
  const ring = $('.cursor-ring');
  const ringLabel = ring && $('span', ring);
  const ringPos = { x: -100, y: -100 };
  const hoverSel = 'a, button, [data-cursor], input, select, textarea, label, summary';

  if (finePointer && !reduce && cursor && ring) {
    window.addEventListener('pointermove', e => {
      pointer.x = e.clientX; pointer.y = e.clientY;
      pointer.nx = (e.clientX / innerWidth) * 2 - 1;
      pointer.ny = (e.clientY / innerHeight) * 2 - 1;
      if (!root.classList.contains('has-cursor')) root.classList.add('has-cursor');
    }, { passive: true });
    document.addEventListener('pointerleave', () => root.classList.remove('has-cursor'));

    document.addEventListener('pointerover', e => {
      const t = e.target.closest(hoverSel);
      ring.classList.remove('is-hover', 'is-label');
      if (!t) return;
      const label = t.getAttribute('data-cursor');
      if (label) { ringLabel.textContent = label; ring.classList.add('is-label'); cursor.classList.add('is-hidden'); }
      else { ring.classList.add('is-hover'); cursor.classList.remove('is-hidden'); }
    });
    document.addEventListener('pointerout', e => {
      if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest(hoverSel)) {
        ring.classList.remove('is-hover', 'is-label'); cursor.classList.remove('is-hidden');
      }
    });

    // Magnetic buttons
    $$('[data-magnetic]').forEach(el => {
      const label = $('.btn__label', el) || el.firstElementChild;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * .22}px, ${dy * .32}px)`;
        if (label) label.style.transform = `translate(${dx * .08}px, ${dy * .1}px)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition = 'transform .7s cubic-bezier(.16,1,.3,1), background .5s, color .5s, box-shadow .5s';
        el.style.transform = '';
        if (label) { label.style.transition = 'transform .7s cubic-bezier(.16,1,.3,1)'; label.style.transform = ''; }
        setTimeout(() => { el.style.transition = ''; if (label) label.style.transition = ''; }, 700);
      });
    });

    // 3D tilt cards
    $$('[data-tilt]').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.transform = `rotateX(${(.5 - py) * 9}deg) rotateY(${(px - .5) * 11}deg) translateZ(0)`;
        card.style.setProperty('--mx', px * 100 + '%');
        card.style.setProperty('--my', py * 100 + '%');
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }
  const pointerFx = finePointer && !reduce && cursor && ring;

  /* ---------------- Main animation loop ---------------- */
  const parallaxEls = $$('[data-parallax]');
  const heroScale = $('[data-scroll-scale]');
  let scrollDirty = true;
  let rafId = 0;
  const kick = () => { if (!rafId) rafId = requestAnimationFrame(frame); };
  window.addEventListener('scroll', () => { scrollDirty = true; kick(); }, { passive: true });
  window.addEventListener('resize', () => { scrollDirty = true; kick(); });
  if (pointerFx) window.addEventListener('pointermove', kick, { passive: true });

  function frame() {
    rafId = 0;
    let moving = false;
    if (scrollDirty) {
      scrollDirty = false;
      onScrollUI();
      if (!reduce) {
        const vh = innerHeight;
        parallaxEls.forEach(el => {
          const r = el.parentElement.getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) return;
          const speed = parseFloat(el.dataset.parallax) || 0;
          const center = r.top + r.height / 2 - vh / 2;
          el.style.transform = `translate3d(0, ${(-center * speed).toFixed(1)}px, 0)`;
        });
        if (heroScale) {
          const y = Math.min(window.scrollY, vh);
          heroScale.style.setProperty('--sy', (y * .25).toFixed(1) + 'px');
          heroScale.style.setProperty('--ss', (1 + y / vh * .08).toFixed(3));
          if (!pointerFx) heroScale.style.transform = 'translate3d(0, var(--sy, 0px), 0) scale(var(--ss, 1))';
        }
      }
    }
    if (pointerFx) {
      pointer.sx = lerp(pointer.sx, pointer.nx, .06);
      pointer.sy = lerp(pointer.sy, pointer.ny, .06);
      depthEls.forEach(el => {
        const d = parseFloat(el.dataset.depth) || 0;
        const tx = (pointer.sx * d * 24).toFixed(2), ty = (pointer.sy * d * 24).toFixed(2);
        if (el === heroScale) el.style.transform = `translate3d(${tx}px, calc(${ty}px + var(--sy, 0px)), 0) scale(var(--ss, 1))`;
        else el.style.translate = `${tx}px ${ty}px`;
      });
      cursor.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
      ringPos.x = lerp(ringPos.x, pointer.x, .18);
      ringPos.y = lerp(ringPos.y, pointer.y, .18);
      ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
      moving = Math.abs(pointer.sx - pointer.nx) > .001 || Math.abs(pointer.sy - pointer.ny) > .001 ||
               Math.abs(ringPos.x - pointer.x) > .3 || Math.abs(ringPos.y - pointer.y) > .3;
    }
    if (moving || scrollDirty) kick(); // otherwise sleep until the next scroll / pointer move
  }
  kick();

  /* ---------------- Counters ---------------- */
  const countIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const el = e.target, end = +el.dataset.count;
      if (reduce) { el.textContent = end; return; }
      const dur = 1900, t0 = performance.now();
      const tick = now => {
        const p = clamp((now - t0) / dur, 0, 1);
        el.textContent = Math.round(end * (1 - Math.pow(2, -10 * p)));
        if (p < 1) requestAnimationFrame(tick); else el.textContent = end;
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: .6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------------- Services explorer ---------------- */
  const svcRows = $$('.svc-row');
  if (svcRows.length) {
    const svcImgs = $$('.svc-media__img');
    const svcNum = $('[data-svc-num]');
    const svcTags = $('[data-svc-tags]');
    const desktopSvc = window.matchMedia('(min-width: 961px)');
    let svcActive = 0;
    const setSvc = (i, force) => {
      if (i === svcActive && !force) return;
      const prev = svcActive;
      svcActive = i;
      svcRows.forEach((r, k) => { r.classList.toggle('is-active', k === i); $('.svc-row__btn', r).setAttribute('aria-expanded', k === i); });
      svcImgs.forEach((im, k) => { im.classList.remove('was-active'); im.classList.toggle('is-active', k === i); });
      if (svcImgs[prev] && prev !== i) svcImgs[prev].classList.add('was-active');
      if (svcNum) svcNum.textContent = pad(i + 1);
      if (svcTags) {
        svcTags.innerHTML = '';
        (svcRows[i]?.dataset.tags || '').split('|').filter(Boolean).forEach(t => { const s = document.createElement('span'); s.textContent = t; svcTags.appendChild(s); });
      }
    };
    svcRows.forEach((row, i) => {
      const btn = $('.svc-row__btn', row);
      btn.addEventListener('mouseenter', () => { if (desktopSvc.matches) setSvc(i); });
      btn.addEventListener('focus', () => { if (desktopSvc.matches) setSvc(i); });
      btn.addEventListener('click', () => {
        if (!desktopSvc.matches && row.classList.contains('is-active')) {
          row.classList.remove('is-active'); btn.setAttribute('aria-expanded', 'false'); svcActive = -1; return;
        }
        setSvc(i, true);
      });
    });
    setSvc(0, true);
  }

  /* ---------------- Gallery filter ---------------- */
  const tiles = $$('#masonry .tile');
  const chips = $$('.chip');
  chips.forEach(c => {
    const f = c.dataset.filter;
    const sup = $('sup', c);
    if (sup) sup.textContent = f === 'all' ? tiles.length : tiles.filter(t => t.dataset.cat === f).length;
    c.addEventListener('click', () => {
      chips.forEach(x => { x.classList.toggle('is-active', x === c); x.setAttribute('aria-pressed', x === c); });
      tiles.forEach(t => {
        const show = f === 'all' || t.dataset.cat === f;
        if (show) {
          t.classList.remove('is-gone');
          t.classList.add('is-in');
          requestAnimationFrame(() => requestAnimationFrame(() => t.classList.remove('is-out')));
        } else {
          t.classList.add('is-out');
          setTimeout(() => { if (t.classList.contains('is-out')) t.classList.add('is-gone'); }, reduce ? 0 : 450);
        }
      });
    });
  });

  /* ---------------- Dialog helpers ---------------- */
  function openDialog(d) {
    if (!d || d.open) return;
    d.showModal();
    document.body.classList.add('is-locked');
    requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add('is-open')));
  }
  function closeDialog(d) {
    if (!d || !d.open) return;
    d.classList.remove('is-open');
    setTimeout(() => { d.close(); }, reduce ? 0 : 600);
  }
  $$('dialog').forEach(d => {
    d.addEventListener('cancel', e => { e.preventDefault(); closeDialog(d); });
    d.addEventListener('close', () => { if (!$$('dialog').some(x => x.open) && !root.classList.contains('menu-open')) document.body.classList.remove('is-locked'); });
    $$('[data-close]', d).forEach(b => b.addEventListener('click', () => closeDialog(d)));
  });

  /* ---------------- Lightbox ---------------- */
  const lb = $('#lightbox');
  if (lb) {
    const lbImg = $('.lightbox__stage img', lb);
    let lbList = [], lbI = 0;
    const lbRender = (dir = 0) => {
      const it = lbList[lbI];
      const apply = () => {
        lbImg.src = it.src; lbImg.alt = it.alt || it.cap;
        $('[data-lb-cap]', lb).textContent = it.cap;
        $('[data-lb-cat]', lb).textContent = it.cat;
        $('[data-lb-i]', lb).textContent = lbI + 1;
        $('[data-lb-n]', lb).textContent = lbList.length;
        lbImg.classList.remove('is-swapping');
      };
      if (dir && !reduce) { lbImg.classList.add('is-swapping'); setTimeout(apply, 220); } else apply();
      const multi = lbList.length > 1;
      $('[data-lb-prev]', lb).hidden = !multi; $('[data-lb-next]', lb).hidden = !multi;
    };
    const lbOpen = (list, i) => { lbList = list; lbI = i; lbRender(); openDialog(lb); };
    const lbStep = d => { lbI = (lbI + d + lbList.length) % lbList.length; lbRender(d); };
    $('[data-lb-prev]', lb).addEventListener('click', () => lbStep(-1));
    $('[data-lb-next]', lb).addEventListener('click', () => lbStep(1));
    lb.addEventListener('keydown', e => { if (e.key === 'ArrowRight') lbStep(1); if (e.key === 'ArrowLeft') lbStep(-1); });
    lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lightbox__stage')) closeDialog(lb); });
    let touchX = null;
    const stage = $('.lightbox__stage', lb);
    stage.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', e => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) lbStep(dx < 0 ? 1 : -1);
      touchX = null;
    });
    const itemOf = el => ({ src: el.dataset.src, cap: el.dataset.cap, cat: el.dataset.label || el.dataset.cat || '', alt: $('img', el)?.alt });
    tiles.forEach(t => t.addEventListener('click', () => {
      const visible = tiles.filter(x => !x.classList.contains('is-gone') && !x.classList.contains('is-out'));
      lbOpen(visible.map(itemOf), Math.max(0, visible.indexOf(t)));
    }));
    $$('.feature').forEach(f => {
      const group = $$('[data-lightbox]', f);
      group.forEach((el, i) => el.addEventListener('click', () => lbOpen(group.map(itemOf), i)));
    });
  }

  /* ---------------- Compare slider ---------------- */
  $$('[data-compare]').forEach(c => {
    const input = $('input', c);
    const set = v => c.style.setProperty('--pos', v + '%');
    input.addEventListener('input', () => set(input.value));
    set(input.value);
    if (!reduce) {
      const cio = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return; cio.disconnect();
        const t0 = performance.now();
        const anim = now => {
          const p = clamp((now - t0) / 1800, 0, 1);
          const v = 50 + Math.sin(p * Math.PI * 2) * 22 * (1 - p);
          input.value = v; set(v);
          if (p < 1) requestAnimationFrame(anim);
        };
        setTimeout(() => requestAnimationFrame(anim), 900);
      }, { threshold: .5 });
      cio.observe(c);
    }
  });

  /* ---------------- Process steps ---------------- */
  const steps = $$('.step');
  if (steps.length) {
    const pImgs = $$('.process__img');
    const rail = $('.process__rail');
    const badge = $('[data-step-badge]');
    const badgeName = $('[data-step-name]');
    const stepIO = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const i = steps.indexOf(e.target);
        steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
        pImgs.forEach((im, k) => im.classList.toggle('is-active', k === i));
        if (rail) rail.style.setProperty('--p', (i + 1) / steps.length);
        if (badge) badge.textContent = pad(i + 1);
        if (badgeName) badgeName.textContent = e.target.dataset.name;
      });
    }, { rootMargin: '-40% 0px -50% 0px' });
    steps.forEach(s => stepIO.observe(s));
  }

  /* ---------------- Testimonials ---------------- */
  const tSlides = $$('.slide');
  const reviewsWrap = $('.reviews');
  if (tSlides.length && reviewsWrap) {
    const dotsWrap = $('.dots', reviewsWrap);
    const curEl = $('[data-cur]', reviewsWrap);
    const totalEl = $('[data-total]', reviewsWrap);
    if (totalEl) totalEl.textContent = pad(tSlides.length);
    const T_DUR = 7500;
    let tI = 0, tTimer = null, tPaused = false;
    const dots = tSlides.map((_, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-label', `Review ${i + 1}`);
      b.style.setProperty('--dur', T_DUR + 'ms');
      b.addEventListener('click', () => { tGo(i); tRestart(); });
      dotsWrap.appendChild(b);
      return b;
    });
    function tGo(i) {
      tI = (i + tSlides.length) % tSlides.length;
      tSlides.forEach((s, k) => { s.classList.toggle('is-active', k === tI); s.setAttribute('aria-hidden', k !== tI); });
      dots.forEach((d, k) => {
        d.classList.remove('is-active');
        d.classList.toggle('is-done', k < tI);
        d.setAttribute('aria-selected', k === tI);
      });
      void dotsWrap.offsetWidth;
      if (!reduce) dots[tI].classList.add('is-active'); else dots[tI].classList.add('is-done');
      if (curEl) curEl.textContent = pad(tI + 1);
    }
    function tRestart() {
      clearInterval(tTimer);
      if (reduce) return;
      tTimer = setInterval(() => { if (!tPaused) tGo(tI + 1); }, T_DUR);
    }
    $('[data-prev]', reviewsWrap)?.addEventListener('click', () => { tGo(tI - 1); tRestart(); });
    $('[data-next]', reviewsWrap)?.addEventListener('click', () => { tGo(tI + 1); tRestart(); });
    const stageQ = $('.quote-stage', reviewsWrap);
    stageQ.addEventListener('mouseenter', () => { tPaused = true; dots[tI].classList.add('is-paused'); });
    stageQ.addEventListener('mouseleave', () => { tPaused = false; dots.forEach(d => d.classList.remove('is-paused')); tGo(tI); tRestart(); });
    let qx = null;
    stageQ.addEventListener('touchstart', e => { qx = e.touches[0].clientX; }, { passive: true });
    stageQ.addEventListener('touchend', e => {
      if (qx === null) return;
      const dx = e.changedTouches[0].clientX - qx;
      if (Math.abs(dx) > 50) { tGo(tI + (dx < 0 ? 1 : -1)); tRestart(); }
      qx = null;
    });
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { tGo(tI); tRestart(); } else clearInterval(tTimer);
    }, { threshold: .25 }).observe(reviewsWrap);
    tGo(0);
  }

  /* ---------------- Service area map ---------------- */
  const cities = $$('.city');
  const pins = $$('.pin');
  if (cities.length) {
    const setCity = id => {
      cities.forEach(c => c.classList.toggle('is-active', c.dataset.city === id));
      pins.forEach(p => p.classList.toggle('is-active', id === 'all' || p.dataset.city === id));
    };
    let pinned = '';
    cities.forEach(c => {
      c.addEventListener('mouseenter', () => setCity(c.dataset.city));
      c.addEventListener('focus', () => setCity(c.dataset.city));
      c.addEventListener('click', () => { pinned = c.dataset.city; setCity(pinned); });
    });
    pins.forEach(p => {
      p.addEventListener('mouseenter', () => setCity(p.dataset.city));
      p.addEventListener('click', () => { pinned = p.dataset.city; setCity(pinned); });
    });
    $('.cities')?.addEventListener('mouseleave', () => setCity(pinned));
    // Footer coverage links on this page, or ?city= when arriving from another page
    $$('[data-area-link]').forEach(a => a.addEventListener('click', e => {
      if (!$('#area')) return;
      e.preventDefault();
      $('#area').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      pinned = a.dataset.areaLink;
      setTimeout(() => setCity(pinned), 600);
    }));
    const fromUrl = new URLSearchParams(location.search).get('city');
    if (fromUrl) { pinned = fromUrl; setTimeout(() => setCity(pinned), 900); }
  }

  /* ---------------- Quote forms (drawer + inline) ---------------- */
  const drawer = $('#quote-drawer');

  function initQuoteForm(form) {
    const wrap = form.closest('[data-form-wrap]');
    const doneTitle = $('[data-done-title]', wrap), doneText = $('[data-done-text]', wrap), donePrimary = $('[data-done-primary]', wrap);
    const submitBtn = $('button[type=submit]', form);

    const fieldError = (input, msg) => {
      const f = input.closest('.field');
      f.classList.toggle('has-error', !!msg);
      $('.field__err', f).textContent = msg || '';
      input.setAttribute('aria-invalid', !!msg);
    };
    const validate = () => {
      let ok = true;
      const { name, phone, email } = form.elements;
      if (!name.value.trim()) { fieldError(name, 'Please tell us your name.'); ok = false; } else fieldError(name);
      if (phone.value.replace(/\D/g, '').length < 10) { fieldError(phone, 'Please enter a valid phone number.'); ok = false; } else fieldError(phone);
      if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) { fieldError(email, 'That email doesn\'t look quite right.'); ok = false; } else fieldError(email);
      return ok;
    };
    ['name', 'phone', 'email'].forEach(n => form.elements[n].addEventListener('blur', () => { if (form.elements[n].closest('.has-error')) validate(); }));

    const reset = () => {
      form.reset(); wrap.classList.remove('is-sent');
      donePrimary.href = 'tel:' + PHONE; $('.btn__label', donePrimary).textContent = 'Call 479-530-4767';
    };
    form.__reset = reset;
    $$('[data-reset]', wrap).forEach(b => b.addEventListener('click', reset));

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!validate()) { const bad = $('.has-error input', form); bad && bad.focus(); return; }
      const data = new FormData(form);
      const services = data.getAll('services').join(', ');
      const first = String(data.get('name')).trim().split(' ')[0];

      if (QUOTE_ENDPOINT) {
        submitBtn.disabled = true; $('.btn__label', submitBtn).textContent = 'Sending…';
        try {
          const res = await fetch(QUOTE_ENDPOINT, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
          if (!res.ok) throw new Error('Request failed');
          doneTitle.textContent = `Thank you, ${first}.`;
          doneText.textContent = 'Your request is in. Kevin will reach out shortly to schedule your free on-site consultation.';
        } catch (err) {
          doneTitle.textContent = 'Let\'s connect directly.';
          doneText.textContent = 'We couldn\'t send your request just now. Please call or text us at 479-530-4767 and we\'ll get you scheduled.';
        } finally {
          submitBtn.disabled = false; $('.btn__label', submitBtn).textContent = 'Send Request';
        }
      } else {
        const body = [
          `New project inquiry from ${data.get('name')}`,
          `Phone: ${data.get('phone')}`,
          data.get('email') ? `Email: ${data.get('email')}` : '',
          data.get('city') ? `City: ${data.get('city')}` : '',
          services ? `Interested in: ${services}` : '',
          data.get('timeline') ? `Timeline: ${data.get('timeline')}` : '',
          data.get('message') ? `Details: ${data.get('message')}` : ''
        ].filter(Boolean).join('\n');
        doneTitle.textContent = `Almost done, ${first}.`;
        doneText.textContent = 'Tap below to send your project details to Kevin by text message — or simply call and we\'ll get you scheduled for a free consultation.';
        donePrimary.href = `sms:${PHONE}?&body=${encodeURIComponent(body)}`;
        $('.btn__label', donePrimary).textContent = 'Send by Text';
      }
      wrap.classList.add('is-sent');
      if (drawer && drawer.contains(form)) { drawer.scrollTop = 0; }
      else wrap.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  }
  $$('[data-quote-form]').forEach(initQuoteForm);

  if (drawer) {
    const drawerForm = $('[data-quote-form]', drawer);
    $$('[data-quote]').forEach(b => b.addEventListener('click', e => {
      e.preventDefault();
      if (root.classList.contains('menu-open')) setMenu(false);
      // Pre-select the service a button was about, e.g. data-service="Hardscaping"
      const svc = b.dataset.service;
      if (svc && drawerForm) $$('input[name="services"]', drawerForm).forEach(cb => { if (cb.value === svc) cb.checked = true; });
      openDialog(drawer);
      setTimeout(() => {
        const wrap = drawerForm && drawerForm.closest('[data-form-wrap]');
        if (wrap && !wrap.classList.contains('is-sent')) $('input[name="name"]', drawerForm).focus({ preventScroll: true });
      }, reduce ? 0 : 500);
    }));
    drawer.addEventListener('click', e => { if (e.target === drawer) closeDialog(drawer); });
    drawer.addEventListener('close', () => {
      const wrap = drawerForm && drawerForm.closest('[data-form-wrap]');
      if (wrap && wrap.classList.contains('is-sent')) drawerForm.__reset();
    });
  }

  /* ---------------- Misc ---------------- */
  // Lazy images load natively as you scroll — no bulk background download that
  // competes with animations. Only the next few hidden slides/panels are warmed, one at a time, when idle.
  window.addEventListener('load', () => {
    const queue = $$('.hero__slide img, .svc-media__img img, .process__img img').filter(i => i.loading === 'lazy' && !i.complete);
    const idle = window.requestIdleCallback || (cb => setTimeout(cb, 800));
    const next = () => { const img = queue.shift(); if (!img) return; img.loading = 'eager';
      if (img.complete) idle(next); else img.addEventListener('load', () => idle(next), { once: true }); };
    idle(next, { timeout: 4000 });
  });
  $$('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
  onScrollUI();
})();
