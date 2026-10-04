/* 康家滩欣院 · 页面交互 */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const DATA = window.XY_DATA || { plates: [], photos: [] };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const photoSrc = (n, sm) => `assets/img/photos/${n}${sm ? '-sm' : ''}.jpg`;
const plateSrc = (id, sm) => `assets/img/plates/${id}${sm ? '-sm' : ''}.jpg`;
const photoById = Object.fromEntries(DATA.photos.map((p) => [p.n, p]));
const photoCaption = (n) => {
  const p = photoById[n];
  return p ? `原照 ${n} · ${p.d.join('；')}` : `原照 ${n}`;
};

/* ---------- 导航 ---------- */
const nav = $('[data-nav]');
const darkSections = $$('.hero, .sec--ink, .sec--night, .sec--brick, .sec--red');
function onScroll() {
  const y = window.scrollY;
  nav.classList.toggle('is-scrolled', y > 40);
  const probe = 40;
  const overDark = darkSections.some((s) => {
    const r = s.getBoundingClientRect();
    return r.top <= probe && r.bottom > probe;
  });
  nav.classList.toggle('is-dark', y > 40 && overDark);
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

const menuBtn = $('[data-menu-btn]');
const menu = $('[data-menu]');
function setMenu(open) {
  menuBtn.setAttribute('aria-expanded', String(open));
  menu.hidden = !open;
  document.body.classList.toggle('is-locked', open);
  nav.classList.toggle('is-dark', open || nav.classList.contains('is-dark'));
}
menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });

const navLinks = $$('.nav__links a');
const spy = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${en.target.id}`));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
$$('main > section[id]').forEach((s) => spy.observe(s));

/* ---------- 进场动画 ---------- */
const revealIO = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('is-in'); revealIO.unobserve(en.target); }
  });
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
function watchReveal(root = document) { $$('.reveal:not(.is-in)', root).forEach((el) => revealIO.observe(el)); }
watchReveal();

/* ---------- 走口外地图 ---------- */
const map = $('[data-map]');
if (map) {
  const route = $('#route-out', map);
  const caravan = $('[data-caravan]', map);
  let raf = 0;
  let running = false;
  const len = route.getTotalLength();
  const io = new IntersectionObserver(([en]) => {
    if (en.isIntersecting) {
      map.classList.add('is-in');
      if (!running && !reduceMotion) { running = true; raf = requestAnimationFrame(step); }
    } else if (running) { running = false; cancelAnimationFrame(raf); }
  }, { threshold: 0.25 });
  io.observe(map);
  const t0 = performance.now();
  function step(now) {
    const t = ((now - t0) / 14000) % 1;
    const k = t < 0.5 ? t * 2 : 2 - t * 2; // 往返
    const pt = route.getPointAtLength(len * k);
    caravan.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
    if (running) raf = requestAnimationFrame(step);
  }
  if (reduceMotion) {
    const pt = route.getPointAtLength(len * 0.55);
    caravan.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
  }
}

/* ---------- 构件说明（平面图与三维共用） ---------- */
export const COMPONENTS = {
  A: { name: '主房', title: '主房 · 长排花格', conf: '原照可见形制 · 尺寸未实测', plate: '01-main-hall', photos: ['443', '436', '438', '397'],
    desc: '三开间、四根主柱；两端开门，中间为连续的窗槛墙。上槛九组花格，有八角格、折线回纹与中央星形；梁端雕兽形承托，柱下石础层层回转。' },
  B: { name: '东厢房', title: '东厢房', conf: '原照可见形制 · 两翼配准待核', plate: '02-side-wings', photos: ['418', '414', '410', '445'],
    desc: '说明牌记“东西房各面宽三间，进深四椽，单檐硬山顶”。中门两窗，中门上方嵌回纹花格，两侧方格窗下为灰砖窗槛墙，檐口椽头外露、正脊低平。' },
  C: { name: '西厢房', title: '西厢房', conf: '原照可见形制 · 两翼配准待核', plate: '02-side-wings', photos: ['418', '414', '417'],
    desc: '与东厢相对，同为三开间。两翼门窗细部不同，分别依据原照418、414两个视角复原，不互相镜像替代；各对应哪一侧仍待现场核实。' },
  D: { name: '砖券窑房', title: '北房 · 砖券窑洞', conf: '原照可见形制 · 开间数为假设', plate: '03-vaulted-rooms', photos: ['420', '419'],
    desc: '现场说明牌记“北房面宽三间，砖券窑洞，上部砖雕”。以砖拱承重、不施木梁，即《保德名胜》所说的“无梁殿”结构；券洞一宽一窄，券上有仿木砖承托、波纹檐带与花卉垂饰，顶部为十字形镂空女儿墙。' },
  E: { name: '角门', title: '四角券门 · 務本', conf: '原照可见形制 · 位置待现场确认', plate: '04-corner-arches', photos: ['449', '415', '452', '450'],
    desc: '院落四角的砖券门洞，起拱砖逐块砌筑。东北角门额砖雕“務本”（原照449，右起读）；西北角门额释读待核（原照415）。' },
  F: { name: '门楼', title: '门楼', conf: '原照可见形制 · 油饰为推定', plate: '05-entrance-gate', photos: ['460', '461', '464', '466', '475'],
    desc: '说明牌记“大门面宽一间，进深二椽，硬山顶”。小体量门楼，砖墩木柱，檐下卷曲承托与兽形梁端；门扇上饰双层菊瓣门花与铁叶，门环座为薄片式轮廓。门外临街，有高差。' },
  G: { name: '影壁', title: '砖雕影壁', conf: '原照可见形制 · 残字未补全', plate: '06-carved-screen', photos: ['456', '474', '391'],
    desc: '“大门内里置砖雕影壁1座”。上部仿木檐与回纹圆形篆字纹，中部对称长尾鸟与卷草花叶，中央设带小瓦檐的龛；侧柱可辨“處世良”三字。' },
  H: { name: '石阶', title: '登顶石阶（推定）', conf: '推定构件 · 原照未直接可见全貌', plate: '07-passage-stairs', photos: ['403', '404', '405'],
    desc: '原照可见窄夹道中的不规则石踏步与高低平台；模型将其推定为登上砖券窑顶平台的通道，位置与阶数未经实测。' },
  I: { name: '夹道房', title: '夹道房（推定位置）', conf: '推定构件 · 总平面位置未核', plate: '07-passage-stairs', photos: ['453', '393'],
    desc: '窄夹道旁的小屋：拱顶窗嵌斜格，下部方格窗，门扇作菱格，檐椽外露。原照只见局部，整排开间数与位置均为推定。' },
  Z: { name: '后院', title: '后院（占位）', conf: '存在经确认 · 位置与尺寸为推定', plate: null, photos: [],
    desc: '说明牌记欣院为“南北两院，同为四合院，形制完全一样”。另一院的各栋形制、尺度与连通路线尚待现场资料，模型中以浅色虚体占位。' },
};
window.XY_COMPONENTS = COMPONENTS;

/* ---------- 灯箱 ---------- */
const lb = $('[data-lb]');
const lbImg = $('[data-lb-img]');
const lbCap = $('[data-lb-cap]');
let lbItems = [];
let lbIndex = 0;
let lbReturn = null;
function lbShow(i) {
  lbIndex = (i + lbItems.length) % lbItems.length;
  const it = lbItems[lbIndex];
  lbImg.src = it.src;
  lbImg.alt = it.cap || '';
  lbCap.textContent = it.cap || '';
  const multi = lbItems.length > 1;
  $('[data-lb-prev]').hidden = !multi;
  $('[data-lb-next]').hidden = !multi;
}
export function openLightbox(items, start = 0) {
  if (!items.length) return;
  lbItems = items;
  lbReturn = document.activeElement;
  lb.hidden = false;
  document.body.classList.add('is-locked');
  lbShow(start);
  $('[data-lb-close]').focus();
}
function closeLightbox() {
  lb.hidden = true;
  lbImg.removeAttribute('src');
  document.body.classList.remove('is-locked');
  if (lbReturn) lbReturn.focus();
}
$('[data-lb-close]').addEventListener('click', closeLightbox);
$('[data-lb-prev]').addEventListener('click', () => lbShow(lbIndex - 1));
$('[data-lb-next]').addEventListener('click', () => lbShow(lbIndex + 1));
lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lb__fig')) closeLightbox(); });
document.addEventListener('keydown', (e) => {
  if (lb.hidden) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') lbShow(lbIndex - 1);
  if (e.key === 'ArrowRight') lbShow(lbIndex + 1);
});
let touchX = null;
lb.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
lb.addEventListener('touchend', (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 50 && lbItems.length > 1) lbShow(lbIndex + (dx < 0 ? 1 : -1));
  touchX = null;
});
const photoItem = (n) => ({ src: photoSrc(n), cap: photoCaption(n) });
const plateItem = (p) => ({ src: plateSrc(p.id), cap: `盛景推定 ${p.no} · ${p.title}（依据原照生成的视觉推定，非实测、非模型渲染）` });
export function openPhotos(list, start = 0) { openLightbox(list.map(photoItem), start); }
export function openPlate(id) {
  const i = DATA.plates.findIndex((p) => p.id === id);
  if (i >= 0) openLightbox(DATA.plates.map(plateItem), i);
}
window.XY_OPEN = { photos: openPhotos, plate: openPlate };

document.addEventListener('click', (e) => {
  const ph = e.target.closest('[data-lightbox-photo]');
  if (ph) { openPhotos([ph.dataset.lightboxPhoto]); return; }
  const src = e.target.closest('[data-lightbox-src]');
  if (src) openLightbox([{ src: src.dataset.lightboxSrc, cap: src.dataset.lightboxCap || '' }]);
});

/* ---------- 平面图 ---------- */
const plan = $('[data-plan]');
if (plan) {
  const order = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'Z'];
  const list = $('[data-plan-list]', plan);
  list.innerHTML = order.map((k) => `<li><button type="button" data-k="${k}"><b>${k}</b>${COMPONENTS[k].name}</button></li>`).join('');
  let current = 'A';
  const show = (k) => {
    const c = COMPONENTS[k];
    if (!c) return;
    current = k;
    $('[data-plan-tag]', plan).textContent = k;
    $('[data-plan-title]', plan).textContent = c.title;
    $('[data-plan-conf]', plan).textContent = c.conf;
    $('[data-plan-desc]', plan).textContent = c.desc;
    $('[data-plan-photos]', plan).textContent = c.photos.length ? `关联原照：${c.photos.join('、')}` : '暂无直接原照';
    $('[data-plan-plate]', plan).hidden = !c.plate;
    $$('.pl[data-comp]', plan).forEach((g) => g.classList.toggle('is-on', g.dataset.comp === k));
    $$('[data-k]', list).forEach((b) => b.setAttribute('aria-current', String(b.dataset.k === k)));
  };
  plan.addEventListener('click', (e) => {
    const g = e.target.closest('.pl[data-comp], [data-k]');
    if (g) show(g.dataset.comp || g.dataset.k);
  });
  plan.addEventListener('keydown', (e) => {
    const g = e.target.closest('.pl[data-comp]');
    if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); show(g.dataset.comp); }
  });
  $$('.pl[data-comp]', plan).forEach((g) => g.addEventListener('mouseenter', () => show(g.dataset.comp)));
  $('[data-plan-3d]', plan).addEventListener('click', () => {
    $('#yunyou').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    load3D().then((api) => api && api.focus(current));
  });
  $('[data-plan-plate]', plan).addEventListener('click', () => {
    const c = COMPONENTS[current];
    if (c.plate) openPlate(c.plate);
  });
  show('A');
}

/* ---------- 盛景图版 ---------- */
const tabs = $('[data-plate-tabs]');
const panel = $('[data-plate-panel]');
if (tabs && DATA.plates.length) {
  tabs.innerHTML = DATA.plates.map((p, i) => `<button type="button" role="tab" id="pt-${p.no}" aria-controls="plate-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-i="${i}"><b>${p.no}</b><span>${p.short}</span></button>`).join('');
  panel.id = 'plate-panel';
  const li = (arr) => arr.map((t) => `<li>${t}</li>`).join('');
  const render = (i) => {
    const p = DATA.plates[i];
    $$('[role="tab"]', tabs).forEach((b, j) => { b.setAttribute('aria-selected', String(j === i)); b.tabIndex = j === i ? 0 : -1; });
    panel.setAttribute('aria-labelledby', `pt-${p.no}`);
    const others = p.photos.filter((n) => !p.key.includes(n));
    panel.innerHTML = `
      <div class="plate">
        <figure class="plate__img">
          <button class="zoom" type="button" data-plate-open="${p.id}" aria-label="放大查看盛景图：${p.title}">
            <img src="${plateSrc(p.id, true)}" srcset="${plateSrc(p.id, true)} 760w, ${plateSrc(p.id)} 1600w" sizes="(max-width: 900px) 92vw, 62vw" alt="${p.title}（盛景推定图）" width="${p.w}" height="${p.h}">
          </button>
          <figcaption>点击放大 · 依据原照约束生成的“维护完好状态”视觉推定，非模型渲染</figcaption>
        </figure>
        <div class="plate__body">
          <span class="plate__no">${p.no}</span>
          <h3>${p.title}</h3>
          <h4>本图呈现</h4><ul>${li(p.details)}</ul>
          <h4>仍需核实</h4><ul class="is-limit">${li(p.limits)}</ul>
          <h4>对照原照</h4>
          <div class="plate__thumbs">${p.key.map((n) => `<button type="button" data-plate-photo="${n}" aria-label="查看原照 ${n}"><img src="${photoSrc(n, true)}" alt="原照 ${n}" loading="lazy"><span>${n}</span></button>`).join('')}</div>
          <p class="plate__all">关联原照：${p.photos.join('、')}${others.length ? '' : ''}</p>
          <div class="plate__nav">
            <button class="btn btn--line btn--sm" type="button" data-step="-1">上一组</button>
            <button class="btn btn--ink btn--sm" type="button" data-step="1">下一组</button>
          </div>
        </div>
      </div>`;
    panel.dataset.i = i;
  };
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('[role="tab"]');
    if (b) render(+b.dataset.i);
  });
  tabs.addEventListener('keydown', (e) => {
    const cur = +(panel.dataset.i || 0);
    let n = null;
    if (e.key === 'ArrowRight') n = (cur + 1) % DATA.plates.length;
    if (e.key === 'ArrowLeft') n = (cur - 1 + DATA.plates.length) % DATA.plates.length;
    if (n !== null) { e.preventDefault(); render(n); $(`[data-i="${n}"]`, tabs).focus(); $(`[data-i="${n}"]`, tabs).scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  });
  panel.addEventListener('click', (e) => {
    const cur = +(panel.dataset.i || 0);
    const p = DATA.plates[cur];
    const step = e.target.closest('[data-step]');
    if (step) {
      const n = (cur + +step.dataset.step + DATA.plates.length) % DATA.plates.length;
      render(n);
      $(`[data-i="${n}"]`, tabs).scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      return;
    }
    if (e.target.closest('[data-plate-open]')) { openPlate(p.id); return; }
    const t = e.target.closest('[data-plate-photo]');
    if (t) openPhotos(p.key, p.key.indexOf(t.dataset.platePhoto));
  });
  render(0);
}

/* ---------- 原照档案 ---------- */
const archive = $('[data-archive]');
const filters = $('[data-filters]');
if (archive && DATA.photos.length) {
  const groups = [
    { k: 'all', t: '全部', test: () => true },
    { k: 'A', t: '主房', test: (c) => c.includes('A') },
    { k: 'BC', t: '厢房', test: (c) => c.includes('B') || c.includes('C') },
    { k: 'D', t: '砖券窑房', test: (c) => c.includes('D') },
    { k: 'E', t: '角门', test: (c) => c.includes('E') },
    { k: 'F', t: '门楼', test: (c) => c.includes('F') },
    { k: 'G', t: '影壁', test: (c) => c.includes('G') },
    { k: 'HI', t: '夹道 · 石阶', test: (c) => c.includes('H') || c.includes('I') },
    { k: 'ROOF', t: '屋面', test: (c) => c.includes('ROOF') },
    { k: 'STATE', t: '现状与说明牌', test: (c) => c.includes('STATE') || c.includes('SIGN') },
  ];
  const count = (g) => DATA.photos.filter((p) => g.test(p.comp)).length;
  filters.innerHTML = groups.map((g, i) => `<button type="button" data-g="${g.k}" aria-pressed="${i === 0}">${g.t}<b>${count(g)}</b></button>`).join('');
  archive.innerHTML = DATA.photos.map((p) => `
    <figure class="ph" data-n="${p.n}">
      <button type="button" aria-label="放大查看原照 ${p.n}"><img src="${photoSrc(p.n, true)}" alt="原照 ${p.n}：${p.d.join('，')}" loading="lazy" width="${p.w > p.h ? 520 : Math.round(520 * p.w / p.h)}" height="${p.w > p.h ? Math.round(520 * p.h / p.w) : 520}"></button>
      <figcaption><b>${p.n}</b>${p.d.slice(0, 3).join('；')}</figcaption>
    </figure>`).join('');
  let visible = DATA.photos.map((p) => p.n);
  filters.addEventListener('click', (e) => {
    const b = e.target.closest('[data-g]');
    if (!b) return;
    const g = groups.find((x) => x.k === b.dataset.g);
    $$('[data-g]', filters).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    visible = [];
    $$('.ph', archive).forEach((f) => {
      const p = photoById[f.dataset.n];
      const on = g.test(p.comp);
      f.classList.toggle('is-out', !on);
      if (on) visible.push(p.n);
    });
  });
  archive.addEventListener('click', (e) => {
    const f = e.target.closest('.ph');
    if (f) openPhotos(visible, visible.indexOf(f.dataset.n));
  });
}

/* ---------- 三维（按需加载） ---------- */
const stage = $('#stage3d');
let api3D = null;
let loading3D = null;
export function load3D() {
  if (!stage) return Promise.resolve(null);
  if (loading3D) return loading3D;
  loading3D = import('./courtyard3d.js')
    .then((m) => m.initCourtyard(stage, { components: COMPONENTS, openPhotos, openPlate }))
    .then((api) => { api3D = api; window.XY3D = api; return api; })
    .catch((err) => {
      console.error(err);
      stage.dataset.state = 'error';
      $('.stage__fallback', stage).hidden = false;
      return null;
    });
  return loading3D;
}
if (stage) {
  $('[data-act="load"]', stage).addEventListener('click', () => load3D());
  const saveData = navigator.connection && navigator.connection.saveData;
  if (!saveData) {
    const io3 = new IntersectionObserver(([en]) => {
      if (en.isIntersecting) { io3.disconnect(); load3D(); }
    }, { rootMargin: '400px 0px' });
    io3.observe(stage);
  }
}
