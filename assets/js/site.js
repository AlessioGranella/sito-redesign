/* alessiogranella.com — redesign: interazioni e motion */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const desktop = () => innerWidth > 860;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = t => 1 - Math.pow(1 - t, 3);

  /* ---------- split helpers ---------- */
  // lettere (mantiene gli span figli, es. il punto colorato)
  function splitChars(el) {
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          [...n.textContent].forEach(c => {
            if (c === ' ') { frag.appendChild(document.createTextNode(' ')); return; }
            const clip = document.createElement('span'); clip.className = 'clip';
            const ch = document.createElement('span'); ch.className = 'ch'; ch.textContent = c;
            clip.appendChild(ch); frag.appendChild(clip);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          if (n.classList.contains('dot')) {
            const t = n.textContent; n.textContent = '';
            const clip = document.createElement('span'); clip.className = 'clip';
            const ch = document.createElement('span'); ch.className = 'ch'; ch.textContent = t;
            clip.appendChild(ch); n.appendChild(clip);
          } else walk(n);
        }
      });
    };
    walk(el);
    return $$('.ch', el);
  }
  // parole, per la salita "a maschera"
  function splitWords(el) {
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(w => {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
            const o = document.createElement('span'); o.className = 'w';
            const i = document.createElement('span'); i.textContent = w;
            o.appendChild(i); frag.appendChild(o);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains('w')) {
          // un elemento attaccato alla parola precedente (es. il punto colorato) resta sulla stessa riga
          const prev = n.previousSibling;
          if (prev && prev.nodeType === 1 && prev.classList.contains('w')) { prev.firstChild.appendChild(n); return; }
          const o = document.createElement('span'); o.className = 'w';
          const i = document.createElement('span');
          n.replaceWith(o); i.appendChild(n); o.appendChild(i);
        }
      });
    };
    walk(el);
    $$('.w>span', el).forEach((s, i) => s.style.transitionDelay = (i * 0.06) + 's');
  }
  // parole che si accendono una per una
  function splitLight(el) {
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(w => {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span'); s.className = 'wd'; s.textContent = w;
            if (node.classList && node.classList.contains('hl')) s.classList.add('hl');
            frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    return $$('.wd', el);
  }

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const t = $(id); if (!t) return;
      e.preventDefault(); lenis.scrollTo(t, { offset: 0, duration: 1.6 });
    }));
  }
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------- nav: pillola + tema chiaro/scuro ---------- */
  const nav = $('#nav');
  const logo = nav && $('.nav-logo img', nav);
  const navSections = $$('[data-nav]');
  let lastY = 0;
  function updateNav() {
    const y = scrollY;
    nav.classList.toggle('is-pill', y > 60);
    // tema in base alla sezione sotto la nav
    let theme = 'dark';
    for (const s of navSections) {
      const r = s.getBoundingClientRect();
      if (r.top <= 40 && r.bottom > 40) theme = s.dataset.nav;
    }
    nav.classList.toggle('is-light', theme === 'light');
    if (logo) {
      const want = (theme === 'light' && y <= 60) ? logo.dataset.logoLight : logo.dataset.logoDark;
      if (!logo.src.endsWith(want)) logo.src = want;
    }
    lastY = y;
  }
  if (nav) { addEventListener('scroll', updateNav, { passive: true }); updateNav(); }

  /* ---------- reveal ---------- */
  $$('.split').forEach(splitWords);
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  $$('.rv, .split, .tile, .giant').forEach((el, i) => {
    if (el.classList.contains('rv') && el.parentElement) {
      const sib = $$(':scope > .rv', el.parentElement);
      const k = sib.indexOf(el);
      if (k > 0) el.style.transitionDelay = (k * 0.09) + 's';
    }
    io.observe(el);
  });

  // lettere del wordmark gigante
  $$('.giant .chars').forEach(el => splitChars(el).forEach((c, i) => c.style.transitionDelay = (i * 0.035) + 's'));

  /* ---------- HERO ---------- */
  const hero = $('#hero');
  if (hero) {
    const chars = [];
    $$('.hero-h .chars', hero).forEach(el => chars.push(...splitChars(el)));
    chars.forEach((c, i) => c.style.transitionDelay = (0.15 + i * 0.03) + 's');

    const media = $('#heroMedia'), chip = $('#heroChip'), title = $('#heroTitle');
    const stmt = $('#heroStatement p');
    const words = splitLight(stmt);
    const video = $('video', media);
    let intro = 0, prog = 0, chipBox = null;

    const measure = () => {
      const r = chip.getBoundingClientRect();
      const stick = hero.firstElementChild.getBoundingClientRect();
      chipBox = { t: r.top - stick.top, l: r.left - stick.left, b: stick.bottom - r.bottom, r: stick.right - r.right, rad: r.height * 0.17, w: stick.width, h: stick.height };
    };
    const render = () => {
      if (!chipBox) measure();
      const c = chipBox;
      // 0 → chip collassato al centro, 1 → dimensione chip
      const cx = (c.l + (c.w - c.r)) / 2, cy = (c.t + (c.h - c.b)) / 2;
      const i0 = ease(intro);
      let t = lerp(cy, c.t, i0), l = lerp(cx, c.l, i0), b = lerp(c.h - cy, c.b, i0), r = lerp(c.w - cx, c.r, i0), rad = c.rad;
      // apertura col scroll
      const p = ease(clamp(prog / 0.36));
      t = lerp(t, 0, p); l = lerp(l, 0, p); b = lerp(b, 0, p); r = lerp(r, 0, p); rad = lerp(rad, 0, p);
      media.style.clipPath = `inset(${t}px ${r}px ${b}px ${l}px round ${rad}px)`;
      title.style.opacity = 1 - clamp((prog - 0.04) / 0.22);
      title.style.transform = `scale(${1 - clamp(prog / 0.36) * 0.08})`;
      media.style.setProperty('--veil', (0.62 * clamp((prog - 0.3) / 0.12)).toFixed(3));
      // parole che si accendono
      const sp = clamp((prog - 0.4) / 0.55);
      const n = Math.round(sp * words.length);
      words.forEach((w, k) => w.classList.toggle('on', k < n));
      stmt.parentElement.style.opacity = clamp((prog - 0.34) / 0.06);
    };

    stmt.parentElement.style.opacity = 0;
    const start = () => {
      document.documentElement.classList.add('loaded');
      measure();
      if (reduce) { intro = 1; render(); return; }
      const t0 = performance.now();
      const tick = now => {
        intro = clamp((now - t0 - 450) / 1300);
        render();
        if (intro < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(start, 60));

    const onScroll = () => {
      const range = hero.offsetHeight - 2 * innerHeight; // il foglio successivo sale nell'ultimo schermo
      prog = clamp(-hero.getBoundingClientRect().top / Math.max(1, range));
      render();
    };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', () => { measure(); onScroll(); });

    // il video gira solo quando è visibile
    new IntersectionObserver(([e]) => { if (!video) return; e.isIntersecting ? video.play().catch(() => {}) : video.pause(); }).observe(hero);
  }

  /* ---------- WHAT I DO: accordion + anteprima ---------- */
  const acc = $('#acc');
  if (acc) {
    const items = $$('.acc-item', acc);
    const imgs = $$('#previewFrame > img');
    const dots = $$('#previewDots button');
    const label = $('#previewLabel'), plink = $('#previewLink');
    const open = idx => {
      items.forEach((it, k) => {
        const on = k === idx;
        it.classList.toggle('open', on);
        $('.acc-btn', it).setAttribute('aria-expanded', on);
      });
      imgs.forEach((im, k) => im.classList.toggle('on', k === idx));
      dots.forEach((d, k) => d.classList.toggle('on', k === idx));
      const it = items[idx];
      label.textContent = $('.acc-title em', it).textContent;
      plink.href = $('.acc-body a', it).href;
      setTimeout(() => hasGsap && ScrollTrigger.refresh(), 750);
    };
    items.forEach((it, k) => {
      $('.acc-btn', it).addEventListener('click', () => open(k));
      it.addEventListener('mouseenter', () => desktop() && !it.classList.contains('open') && open(k));
    });
    dots.forEach((d, k) => d.addEventListener('click', () => open(k)));
  }

  /* ---------- LATEST WORK: orizzontale ---------- */
  const pin = $('#workPin'), row = $('#workRow'), bar = $('#workBar');
  if (pin && row && hasGsap && !reduce) {
    ScrollTrigger.matchMedia({
      '(min-width: 861px)': () => {
        const dist = () => row.scrollWidth - innerWidth + Math.max(32, (innerWidth - 1280) / 2);
        const tw = gsap.to(row, {
          x: () => -dist(), ease: 'none',
          scrollTrigger: {
            trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8,
            invalidateOnRefresh: true, anticipatePin: 1,
            onUpdate: s => bar && (bar.style.transform = `scaleX(${s.progress})`)
          }
        });
        // le card entrano con una leggera inclinazione
        $$('.card', row).forEach(card => {
          gsap.fromTo(card, { y: 60, rotate: 2.5 }, {
            y: 0, rotate: 0, ease: 'none',
            scrollTrigger: { trigger: card, containerAnimation: tw, start: 'left right', end: 'left 60%', scrub: true }
          });
        });
        return () => {};
      }
    });
  }

  /* ---------- parole accese allo scroll (titolo marketing) ---------- */
  $$('.words').forEach(el => {
    const ws = splitLight(el);
    const upd = () => {
      const r = el.getBoundingClientRect();
      const p = clamp((innerHeight * 0.85 - r.top) / (innerHeight * 0.5));
      const n = Math.round(p * ws.length);
      ws.forEach((w, k) => w.classList.toggle('on', k < n));
    };
    addEventListener('scroll', upd, { passive: true }); upd();
  });

  // logo che ruota con lo scroll
  const mkLogo = $('#mkLogo');
  if (mkLogo && !reduce) addEventListener('scroll', () => { mkLogo.style.transform = `rotate(${scrollY * 0.06}deg)`; }, { passive: true });

  /* ---------- TESTIMONIALS ---------- */
  const stage = $('#testiStage');
  if (stage) {
    const qs = $$('.quote', stage), th = $$('#testiThumbs button'), num = $('#testiNum');
    qs.forEach(q => splitLight($('blockquote', q)).forEach((w, k) => w.style.transitionDelay = (k * 0.012) + 's'));
    let cur = 0, timer;
    const go = i => {
      cur = (i + qs.length) % qs.length;
      qs.forEach((q, k) => q.classList.toggle('on', k === cur));
      th.forEach((b, k) => b.classList.toggle('on', k === cur));
      num.textContent = String(cur + 1).padStart(2, '0');
      clearInterval(timer); timer = setInterval(() => go(cur + 1), 11000);
    };
    th.forEach((b, k) => b.addEventListener('click', () => go(k)));
    $('#testiPrev').addEventListener('click', () => go(cur - 1));
    $('#testiNext').addEventListener('click', () => go(cur + 1));
    go(0);
  }

  /* ---------- CASE STUDY ---------- */
  const card = $('.cs-card-in');
  if (card && !reduce) {
    const img = $('img', card);
    addEventListener('scroll', () => {
      const p = clamp(scrollY / innerHeight);
      card.style.transform = `rotate(${lerp(6, -4, p)}deg) translateY(${p * 60}px)`;
      img.style.transform = `scale(${1.15 - p * 0.1})`;
    }, { passive: true });
    // inclinazione col mouse
    const wrapC = $('.cs-card');
    wrapC.addEventListener('mousemove', e => {
      const r = wrapC.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `rotate(${lerp(6, -4, clamp(scrollY / innerHeight))}deg) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
    });
  }
  $$('[data-parallax]').forEach(img => {
    if (reduce) return;
    const upd = () => {
      const r = img.parentElement.getBoundingClientRect();
      const p = clamp((innerHeight - r.top) / (innerHeight + r.height));
      img.style.transform = `translateY(${lerp(-15, 0, p)}%)`;
    };
    addEventListener('scroll', upd, { passive: true }); upd();
  });

  // torna su
  $$('.to-top').forEach(a => a.addEventListener('click', e => { e.preventDefault(); lenis ? lenis.scrollTo(0, { duration: 1.8 }) : scrollTo({ top: 0, behavior: 'smooth' }); }));

  addEventListener('load', () => hasGsap && ScrollTrigger.refresh());
})();
