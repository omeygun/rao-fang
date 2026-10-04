const countUp = (el) => {
  const to = parseFloat(el.dataset.to), dec = +(el.dataset.dec || 0), suf = el.dataset.suf || '', t0 = performance.now() + 700;
  const tick = (t) => {
    const k = Math.min(1, Math.max(0, (t - t0) / 1300)), e = 1 - Math.pow(1 - k, 3);
    el.textContent = (to * e).toFixed(dec) + suf;
    if (k < 1) requestAnimationFrame(tick);
  };
  el.textContent = (0).toFixed(dec) + suf; requestAnimationFrame(tick);
};
window.show = (id) => {
  const swap = () => document.querySelectorAll('.slide').forEach((s) => s.classList.toggle('on', s.id === id));
  document.startViewTransition ? document.startViewTransition(swap) : swap();
  document.querySelectorAll('#' + id + ' [data-to]').forEach(countUp);
};
window.step = (list, i) => { document.querySelectorAll('#' + list + ' li').forEach((l, k) => l.classList.toggle('on', k <= i)); };
