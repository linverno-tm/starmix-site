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

// 5) Tajriba yili joriy yil bo'yicha o'zi yangilanadi (sayt qayta yig'ilmasa ham)
for (const el of document.querySelectorAll('[data-since]')) {
  const n = new Date().getFullYear() - Number(el.dataset.since);
  const ru = n % 10 === 1 && n % 100 !== 11 ? 'год' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'года' : 'лет';
  el.textContent = `${n} ${el.dataset.unit === 'yil' ? 'yil' : ru}`;
}

// 6) Qidiruv takliflari: birinchi harfdan, ro'yxatda 3 qator ko'rinadi, qolgani aylantiriladi
const SUG_T = {
  uz: { cat: 'Toifa', all: (n) => `Hammasini ko‘rish — ${n} ta`, none: 'Hech narsa topilmadi. Boshqa so‘z bilan urinib ko‘ring.' },
  ru: { cat: 'Раздел', all: (n) => `Показать все — ${n}`, none: 'Ничего не найдено. Попробуйте другое слово.' },
}[LANG];
let sugIndex;
const loadIndex = () => (sugIndex ||= fetch(`${BASE}data/katalog-${LANG}.json`).then((r) => r.json()).then((data) => {
  const fold = (s) => s.toLowerCase().replace(/[ʻʼ'‘’`]/g, '').replace(/ё/g, 'е');
  const cats = new Map();
  for (const p of data) if (!cats.has(p.c)) cats.set(p.c, { c: p.c, n: p.cn, f: fold(p.cn), count: 0 });
  for (const p of data) cats.get(p.c).count += 1;
  return { fold, cats: [...cats.values()], items: data.map((p) => ({ ...p, f: fold(p.n), h: fold(`${p.a} ${p.cn} ${p.b.join(' ')}`) })) };
}));
const ROOT = `${BASE}${LANG === 'ru' ? 'ru/' : ''}`;
const escH = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// moslik qismini <mark> bilan ajratamiz (yumshoq belgilarsiz qidiriladi)
function markHit(name, q) {
  const i = name.toLowerCase().replace(/ё/g, 'е').indexOf(q);
  return i < 0 ? escH(name) : `${escH(name.slice(0, i))}<mark>${escH(name.slice(i, i + q.length))}</mark>${escH(name.slice(i + q.length))}`;
}

for (const form of document.querySelectorAll('[data-suggest]')) {
  const input = form.querySelector('input');
  const list = form.querySelector('.sug');
  let active = -1;
  let opts = [];
  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; };
  const setActive = (i) => {
    opts.forEach((o, k) => o.setAttribute('aria-selected', String(k === i)));
    active = i;
    if (i < 0) { input.removeAttribute('aria-activedescendant'); return; }
    input.setAttribute('aria-activedescendant', opts[i].id);
    opts[i].scrollIntoView({ block: 'nearest' });
  };
  async function update() {
    const raw = input.value.trim();
    if (!raw) { close(); return; }
    const { fold, cats, items } = await loadIndex();
    if (input.value.trim() !== raw) return; // yozish davom etgan
    const q = fold(raw);
    const words = q.split(/\s+/).filter(Boolean);
    const rank = (p) => (p.f.startsWith(q) ? 0 : p.f.includes(` ${q}`) || p.f.includes(`(${q}`) ? 1 : p.f.includes(q) ? 2 : 3);
    const hits = items.filter((p) => words.every((w) => p.h.includes(w))).sort((x, y) => rank(x) - rank(y));
    const catHits = cats.filter((c) => c.f.startsWith(q) || c.f.includes(` ${q}`)).slice(0, 2);
    const base = `${form.id || input.id}-o`;
    let html = catHits.map((c, k) => `<li role="option" id="${base}c${k}" class="sug__o sug__o--cat" data-href="${ROOT}katalog/${c.c}/"><span class="sug__ic" aria-hidden="true"></span><span class="sug__t"><span class="sug__n">${markHit(c.n, raw.toLowerCase())}</span><span class="sug__c">${SUG_T.cat} · ${c.count}</span></span></li>`).join('');
    html += hits.slice(0, 30).map((p, k) => `<li role="option" id="${base}p${k}" class="sug__o" data-href="${ROOT}mahsulot/${p.s}/"><img src="${BASE}${p.m}" alt="" width="40" height="40" loading="lazy" decoding="async"><span class="sug__t"><span class="sug__n">${markHit(p.n, raw.toLowerCase())}</span><span class="sug__c">${escH(p.cn)}</span></span></li>`).join('');
    if (hits.length) html += `<li role="option" id="${base}all" class="sug__o sug__o--all" data-href="${ROOT}katalog/?q=${encodeURIComponent(raw)}">${SUG_T.all(hits.length)}</li>`;
    if (!html) html = `<li class="sug__none" role="presentation">${SUG_T.none}</li>`;
    list.innerHTML = html;
    list.scrollTop = 0;
    opts = [...list.querySelectorAll('[role=option]')];
    active = -1;
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }
  let timer;
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(update, 60); });
  input.addEventListener('focus', () => { loadIndex(); if (input.value.trim()) update(); }, { passive: true });
  input.addEventListener('keydown', (e) => {
    if (list.hidden) { if (e.key === 'ArrowDown' && input.value.trim()) { update(); e.preventDefault(); } return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(active + 1, opts.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(active - 1, -1)); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); location.href = opts[active].dataset.href; }
  });
  // sichqoncha bosilganda input fokusni yo'qotmasin, aks holda ro'yxat yopilib qoladi
  list.addEventListener('pointerdown', (e) => e.preventDefault());
  list.addEventListener('click', (e) => { const o = e.target.closest('[role=option]'); if (o) location.href = o.dataset.href; });
  input.addEventListener('blur', () => setTimeout(close, 0));
}

// 7) Ustaxona yig'uvchi: tur, tanlangan modellar va o'chirilganlar URL'da saqlanadi (havolani yuborsa bo'ladi)
const ws = document.querySelector('[data-ws]');
if (ws) {
  const names = JSON.parse(ws.dataset.names);
  const radios = [...ws.querySelectorAll('.wtype__r')];
  const roles = [...ws.querySelectorAll('.wrole')];
  const sumList = ws.querySelector('[data-sumlist]');
  const total = ws.querySelector('[data-total]');
  const empty = ws.querySelector('[data-empty]');
  const send = ws.querySelector('[data-send]');
  const copyBtn = ws.querySelector('[data-copy]');
  const copyMsg = ws.querySelector('[data-copymsg]');
  const q = new URLSearchParams(location.search);
  const picked = Object.fromEntries((q.get('s') || '').split(',').filter(Boolean).map((x) => x.split('.')));
  const off = new Set((q.get('x') || '').split(',').filter(Boolean));
  let type = names[q.get('t')] ? q.get('t') : radios[0].value;
  radios.forEach((r) => { r.checked = r.value === type; });

  const chosenBtn = (li, id) => li.querySelector(`.wopt[data-id="${id}"]`);
  function setChoice(li, id) {
    const b = chosenBtn(li, id);
    if (!b) return;
    li.querySelectorAll('.wopt').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const name = li.querySelector('.wrole__name');
    name.textContent = b.dataset.name;
    name.href = b.dataset.href;
    li.querySelector('.wrole__img').href = b.dataset.href;
    li.querySelector('.wrole__img img').src = b.dataset.src;
  }
  const defaultFor = (li) => JSON.parse(li.dataset.def)[type] || li.dataset.opt0;
  const active = () => roles.filter((li) => li.dataset.types.split(' ').includes(type));
  const currentName = (li) => li.querySelector('.wrole__name').textContent;

  function render() {
    for (const li of roles) {
      const inType = li.dataset.types.split(' ').includes(type);
      li.hidden = !inType;
      if (!inType) continue;
      if (li.querySelector('.wopt')) setChoice(li, picked[li.dataset.role] || defaultFor(li));
      const on = !off.has(li.dataset.role);
      li.querySelector('.wrole__inc input').checked = on;
      li.classList.toggle('is-off', !on);
    }
    ws.querySelectorAll('.wstage').forEach((st) => { st.hidden = !st.dataset.types.split(' ').includes(type); });
    const list = active().filter((li) => !off.has(li.dataset.role));
    total.textContent = list.length;
    ws.querySelector('[data-total2]').textContent = list.length;
    sumList.innerHTML = list.map((li) => `<li>${currentName(li).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}<span>${li.dataset.rname}</span></li>`).join('');
    empty.hidden = list.length > 0;
    // havola holati
    const p = new URLSearchParams({ t: type });
    const s = Object.entries(picked).filter(([r]) => active().some((li) => li.dataset.role === r)).map(([r, id]) => `${r}.${id}`);
    if (s.length) p.set('s', s.join(','));
    const x = [...off].filter((r) => active().some((li) => li.dataset.role === r));
    if (x.length) p.set('x', x.join(','));
    if (ws.dataset.ready) history.replaceState(null, '', `${location.pathname}?${p}`);
    const link = `${ws.dataset.page}?${p}`;
    const text = `${ws.dataset.msg} (${names[type]}):\n${list.map((li, i) => `${i + 1}. ${li.dataset.rname} — ${currentName(li)}`).join('\n')}`;
    send.href = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
    send.toggleAttribute('aria-disabled', !list.length);
    ws.dataset.text = `${text}\n\n${link}`;
  }

  radios.forEach((r) => r.addEventListener('change', () => { type = r.value; render(); }));
  ws.addEventListener('click', (e) => {
    const b = e.target.closest('.wopt');
    if (!b) return;
    const li = b.closest('.wrole');
    picked[li.dataset.role] = b.dataset.id;
    off.delete(li.dataset.role);
    render();
  });
  ws.addEventListener('change', (e) => {
    const cb = e.target.closest('.wrole__inc input');
    if (!cb) return;
    const r = cb.closest('.wrole').dataset.role;
    if (cb.checked) off.delete(r); else off.add(r);
    render();
  });
  copyBtn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(ws.dataset.text); copyMsg.textContent = ws.dataset.copied; } catch { copyMsg.textContent = ''; }
    setTimeout(() => { copyMsg.textContent = ''; }, 2500);
  });
  // mobil: ro'yxat bloki ko'ringanda pastdagi tugma yashirinadi
  const sum = ws.querySelector('.ws__sum');
  if ('IntersectionObserver' in window) new IntersectionObserver((en) => ws.classList.toggle('sum-in-view', en[0].isIntersecting)).observe(sum);
  render();
  ws.dataset.ready = '1';
}

// 8) 3D ko'rinish: model-viewer va model faqat blok ekranga yaqinlashganda yuklanadi
const m3d = document.querySelector('[data-m3d]');
if (m3d) {
  const mv = m3d.querySelector('model-viewer');
  const side = m3d.parentElement;
  const tabs = [...side.querySelectorAll('.m3d__tab')];
  let started = false;
  const show = (src) => { m3d.classList.remove('is-ready'); mv.setAttribute('src', src); };
  mv.addEventListener('load', () => m3d.classList.add('is-ready'));
  const start = () => {
    if (started) return;
    started = true;
    import(m3d.dataset.viewer).then(() => show(mv.dataset.src)).catch(() => { started = false; });
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((en) => { if (en.some((x) => x.isIntersecting)) { io.disconnect(); start(); } }, { rootMargin: '300px' });
    io.observe(m3d);
  } else start();
  tabs.forEach((b) => b.addEventListener('click', () => {
    if (b.getAttribute('aria-pressed') === 'true') return;
    tabs.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    side.querySelector('[data-m3d-note]').textContent = b.dataset.note;
    const l = side.querySelector('[data-m3d-link]'); l.href = b.dataset.href; l.textContent = b.dataset.label;
    const c = side.querySelector('[data-m3d-credit]'); c.href = b.dataset.creditUrl; c.textContent = b.dataset.credit;
    mv.alt = b.dataset.name;
    mv.dataset.src = b.dataset.src;
    if (started) show(b.dataset.src); else start();
  }));
}
