/*
 * Reticle cursor: a dot that tracks the pointer and four corner brackets
 * that trail behind it, then lock onto links, buttons and images like a
 * selection box. Clicking sends out a few decaying "delay repeats".
 * Mouse only; touch and pen keep the native behaviour.
 */
(() => {
  const el = document.querySelector('.cursor');
  if (!el || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const [tl, tr, bl, br] = el.querySelectorAll('.cursor-corner');
  const dot = el.querySelector('.cursor-dot');
  const label = el.querySelector('.cursor-label');

  const SNAP = 'a[href], button, [data-cursor]';
  const TEXT = 'p, li, dt, dd, h2, h3, h4, figcaption, blockquote';
  const IDLE = 26;     // idle reticle size
  const CORNER = 8;    // bracket size, matches the CSS
  const EASE = 0.26;   // catch-up per frame at 60fps

  const ptr = { x: 0, y: 0 };
  const cur = { x: 0, y: 0, w: IDLE, h: IDLE };   // drawn frame
  const dst = { x: 0, y: 0, w: IDLE, h: IDLE };   // where it's heading
  let target = null;
  let snapEl = null;
  let pad = 5;
  let labelW = 0;
  let visible = false;
  let primed = false;
  let pressed = false;
  let raf = 0;
  let last = 0;

  root.classList.add('has-cursor');
  el.classList.add('is-hidden');

  // Snap to whole device pixels so the 1.5px brackets stay crisp.
  const dpr = window.devicePixelRatio || 1;
  const snapPx = (v) => Math.round(v * dpr) / dpr;
  const place = (node, x, y) => {
    node.style.transform = `translate3d(${snapPx(x)}px, ${snapPx(y)}px, 0)`;
  };

  function hostOf(a) {
    try {
      const url = new URL(a.href);
      return url.origin === location.origin ? '' : url.hostname.replace(/^www\./, '') + ' ↗';
    } catch (e) {
      return '';
    }
  }

  function setTarget(node) {
    if (node === target) return;
    target = node;
    snapEl = node && node.dataset.snap ? node.querySelector(node.dataset.snap) || node : node;
    pad = node && node.dataset.pad ? +node.dataset.pad : 5;

    let text = '';
    if (node) text = node.dataset.cursor != null ? node.dataset.cursor : node.href ? hostOf(node) : '';
    if (text !== label.textContent) {
      label.textContent = text;
      labelW = label.offsetWidth;
    }
    el.classList.toggle('is-snapped', !!node);
    el.classList.toggle('has-label', !!text);
  }

  function show() {
    if (visible) return;
    visible = true;
    el.classList.remove('is-hidden');
  }

  function hide() {
    if (!visible) return;
    visible = false;
    el.classList.add('is-hidden');
    setTarget(null);
  }

  // What's under the pointer decides the reticle's shape.
  function resolve() {
    const hit = document.elementFromPoint(ptr.x, ptr.y);
    if (!hit || hit.tagName === 'IFRAME') {
      hide();
      return;
    }
    show();
    const snap = hit.closest(SNAP);
    setTarget(snap);
    el.classList.toggle('is-text', !snap && !!hit.closest(TEXT));
  }

  // For links that wrap, lock onto the line under the pointer.
  function rectOf(node) {
    const rects = node.getClientRects();
    if (rects.length > 1) {
      for (const r of rects) {
        if (ptr.x >= r.left - 4 && ptr.x <= r.right + 4 && ptr.y >= r.top - 4 && ptr.y <= r.bottom + 4) return r;
      }
    }
    return node.getBoundingClientRect();
  }

  function render() {
    const { x, y, w, h } = cur;
    place(tl, x, y);
    place(tr, x + w - CORNER, y);
    place(bl, x, y + h - CORNER);
    place(br, x + w - CORNER, y + h - CORNER);
    place(dot, ptr.x, ptr.y);

    // Label hangs under the reticle; flips above near the bottom edge.
    const lx = Math.max(8, Math.min(x, innerWidth - labelW - 8));
    const below = y + h + 6;
    place(label, lx, below + 24 > innerHeight - 40 ? y - 24 : below);
  }

  function loop(now) {
    raf = 0;
    const dt = last ? Math.min(64, now - last) : 16.7;
    last = now;

    let r = target && target.isConnected ? rectOf(snapEl) : null;
    if (target && (!r || (!r.width && !r.height))) {
      // Target vanished (lightbox closed, element hidden): look again.
      resolve();
      r = target ? rectOf(snapEl) : null;
    }

    if (r) {
      dst.x = r.left - pad;
      dst.y = r.top - pad;
      dst.w = r.width + pad * 2;
      dst.h = r.height + pad * 2;
    } else {
      const s = pressed ? IDLE * 0.62 : IDLE;
      dst.x = ptr.x - s / 2;
      dst.y = ptr.y - s / 2;
      dst.w = s;
      dst.h = s;
    }

    const k = reduce.matches ? 1 : 1 - Math.pow(1 - EASE, dt / 16.7);
    let moving = false;
    for (const key of ['x', 'y', 'w', 'h']) {
      const d = dst[key] - cur[key];
      if (Math.abs(d) > 0.05) {
        cur[key] += d * k;
        moving = true;
      } else {
        cur[key] = dst[key];
      }
    }
    render();

    // Settled: sleep until the pointer, scrolling or a layout change wakes it.
    if (moving) raf = requestAnimationFrame(loop);
    else last = 0;
  }

  function kick() {
    if (!raf) raf = requestAnimationFrame(loop);
  }

  // Click: three expanding outlines, each quieter than the last.
  function echo() {
    if (reduce.matches || !visible) return;
    const { x, y, w, h } = cur;
    for (let i = 0; i < 3; i++) {
      const ring = document.createElement('span');
      ring.className = 'cursor-echo';
      el.appendChild(ring);
      const grow = 9 + i * 7;
      ring.animate([
        { transform: `translate3d(${x}px, ${y}px, 0)`, width: `${w}px`, height: `${h}px`, opacity: 0.85 * Math.pow(0.5, i) },
        { transform: `translate3d(${x - grow}px, ${y - grow}px, 0)`, width: `${w + grow * 2}px`, height: `${h + grow * 2}px`, opacity: 0 },
      ], {
        duration: 560,
        delay: i * 120,
        easing: 'cubic-bezier(.16, 1, .3, 1)',
      }).onfinish = () => ring.remove();
    }
  }

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') {
      hide();
      return;
    }
    ptr.x = e.clientX;
    ptr.y = e.clientY;
    if (!primed) {
      // First sighting: start at the pointer instead of flying in from 0,0.
      primed = true;
      cur.x = ptr.x - IDLE / 2;
      cur.y = ptr.y - IDLE / 2;
    }
    resolve();
    kick();
  }, { passive: true });

  // Content moves under a still pointer while scrolling.
  window.addEventListener('scroll', () => {
    if (!visible) return;
    resolve();
    kick();
  }, { passive: true });

  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    pressed = true;
    echo();
    kick();
  });

  window.addEventListener('pointerup', () => {
    pressed = false;
    kick();
  });

  // Clicks and keys can swap what's under a still pointer (lightbox, theme).
  const recheck = () => requestAnimationFrame(() => {
    if (!visible) return;
    resolve();
    kick();
  });
  window.addEventListener('click', recheck);
  window.addEventListener('keyup', recheck);
  window.addEventListener('resize', recheck);
  // Embeds and lazy images shift the layout under a resting pointer.
  new ResizeObserver(recheck).observe(document.body);

  // Embeds have their own cursor; step aside when the pointer enters one.
  document.addEventListener('pointerover', (e) => {
    if (e.target.tagName === 'IFRAME') hide();
  });
  document.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget) hide();
  });
  window.addEventListener('blur', hide);
})();
