/*
 * 1-bit photos: images marked data-dither are redrawn with Atkinson
 * dithering (the MacPaint look) in the page's two tones. The colour
 * original stays underneath and wipes in on hover. If anything fails,
 * the photo simply shows as it is.
 */
(() => {
  const imgs = Array.from(document.querySelectorAll('img[data-dither]'));
  if (!imgs.length || !('IntersectionObserver' in window)) return;

  const root = document.documentElement;
  const rendered = new Set();
  let tones = readTones();

  function hex(value) {
    let s = value.trim().replace('#', '');
    if (s.length === 3) s = s.replace(/./g, '$&$&');
    const n = parseInt(s, 16);
    return Number.isNaN(n) ? null : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // Light pixels take the lighter of ink/background in either theme.
  function readTones() {
    const cs = getComputedStyle(root);
    const a = hex(cs.getPropertyValue('--ink')) || [242, 242, 242];
    const b = hex(cs.getPropertyValue('--bg')) || [31, 31, 31];
    return a[0] + a[1] + a[2] > b[0] + b[1] + b[2] ? { light: a, dark: b } : { light: b, dark: a };
  }

  function render(img) {
    const wrap = img.parentElement;
    const w = Math.round(wrap.clientWidth);
    const h = Math.round(wrap.clientHeight);
    if (!w || !h || !img.naturalWidth) return;

    let canvas = wrap.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      wrap.appendChild(canvas);
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Same crop as object-fit: cover.
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(w / iw, h / ih);
    const sw = w / scale;
    const sh = h / scale;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, w, h);

    let frame;
    try {
      frame = ctx.getImageData(0, 0, w, h);
    } catch (e) {
      canvas.remove(); // tainted canvas (e.g. opened from file://): keep the photo
      return;
    }

    const px = frame.data;
    const n = w * h;
    const lum = new Float32Array(n);
    const hist = new Uint32Array(256);
    for (let i = 0, o = 0; i < n; i++, o += 4) {
      const v = 0.299 * px[o] + 0.587 * px[o + 1] + 0.114 * px[o + 2];
      lum[i] = v;
      hist[v | 0]++;
    }

    // Auto-levels: stretch the 1st to 99th percentile over the full range.
    const clip = n * 0.01;
    let lo = 0;
    let hi = 255;
    for (let v = 0, acc = 0; v < 256; v++) {
      acc += hist[v];
      if (acc > clip) { lo = v; break; }
    }
    for (let v = 255, acc = 0; v >= 0; v--) {
      acc += hist[v];
      if (acc > clip) { hi = v; break; }
    }
    const range = Math.max(1, hi - lo);
    for (let i = 0; i < n; i++) lum[i] = ((lum[i] - lo) / range) * 255;

    // Atkinson: pass 6/8 of the error on to six neighbours.
    const { light, dark } = tones;
    for (let y = 0, i = 0; y < h; y++) {
      for (let x = 0; x < w; x++, i++) {
        const on = lum[i] >= 128;
        const err = (lum[i] - (on ? 255 : 0)) / 8;
        if (x + 1 < w) lum[i + 1] += err;
        if (x + 2 < w) lum[i + 2] += err;
        if (y + 1 < h) {
          if (x > 0) lum[i + w - 1] += err;
          lum[i + w] += err;
          if (x + 1 < w) lum[i + w + 1] += err;
        }
        if (y + 2 < h) lum[i + 2 * w] += err;

        const c = on ? light : dark;
        const o = i * 4;
        px[o] = c[0];
        px[o + 1] = c[1];
        px[o + 2] = c[2];
        px[o + 3] = 255;
      }
    }

    ctx.putImageData(frame, 0, 0);
    rendered.add(img);
    img.dataset.ditherSize = `${w}x${h}`;
  }

  function whenLoaded(img, fn) {
    if (img.complete && img.naturalWidth) fn();
    else img.addEventListener('load', fn, { once: true });
  }

  // Dither each photo shortly before it scrolls into view.
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      io.unobserve(entry.target);
      const img = entry.target.querySelector('img[data-dither]');
      whenLoaded(img, () => render(img));
    }
  }, { rootMargin: '600px 0px' });

  // Redraw when a box changes size (layout shifts, the Instagram embed growing).
  const pending = new Set();
  let timer = 0;
  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const img = entry.target.querySelector('img[data-dither]');
      if (!rendered.has(img)) continue;
      const size = `${Math.round(entry.target.clientWidth)}x${Math.round(entry.target.clientHeight)}`;
      if (size !== img.dataset.ditherSize) pending.add(img);
    }
    if (!pending.size) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      pending.forEach(render);
      pending.clear();
    }, 120);
  });

  imgs.forEach((img) => {
    io.observe(img.parentElement);
    ro.observe(img.parentElement);
  });

  document.addEventListener('themechange', () => {
    tones = readTones();
    rendered.forEach(render);
  });
})();
