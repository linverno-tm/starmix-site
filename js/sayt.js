// STARMIX — kichik progressiv qo'shimchalar (sahifa JS'siz ham ishlaydi)
const BASE = document.body.dataset.base;
const LANG = document.body.dataset.lang;
const T = {
  uz: { found: (n) => `${n} ta topildi`, all: 'Hammasi' },
  ru: { found: (n) => `Найдено: ${n}`, all: 'Все' },
}[LANG];

// 1) Hero lupasi: tanlangan uskunani lupaga qo'yadi, g'ildirak buriladi
const lens = document.querySelector('[data-lens]');
if (lens) {
  const buttons = [...document.querySelectorAll('.picker__b')];
  const img = lens.querySelector('.lens__img');
  const links = lens.querySelectorAll('a');
  const cap = lens.querySelector('.lens__cap');
  let turn = 0;
  let current = 0;
  for (const b of buttons) {
    b.addEventListener('click', () => {
      const i = Number(b.dataset.i);
      if (i === current) return;
      turn += (i > current ? 1 : -1) * 24; // mexanizm «chiqillashi»: kichik qadam
      current = i;
      lens.style.setProperty('--turn', `${turn}deg`);
      buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      lens.classList.add('is-swapping');
      const next = new Image();
      next.src = b.dataset.src;
      const swap = () => {
        img.removeAttribute('srcset');
        img.src = b.dataset.src;
        img.alt = b.dataset.name;
        links.forEach((a) => { a.href = b.dataset.href; });
        cap.querySelector('a').textContent = b.dataset.name;
        cap.querySelector('span').textContent = b.dataset.cat;
        requestAnimationFrame(() => lens.classList.remove('is-swapping'));
      };
      next.decode().then(swap, swap);
    });
  }
}

// 2) Mahsulot galereyasi: kichik rasmlar va kattalashtirish oynasi
const gal = document.querySelector('[data-gallery]');
if (gal) {
  const main = gal.querySelector('.gal__main img');
  const dlg = gal.querySelector('[data-zoomdlg]');
  const big = dlg.querySelector('img');
  gal.querySelectorAll('.gal__thumbs button').forEach((b) => b.addEventListener('click', () => {
    gal.querySelectorAll('.gal__thumbs button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    main.removeAttribute('srcset');
    main.src = b.dataset.src;
    big.src = b.dataset.src;
  }));
  gal.querySelector('[data-zoom]').addEventListener('click', () => dlg.showModal());
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    const outside = (e) => { const r = dlg.getBoundingClientRect(); return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom; };
    let downOut = false;
    dlg.addEventListener('pointerdown', (e) => { downOut = outside(e); });
    dlg.addEventListener('pointerup', (e) => { if (downOut && outside(e)) dlg.close(); });
  }
}

// 3) Toifa ichida kichik bo'lim bo'yicha saralash
const subChips = document.querySelector('[data-subchips]');
if (subChips) {
  const cards = document.querySelectorAll('[data-subgrid] .card');
  subChips.addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    subChips.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const s = b.dataset.sub;
    cards.forEach((c) => { c.hidden = Boolean(s) && c.dataset.sub !== s; });
  });
}

// 4) Katalog qidiruvi (indeks JSON, URL'da holat saqlanadi — Orqaga tugmasi ishlaydi)
const finder = document.querySelector('[data-finder]');
if (finder) {
  const input = finder.querySelector('input[type=search]');
  const chips = finder.querySelectorAll('.chip');
  const out = finder.querySelector('[data-results]');
  const status = finder.querySelector('[data-status]');
  const more = finder.querySelector('[data-more]');
  const emptyTpl = finder.querySelector('[data-tpl-empty]');
  const clear = finder.querySelector('[data-clear]');
  const brandNames = JSON.parse(finder.dataset.brands || '{}');
  const PAGE = 24;
  let index = [];
  let shown = PAGE;
  const params = new URLSearchParams(location.search);
  let state = { q: params.get('q') || '', cat: params.get('cat') || '', brand: params.get('brand') || '' };
  input.value = state.q;
  // filtr bilan ochilganda statik ro'yxat bir lahza ham ko'rinmasin
  if (state.q || state.cat || state.brand) out.innerHTML = '';

  const norm = (s) => s.toLowerCase().replace(/[ʻʼ'‘’`]/g, '').replace(/ё/g, 'е');
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cardHtml = (p) => `<li class="card"><a href="${location.pathname.replace(/katalog\/.*$/, '')}mahsulot/${p.s}/"><span class="card__img"><img src="${BASE}${p.m}" width="${p.w}" height="${p.h}" alt="" loading="lazy" decoding="async"></span><span class="card__name">${esc(p.n)}</span><span class="card__cat">${esc(p.cn)}</span></a></li>`;

  function filtered() {
    const words = norm(state.q).split(/\s+/).filter(Boolean);
    return index.filter((p) => (!state.cat || p.c === state.cat) && (!state.brand || p.b.includes(state.brand))
      && words.every((w) => p._h.includes(w)));
  }
  function render(push) {
    const list = filtered();
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.cat === state.cat)));
    out.innerHTML = list.length ? list.slice(0, shown).map(cardHtml).join('') : '';
    if (!list.length) out.append(emptyTpl.content.cloneNode(true));
    const active = Boolean(state.q || state.cat || state.brand);
    status.textContent = active ? `${state.brand ? `${brandNames[state.brand] || state.brand}: ` : ''}${T.found(list.length)}` : '';
    clear.hidden = !active;
    more.hidden = list.length <= shown;
    if (push !== undefined) {
      const p = new URLSearchParams();
      for (const k of ['q', 'cat', 'brand']) if (state[k]) p.set(k, state[k]);
      const u = `${location.pathname}${p.size ? `?${p}` : ''}`;
      history[push ? 'pushState' : 'replaceState'](state, '', u);
    }
  }
  fetch(finder.dataset.index).then((r) => r.json()).then((data) => {
    index = data.map((p) => ({ ...p, _h: norm(`${p.a} ${p.cn} ${p.b.join(' ')}`) }));
    render();
  });
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { state = { ...state, q: input.value.trim() }; shown = PAGE; render(false); }, 120);
  });
  finder.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); input.blur(); });
  finder.querySelector('.chips').addEventListener('click', (e) => {
    const c = e.target.closest('.chip');
    if (!c) return;
    state = { ...state, cat: c.dataset.cat, brand: '' };
    shown = PAGE;
    render(true);
  });
  clear.addEventListener('click', () => { state = { q: '', cat: '', brand: '' }; input.value = ''; shown = PAGE; render(true); });
  more.addEventListener('click', () => { shown += PAGE; render(); });
  addEventListener('popstate', (e) => {
    state = e.state || { q: '', cat: '', brand: '' };
    input.value = state.q;
  // filtr bilan ochilganda statik ro'yxat bir lahza ham ko'rinmasin
  if (state.q || state.cat || state.brand) out.innerHTML = '';
    render();
  });
}
