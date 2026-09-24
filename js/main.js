/*
 * Page behaviour: hero text decode, timecode, status bar and section spy,
 * theme toggle, keyboard shortcuts, lightbox, small touches.
 */
(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const pad = (n, len = 2) => String(n).padStart(len, '0');

  const frame = $('.frame');
  const statusbar = $('.statusbar');
  const sections = $$('main .section');
  const titles = sections.map((s) => $('.sec-title', s).textContent.trim());


  /* Old numeric anchors (#0 to #5) still land on the right section. ------ */

  const legacy = location.hash.match(/^#([0-5])$/);
  if (legacy && sections[+legacy[1]]) {
    const target = sections[+legacy[1]];
    history.replaceState(null, '', '#' + target.id);
    target.scrollIntoView();
  }


  /* Text decode: letters resolve out of random glyphs. -------------------- */

  const GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789@#%&*+=<>/';
  const decoding = new WeakMap(); // text node -> { text, raf }

  function scramble(el, { duration = 600, delay = 0, lock = false } = {}) {
    // Only touch the text node, so icons inside the element survive.
    const node = Array.from(el.childNodes).find((n) => n.nodeType === 3 && n.nodeValue.trim());
    if (!node) return;
    if (!decoding.has(node)) decoding.set(node, { text: node.nodeValue, raf: 0 });
    const state = decoding.get(node);
    const text = state.text;
    if (reduce.matches) {
      node.nodeValue = text;
      return;
    }

    cancelAnimationFrame(state.raf);
    const chars = Array.from(text);
    // Left to right, with a little jitter so it doesn't look mechanical.
    const at = chars.map((_, i) => (i / chars.length) * 0.6 + Math.random() * 0.4);
    const start = performance.now() + delay;
    let swapped = 0;
    let shown = text;
    if (lock) el.style.width = el.getBoundingClientRect().width + 'px';

    const step = (now) => {
      const p = (now - start) / duration;
      if (p >= 1) {
        node.nodeValue = text;
        if (lock) el.style.width = '';
        return;
      }
      if (p >= 0 && now - swapped > 45) {
        swapped = now;
        shown = chars.map((c, i) => (c === ' ' || p >= at[i] ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
      }
      if (p >= 0) node.nodeValue = shown;
      state.raf = requestAnimationFrame(step);
    };
    state.raf = requestAnimationFrame(step);
  }

  // Hero rows decode as they rise in (timing matches the CSS stagger).
  $$('.hero-rows .row-label').forEach((el, i) => scramble(el, { duration: 700, delay: 80 + i * 70, lock: true }));

  $$('.row-link').forEach((link) => {
    const label = $('.row-label', link);
    const run = () => scramble(label, { duration: 380, lock: true });
    link.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') run();
    });
    link.addEventListener('focus', () => {
      if (link.matches(':focus-visible')) run();
    });
  });


  /* >whoami types itself the first time it's seen. ------------------------ */

  const cmd = $('.prompt-cmd[data-type]');
  if (cmd && !reduce.matches && 'IntersectionObserver' in window) {
    const text = cmd.textContent;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      let i = 0;
      cmd.textContent = '';
      const type = () => {
        cmd.textContent = text.slice(0, ++i);
        if (i < text.length) setTimeout(type, 60 + Math.random() * 90);
      };
      setTimeout(type, 300);
    }, { threshold: 1 });
    io.observe(cmd.parentElement);
  }


  /* Timecode: time since 13 April 2000, hh:mm:ss:ff at 25 fps. ------------ */

  // Midnight on 13 April 2000, Italian time (CEST, UTC+2).
  const START = Date.UTC(2000, 3, 12, 22);
  const tc = $('.titlebar-tc span');
  const FPS = 25;
  if (tc) {
    const tick = () => {
      const ms = Date.now() - START;
      const f = Math.floor((ms * FPS) / 1000);
      const s = Math.floor(f / FPS);
      tc.textContent = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60, f % FPS].map((n) => pad(n)).join(':');
      // Every frame, or once a second when motion is reduced.
      const step = reduce.matches ? 1000 : 1000 / FPS;
      setTimeout(tick, step - (ms % step) + 1);
    };
    tick();
  }


  /* Status bar: section, scroll meter, pointer position. ------------------ */

  const sb = {
    led: $('.sb-led'),
    idx: $('.sb-idx'),
    name: $('.sb-name'),
    fill: $('.meter-fill'),
    pct: $('.sb-pct'),
    x: $('.sb-x'),
    y: $('.sb-y'),
  };
  const METER_SEGMENTS = 16;
  const SEGMENT_PX = 6;
  let current = null;

  function setSection(i) {
    if (i === current) return;
    const first = current === null;
    current = i;
    sb.idx.textContent = pad(i + 1);
    sb.name.textContent = i < 0 ? 'index' : titles[i];
    // Keep the URL in sync with scroll, so a refresh lands where you were.
    history.replaceState(null, '', i < 0 ? location.pathname + location.search : '#' + sections[i].id);
    if (first) return;
    scramble(sb.name, { duration: 320 });
    sb.led.classList.remove('is-blink');
    void sb.led.offsetWidth; // restart the blink
    sb.led.classList.add('is-blink');
  }

  let scrollQueued = false;
  function onScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      const max = root.scrollHeight - innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
      sb.fill.style.setProperty('--fill', Math.round(p * METER_SEGMENTS) * SEGMENT_PX + 'px');
      sb.pct.textContent = pad(Math.round(p * 100), 3) + '%';

      // Whichever section crosses the reading line (the last one is short,
      // so it wins once the page bottoms out).
      const line = innerHeight * 0.4;
      let idx = sections.findIndex((s) => {
        const r = s.getBoundingClientRect();
        return r.top <= line && r.bottom > line;
      });
      if (p > 0.995) idx = sections.length - 1;
      setSection(idx);

      root.classList.toggle('is-scrolled', scrollY > 40);
      if (pointerSeen) updatePointer();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  // Coordinates are measured from the frame's top-left, like an artboard.
  const glow = $('.backdrop-glow');
  const coord = (v) => (v < 0 ? '-' + pad(-v, 3) : pad(v, 4));
  let pointerX = 0;
  let pointerY = 0;
  let pointerSeen = false;
  let pointerQueued = false;

  function updatePointer() {
    pointerQueued = false;
    const r = frame.getBoundingClientRect();
    sb.x.textContent = coord(Math.round(pointerX - r.left));
    sb.y.textContent = coord(Math.round(pointerY - r.top));
    if (glow) {
      const gx = Math.round(pointerX - 180);
      const gy = Math.round(pointerY - 180);
      glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
      glow.style.backgroundPosition = `${-gx}px ${-gy}px`; // keep dots on the grid
      glow.classList.add('is-on');
    }
  }

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    pointerX = e.clientX;
    pointerY = e.clientY;
    pointerSeen = true;
    if (!pointerQueued) {
      pointerQueued = true;
      requestAnimationFrame(updatePointer);
    }
  }, { passive: true });

  document.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget && glow) glow.classList.remove('is-on');
  });

  onScroll();


  /* Theme: invert the page; the new one paints in top-down. --------------- */

  const themeBtn = $('[data-action="theme"]');
  const metaTheme = $('meta[name="theme-color"]');

  function syncTheme() {
    const light = root.dataset.theme === 'light';
    themeBtn.setAttribute('aria-pressed', String(light));
    const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
    if (metaTheme && bg) metaTheme.content = bg;
  }

  function toggleTheme() {
    const light = root.dataset.theme !== 'light';
    try {
      localStorage.setItem('theme', light ? 'light' : 'dark');
    } catch (e) {}
    const apply = () => {
      if (light) root.dataset.theme = 'light';
      else delete root.dataset.theme;
      syncTheme();
      document.dispatchEvent(new CustomEvent('themechange'));
    };
    if (document.startViewTransition && !reduce.matches) document.startViewTransition(apply);
    else apply();
  }

  themeBtn.addEventListener('click', toggleTheme);
  syncTheme();


  /* Lightbox. ------------------------------------------------------------- */

  const lightbox = $('.lightbox');
  const lbImg = $('.lightbox-img', lightbox);
  const lbAlt = $('.lightbox-alt', lightbox);
  const lbSize = $('.lightbox-size', lightbox);
  const lbClose = $('.lightbox-close', lightbox);
  let opener = null;

  function openLightbox(img, from) {
    opener = from;
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lbAlt.textContent = img.alt;
    lbSize.textContent = img.naturalWidth ? `${img.naturalWidth} × ${img.naturalHeight}` : '';
    lightbox.hidden = false;
    frame.inert = true;
    statusbar.inert = true;
    requestAnimationFrame(() => requestAnimationFrame(() => lightbox.classList.add('is-open')));
    lbClose.focus({ preventScroll: true });
  }

  function closeLightbox() {
    if (lightbox.hidden) return;
    lightbox.classList.remove('is-open');
    frame.inert = false;
    statusbar.inert = false;
    setTimeout(() => {
      lightbox.hidden = true;
      lbImg.removeAttribute('src');
    }, reduce.matches ? 0 : 250);
    if (opener) opener.focus({ preventScroll: true });
  }

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-zoom]');
    const img = trigger && $('img', trigger);
    if (img) openLightbox(img, trigger);
  });
  lightbox.addEventListener('click', closeLightbox);


  /* Keyboard: 1-6 jump, 0 top, i invert. ---------------------------------- */

  function go(section) {
    const behavior = reduce.matches ? 'auto' : 'smooth';
    if (section) {
      section.scrollIntoView({ behavior });
      history.replaceState(null, '', '#' + section.id);
    } else {
      window.scrollTo({ top: 0, behavior });
      history.replaceState(null, '', location.pathname + location.search);
    }
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLightbox();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || !lightbox.hidden) return;
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;

    const key = e.key.toLowerCase();
    if (/^[1-6]$/.test(key)) go(sections[+key - 1]);
    else if (key === '0') go(null);
    else if (key === 'i') toggleTheme();
  });


  /* Colour on attention. -------------------------------------------------- */

  // Once someone clicks into an embed, leave it in colour.
  window.addEventListener('blur', () => {
    setTimeout(() => {
      const active = document.activeElement;
      if (active && active.tagName === 'IFRAME') {
        const box = active.closest('.attn');
        if (box) box.classList.add('is-engaged');
      }
    });
  });

  // No hover on touch screens: reveal colour while media sits mid-screen.
  if (!fine.matches && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('is-revealed', entry.isIntersecting));
    }, { rootMargin: '-35% 0px -35% 0px' });
    $$('.dither, .attn').forEach((el) => io.observe(el));
  }


  /* Small print. ---------------------------------------------------------- */

  // Live artboard size above the frame.
  const dims = $('.frame-dims');
  if (dims && 'ResizeObserver' in window) {
    new ResizeObserver(() => {
      dims.textContent = `${frame.offsetWidth} × ${frame.offsetHeight}`;
    }).observe(frame);
  }

  // Contents count under the hero index, shown where there's no key hint.
  const count = $('.hero-count');
  if (count) count.textContent = `${pad(sections.length)} sections / ${pad($$('main .entry').length)} entries`;

  const modified = $('#modified');
  const stamp = new Date(document.lastModified);
  if (modified && !Number.isNaN(stamp.getTime())) {
    modified.textContent = `${stamp.getFullYear()}.${pad(stamp.getMonth() + 1)}.${pad(stamp.getDate())}`;
    modified.setAttribute('datetime', stamp.toISOString().slice(0, 10));
  }

  console.log(
    '%c andrea campa %c part portfolio, part design project. have a look around.',
    'background:#f2f2f2;color:#1f1f1f;font:bold 12px Tahoma,sans-serif;padding:2px 4px',
    'color:#8e8e8e;font:12px Tahoma,sans-serif',
  );
})();
