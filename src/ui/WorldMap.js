const STYLE_ID = 'worldmap-styles';
const BODY_CLASS = 'worldmap-open';

const CSS = `
#worldmap-root {
  --wm-ink: var(--ink, #0b0805);
  --wm-sand: var(--sand, #e8d3ae);
  --wm-ochre: var(--ochre, #d9a441);
  --wm-line: rgba(217, 164, 65, .22);
  --wm-hair: rgba(232, 211, 174, .11);
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
  color: var(--wm-sand);
  background:
    radial-gradient(90% 64% at 50% -10%, rgba(217, 164, 65, .11), rgba(217, 164, 65, 0) 62%),
    radial-gradient(130% 105% at 50% 118%, #1a1208 0%, #0b0805 60%, #060402 100%);
  font-family: Georgia, 'Times New Roman', serif;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior: none;
  transition: opacity .28s ease, visibility 0s linear .28s;
}
#worldmap-root.wm-visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition: opacity .28s ease, visibility 0s linear 0s;
}
body.worldmap-open { overflow: hidden; }
#worldmap-root *,
#worldmap-root *::before,
#worldmap-root *::after { box-sizing: border-box; }
#worldmap-root .wm-top {
  flex: 0 0 auto;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: clamp(12px, 2.4vh, 24px) clamp(14px, 3vw, 38px) 0;
}
#worldmap-root .wm-brand {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
#worldmap-root .wm-mark {
  margin: 0 -.36em 0 0;
  font-size: clamp(16px, 2.3vw, 24px);
  font-weight: 400;
  line-height: 1;
  letter-spacing: .36em;
  text-transform: uppercase;
  color: var(--wm-ochre);
}
#worldmap-root .wm-sub {
  margin: 0;
  font-size: 9px;
  letter-spacing: .3em;
  text-transform: uppercase;
  opacity: .56;
  white-space: nowrap;
}
#worldmap-root .wm-close {
  flex: 0 0 auto;
  margin-left: auto;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--wm-line);
  background: transparent;
  color: var(--wm-sand);
  font-family: inherit;
  font-size: 17px;
  line-height: 1;
  cursor: pointer;
  transition: border-color .2s ease, color .2s ease;
}
#worldmap-root .wm-close:hover { border-color: var(--wm-ochre); color: var(--wm-ochre); }
#worldmap-root .wm-close:focus-visible,
#worldmap-root .wm-card:focus-visible,
#worldmap-root .wm-dot-btn:focus-visible {
  outline: 1px solid var(--wm-ochre);
  outline-offset: 3px;
}
#worldmap-root .wm-view {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  margin-top: clamp(8px, 1.6vh, 16px);
  touch-action: pan-y;
}
#worldmap-root .wm-track {
  display: flex;
  height: 100%;
  will-change: transform;
  transition: transform .42s cubic-bezier(.22, .61, .36, 1);
}
#worldmap-root .wm-track.is-dragging { transition: none; }
#worldmap-root .wm-page {
  flex: 0 0 100%;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  padding: 0 clamp(14px, 3vw, 38px);
  opacity: .4;
  touch-action: pan-y;
  transition: opacity .32s ease;
}
#worldmap-root .wm-page[data-active="true"] { opacity: 1; }
#worldmap-root .wm-head {
  flex: 0 0 auto;
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding-bottom: clamp(7px, 1.2vh, 11px);
  border-bottom: 1px solid var(--wm-hair);
}
#worldmap-root .wm-name {
  margin: 0;
  min-width: 0;
  font-size: clamp(13px, 2vw, 19px);
  font-weight: 400;
  line-height: 1.1;
  letter-spacing: .26em;
  text-transform: uppercase;
  color: var(--wm-ochre);
}
#worldmap-root .wm-count {
  margin-left: auto;
  font-size: 8.5px;
  letter-spacing: .24em;
  text-transform: uppercase;
  opacity: .44;
  white-space: nowrap;
}
#worldmap-root .wm-cards {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  grid-auto-rows: minmax(148px, 1fr);
  gap: clamp(8px, 1.3vw, 14px);
  margin-top: clamp(9px, 1.5vh, 14px);
  padding-bottom: 2px;
  overflow-y: auto;
  overscroll-behavior: contain;
  touch-action: pan-y;
  scrollbar-width: thin;
  scrollbar-color: rgba(217, 164, 65, .3) transparent;
}
#worldmap-root .wm-cards::-webkit-scrollbar { width: 5px; }
#worldmap-root .wm-cards::-webkit-scrollbar-thumb { background: rgba(217, 164, 65, .3); }
#worldmap-root .wm-card {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 5px;
  min-height: 0;
  margin: 0;
  padding: clamp(10px, 1.4vw, 15px);
  border: 1px solid rgba(217, 164, 65, .3);
  border-radius: 2px;
  background: #150e08;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  text-align: left;
  overflow: hidden;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  touch-action: pan-y;
  transition: border-color .22s ease;
}
#worldmap-root .wm-card.is-locked { cursor: default; }
#worldmap-root .wm-card.is-playable:hover { border-color: rgba(217, 164, 65, .6); }
#worldmap-root .wm-card.is-playable:active { border-color: var(--wm-ochre); }
#worldmap-root .wm-card::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 2;
  border: 1px solid rgba(232, 211, 174, .08);
  pointer-events: none;
}
#worldmap-root .wm-media {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-color: #150e08;
  background-image:
    linear-gradient(180deg, rgba(11, 8, 5, .12) 0%, rgba(11, 8, 5, .5) 46%, rgba(11, 8, 5, .94) 100%),
    var(--wm-art, linear-gradient(158deg, #5a3d20 0%, #8a6236 48%, #150e07 100%));
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transition: transform .55s ease;
}
#worldmap-root .wm-card.is-playable:hover .wm-media { transform: scale(1.035); }
#worldmap-root .wm-card.is-locked .wm-media { filter: saturate(.45) brightness(.66); }
#worldmap-root .wm-page[data-continent="africa"] {
  --wm-art: radial-gradient(78% 62% at 74% 14%, rgba(255, 224, 176, .5), rgba(255, 224, 176, 0) 55%), linear-gradient(155deg, #8a5a30 0%, #c4925c 42%, #2a180c 100%);
}
#worldmap-root .wm-page[data-continent="north-america"] {
  --wm-art: radial-gradient(70% 60% at 24% 16%, rgba(255, 217, 160, .34), rgba(255, 217, 160, 0) 58%), linear-gradient(158deg, #3d312a 0%, #6d5646 46%, #17110e 100%);
}
#worldmap-root .wm-page[data-continent="europe"] {
  --wm-art: radial-gradient(66% 58% at 68% 20%, rgba(214, 208, 192, .28), rgba(214, 208, 192, 0) 60%), linear-gradient(158deg, #4a463f 0%, #7b7360 44%, #14120f 100%);
}
#worldmap-root .wm-year {
  position: absolute;
  top: 9px;
  left: 9px;
  z-index: 1;
  max-width: calc(100% - 18px);
  padding: 3px 7px;
  border: 1px solid rgba(217, 164, 65, .48);
  background: rgba(8, 6, 3, .52);
  color: var(--wm-ochre);
  font-size: 9px;
  letter-spacing: .2em;
  line-height: 1.35;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
#worldmap-root .wm-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
#worldmap-root .wm-card-title {
  margin: 0;
  font-size: clamp(13px, 1.5vw, 16px);
  font-weight: 400;
  line-height: 1.22;
  letter-spacing: .06em;
  text-transform: uppercase;
  overflow-wrap: break-word;
  text-shadow: 0 1px 3px rgba(0, 0, 0, .6);
}
#worldmap-root .wm-place {
  margin: 0;
  font-size: 9px;
  letter-spacing: .16em;
  text-transform: uppercase;
  opacity: .6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
#worldmap-root .wm-blurb {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.42;
  font-style: italic;
  opacity: .76;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
#worldmap-root .wm-status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 9px;
  letter-spacing: .26em;
  text-transform: uppercase;
  color: var(--wm-ochre);
  white-space: nowrap;
}
#worldmap-root .wm-card.is-locked .wm-status { color: rgba(232, 211, 174, .46); }
#worldmap-root .wm-play { font-size: 7px; line-height: 1; letter-spacing: 0; }
#worldmap-root .wm-lock-dot {
  width: 5px;
  height: 5px;
  border: 1px solid currentColor;
  border-radius: 50%;
  flex: 0 0 auto;
}
#worldmap-root .wm-empty {
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 10px;
  letter-spacing: .3em;
  text-transform: uppercase;
  opacity: .5;
}
#worldmap-root .wm-foot {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  padding: 2px clamp(14px, 3vw, 38px) clamp(8px, 1.5vh, 14px);
}
#worldmap-root .wm-step {
  margin: 0;
  font-size: 8.5px;
  letter-spacing: .24em;
  text-transform: uppercase;
  opacity: .4;
  white-space: nowrap;
}
#worldmap-root .wm-step.is-right { text-align: right; }
#worldmap-root .wm-dots { display: flex; align-items: center; justify-content: center; }
#worldmap-root .wm-dot-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  background: transparent;
  display: grid;
  place-items: center;
  cursor: pointer;
}
#worldmap-root .wm-dot-btn::before {
  content: '';
  width: 6px;
  height: 6px;
  border: 1px solid rgba(232, 211, 174, .46);
  border-radius: 50%;
  transition: background-color .22s ease, border-color .22s ease, transform .22s ease;
}
#worldmap-root .wm-dot-btn[aria-current="true"]::before {
  background: var(--wm-ochre);
  border-color: var(--wm-ochre);
  transform: scale(1.2);
}
@media (orientation: landscape) and (max-height: 520px) {
  #worldmap-root .wm-top { padding-top: 9px; gap: 10px; }
  #worldmap-root .wm-mark { font-size: 16px; }
  #worldmap-root .wm-sub { font-size: 8px; letter-spacing: .26em; }
  #worldmap-root .wm-close { width: 28px; height: 28px; font-size: 15px; }
  #worldmap-root .wm-view { margin-top: 7px; }
  #worldmap-root .wm-head { padding-bottom: 6px; }
  #worldmap-root .wm-name { font-size: 12px; }
  #worldmap-root .wm-cards { margin-top: 7px; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); }
  #worldmap-root .wm-card { padding: 9px 11px; gap: 3px; }
  #worldmap-root .wm-card-title { font-size: 12.5px; }
  #worldmap-root .wm-place { font-size: 8.5px; }
  #worldmap-root .wm-blurb { font-size: 10.5px; }
  #worldmap-root .wm-status { margin-top: 2px; font-size: 8.5px; }
  #worldmap-root .wm-year { top: 7px; left: 7px; font-size: 8.5px; padding: 2px 6px; }
  #worldmap-root .wm-foot { padding-bottom: calc(3px + env(safe-area-inset-bottom, 0px)); }
  #worldmap-root .wm-dot-btn { width: 22px; height: 22px; }
}
@media (max-width: 600px) {
  #worldmap-root .wm-top { padding-top: 14px; }
  #worldmap-root .wm-mark { font-size: 17px; letter-spacing: .3em; }
  #worldmap-root .wm-page { padding: 0 14px; }
  #worldmap-root .wm-cards { grid-template-columns: 1fr; grid-auto-rows: minmax(168px, 1fr); gap: 10px; }
  #worldmap-root .wm-card { padding: 12px 14px; }
  #worldmap-root .wm-card-title { font-size: 14px; }
  #worldmap-root .wm-blurb { font-size: 11.5px; }
}
@media (prefers-reduced-motion: reduce) {
  #worldmap-root,
  #worldmap-root *,
  #worldmap-root *::before,
  #worldmap-root *::after { transition-duration: .01ms !important; }
}
`;

const CONTINENTS = [
  { key: 'africa', label: 'Africa' },
  { key: 'north-america', label: 'North America' },
  { key: 'europe', label: 'Europe' }
];

const CONTINENT_ALIASES = {
  africa: 'africa',
  african: 'africa',
  mali: 'africa',
  sudan: 'africa',
  egypt: 'africa',
  'north-america': 'north-america',
  northamerica: 'north-america',
  america: 'north-america',
  americas: 'north-america',
  usa: 'north-america',
  'united-states': 'north-america',
  europe: 'europe',
  european: 'europe',
  britain: 'europe',
  'great-britain': 'europe',
  france: 'europe',
  germany: 'europe',
  asia: 'asia',
  'south-america': 'south-america',
  oceania: 'oceania'
};

const POST_CONTINENTS = {
  mali: 'africa',
  lincoln: 'north-america',
  mud: 'europe',
  cold: 'europe'
};

const ID_CONTINENTS = {
  'mali-1324': 'africa',
  'washington-1865': 'north-america',
  'france-1917': 'europe',
  'berlin-1989': 'europe'
};

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const tag = document.createElement('style');
  tag.id = STYLE_ID;
  tag.textContent = CSS;
  document.head.appendChild(tag);
}

function normalize(value) {
  return String(value == null ? '' : value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function clean(value) {
  return value == null ? '' : String(value).trim();
}

function titleCase(value) {
  return String(value)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function continentKey(chapter) {
  const declared = normalize(chapter.continent || chapter.region);
  if (declared) return CONTINENT_ALIASES[declared] || declared;
  const post = normalize(chapter.post);
  if (post && POST_CONTINENTS[post]) return POST_CONTINENTS[post];
  const id = normalize(chapter.id);
  if (id && ID_CONTINENTS[id]) return ID_CONTINENTS[id];
  const era = normalize(chapter.era);
  if (era && CONTINENT_ALIASES[era]) return CONTINENT_ALIASES[era];
  return 'other';
}

function continentLabel(key, chapter) {
  const known = CONTINENTS.find((item) => item.key === key);
  if (known) return known.label;
  const declared = clean(chapter.continent || chapter.region);
  if (declared) return declared;
  return key === 'other' ? 'Elsewhere' : titleCase(key);
}

function groupChapters(chapters) {
  const buckets = new Map();
  for (const chapter of chapters) {
    const key = continentKey(chapter);
    if (!buckets.has(key)) buckets.set(key, { key, label: continentLabel(key, chapter), chapters: [] });
    buckets.get(key).chapters.push(chapter);
  }
  const groups = [];
  for (const known of CONTINENTS) {
    const bucket = buckets.get(known.key);
    if (bucket) {
      bucket.label = known.label;
      groups.push(bucket);
      buckets.delete(known.key);
    }
  }
  for (const bucket of buckets.values()) groups.push(bucket);
  return groups;
}

function yearOf(chapter) {
  const raw = clean(chapter.year);
  if (!raw) return '';
  const match = raw.match(/\d{3,4}/);
  return match ? match[0] : raw;
}

function coverOf(value) {
  if (typeof value !== 'string') return '';
  const url = value.trim();
  if (!url) return '';
  if (/^(javascript|vbscript|data:text\/html)/i.test(url)) return '';
  return url.replace(/["\\\u0000-\u001f]/g, '');
}

export class WorldMap {
  constructor(options = {}) {
    const opts = options || {};
    this.chapters = Array.isArray(opts.chapters)
      ? opts.chapters.filter((item) => item && typeof item === 'object' && !Array.isArray(item))
      : [];
    this.onSelect = typeof opts.onSelect === 'function' ? opts.onSelect : null;
    this.mount = opts.mount && opts.mount.nodeType === 1 ? opts.mount : document.body;
    this._open = false;
    this._index = 0;
    this._groups = groupChapters(this.chapters);
    this._pages = [];
    this._dots = [];
    this._drag = null;
    this._suppressClick = false;
    this._suppressTimer = 0;
    this._lastFocus = null;
    this._width = 0;
    this._onKeyDown = (event) => this._onKey(event);
    this._onResize = () => this._layout();
    this._onDown = (event) => this._pointerDown(event);
    this._onMove = (event) => this._pointerMove(event);
    this._onUp = (event) => this._pointerUp(event);
    this._onCancel = (event) => this._pointerCancel(event);
    installStyles();
    this._build();
  }

  get isOpen() {
    return this._open;
  }

  get index() {
    return this._index;
  }

  _build() {
    const root = document.createElement('div');
    root.id = 'worldmap-root';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Episode map');
    root.setAttribute('aria-hidden', 'true');
    root.tabIndex = -1;

    const top = document.createElement('header');
    top.className = 'wm-top';

    const brand = document.createElement('div');
    brand.className = 'wm-brand';
    const mark = document.createElement('h1');
    mark.className = 'wm-mark';
    mark.textContent = 'HIS-TREE';
    const sub = document.createElement('p');
    sub.className = 'wm-sub';
    sub.textContent = 'Choose an episode';
    brand.append(mark, sub);

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'wm-close';
    close.setAttribute('aria-label', 'Close episode map');
    close.textContent = '\u00d7';
    close.addEventListener('click', () => this.hide());

    top.append(brand, close);

    const view = document.createElement('div');
    view.className = 'wm-view';
    const track = document.createElement('div');
    track.className = 'wm-track';

    if (this._groups.length) {
      this._groups.forEach((group, position) => {
        const page = document.createElement('section');
        page.className = 'wm-page';
        page.dataset.continent = group.key;
        page.dataset.active = position === 0 ? 'true' : 'false';
        page.setAttribute('aria-label', group.label);

        const head = document.createElement('div');
        head.className = 'wm-head';
        const name = document.createElement('h2');
        name.className = 'wm-name';
        name.textContent = group.label;
        const count = document.createElement('span');
        count.className = 'wm-count';
        count.textContent = group.chapters.length + (group.chapters.length === 1 ? ' episode' : ' episodes');
        head.append(name, count);

        const cards = document.createElement('div');
        cards.className = 'wm-cards';
        for (const chapter of group.chapters) cards.appendChild(this._card(chapter, group));

        page.append(head, cards);
        track.appendChild(page);
        this._pages.push(page);
      });
      view.appendChild(track);
    } else {
      const empty = document.createElement('div');
      empty.className = 'wm-empty';
      empty.textContent = 'No episodes yet';
      view.appendChild(empty);
    }

    const foot = document.createElement('footer');
    foot.className = 'wm-foot';
    const step = document.createElement('p');
    step.className = 'wm-step';
    const hint = document.createElement('p');
    hint.className = 'wm-step is-right';
    hint.textContent = 'Esc to close';

    const dots = document.createElement('div');
    dots.className = 'wm-dots';
    this._groups.forEach((group, position) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'wm-dot-btn';
      dot.setAttribute('aria-label', 'Show ' + group.label);
      dot.addEventListener('click', () => this.goTo(position));
      dots.appendChild(dot);
      this._dots.push(dot);
    });
    this._step = step;
    foot.append(step, dots, hint);
    this._track = track;
    this._view = view;

    root.append(top, view, foot);
    this.mount.appendChild(root);

    this.root = root;
    this._view.addEventListener('pointerdown', this._onDown);
    this._view.addEventListener('pointermove', this._onMove);
    this._view.addEventListener('pointerup', this._onUp);
    this._view.addEventListener('pointercancel', this._onCancel);

    if (typeof ResizeObserver === 'function') {
      this._observer = new ResizeObserver(this._onResize);
      this._observer.observe(view);
    }

    this._sync();
    this._layout();
  }

  _card(chapter, group) {
    const playable = chapter.playable === true;
    const node = document.createElement(playable ? 'button' : 'div');
    node.className = 'wm-card ' + (playable ? 'is-playable' : 'is-locked');

    const title = clean(chapter.title) || 'Untitled episode';
    const place = clean(chapter.place) || clean(chapter.era);
    const blurb = clean(chapter.blurb) || clean(chapter.tagline);
    const year = yearOf(chapter);

    if (playable) {
      node.type = 'button';
      node.setAttribute('aria-label', 'Play ' + title);
    } else {
      node.setAttribute('aria-disabled', 'true');
    }

    const media = document.createElement('div');
    media.className = 'wm-media';
    media.setAttribute('aria-hidden', 'true');
    const cover = coverOf(chapter.card);
    if (cover) media.style.setProperty('--wm-art', 'url("' + cover + '")');
    node.appendChild(media);

    if (year) {
      const badge = document.createElement('span');
      badge.className = 'wm-year';
      badge.textContent = year;
      node.appendChild(badge);
    }

    const body = document.createElement('div');
    body.className = 'wm-body';

    const heading = document.createElement('h3');
    heading.className = 'wm-card-title';
    heading.textContent = title;
    body.appendChild(heading);

    if (place) {
      const line = document.createElement('p');
      line.className = 'wm-place';
      line.textContent = place;
      body.appendChild(line);
    }

    if (blurb) {
      const line = document.createElement('p');
      line.className = 'wm-blurb';
      line.textContent = blurb;
      body.appendChild(line);
    }

    const status = document.createElement('div');
    status.className = 'wm-status';
    const icon = document.createElement('span');
    icon.className = playable ? 'wm-play' : 'wm-lock-dot';
    icon.setAttribute('aria-hidden', 'true');
    if (playable) icon.textContent = '\u25b6';
    const label = document.createElement('span');
    label.textContent = playable ? 'Play' : 'Coming soon';
    status.append(icon, label);
    body.appendChild(status);

    node.appendChild(body);

    if (playable) {
      node.addEventListener('click', () => {
        if (this._suppressClick) return;
        this._select(chapter);
      });
    }

    return node;
  }

  _select(chapter) {
    try {
      if (this.onSelect) this.onSelect(chapter);
    } finally {
      this.hide();
    }
  }

  _sync() {
    this._pages.forEach((page, position) => {
      const active = position === this._index;
      page.dataset.active = active ? 'true' : 'false';
      page.setAttribute('aria-hidden', active ? 'false' : 'true');
      page.inert = !active;
    });
    this._dots.forEach((dot, position) => {
      if (position === this._index) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    if (this._step) {
      const total = Math.max(1, this._pages.length);
      this._step.textContent = String(this._index + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
    }
  }

  _offset() {
    return -this._index * (this._view ? this._view.clientWidth : 0);
  }

  _translate(value) {
    if (!this._track) return;
    const x = typeof value === 'number' ? value : this._offset();
    this._track.style.transform = 'translate3d(' + x + 'px, 0, 0)';
  }

  _layout() {
    if (!this._view || !this._track || this._drag) return;
    this._width = this._view.clientWidth;
    this._track.classList.add('is-dragging');
    this._translate();
    void this._track.offsetWidth;
    this._track.classList.remove('is-dragging');
  }

  _pointerDown(event) {
    if (!this._open || this._pages.length < 2 || this._drag) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    this._drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastT: performance.now(),
      dx: 0,
      vx: 0,
      axis: null
    };
  }

  _pointerMove(event) {
    const drag = this._drag;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (drag.axis === 'y') {
        this._drag = null;
        return;
      }
      this._track.classList.add('is-dragging');
      try {
        this._view.setPointerCapture(event.pointerId);
      } catch (error) {}
    }
    const now = performance.now();
    const gap = Math.max(1, now - drag.lastT);
    drag.vx = (event.clientX - drag.lastX) / gap;
    drag.lastX = event.clientX;
    drag.lastT = now;
    drag.dx = dx;
    const width = this._view.clientWidth || this._width || 1;
    const edge = (this._index === 0 && dx > 0) || (this._index === this._pages.length - 1 && dx < 0);
    this._translate(-this._index * width + (edge ? dx * 0.28 : dx));
    if (Math.abs(dx) > 6) this._suppressClick = true;
  }

  _pointerUp(event) {
    const drag = this._drag;
    if (!drag || drag.id !== event.pointerId) return;
    this._drag = null;
    if (drag.axis !== 'x') return;
    this._track.classList.remove('is-dragging');
    const width = this._view.clientWidth || this._width || 1;
    const travelled = Math.abs(drag.dx) > Math.max(42, width * 0.16);
    const flung = Math.abs(drag.vx) > 0.45 && Math.abs(drag.dx) > 16;
    let next = this._index;
    if (travelled || flung) next = drag.dx < 0 ? this._index + 1 : this._index - 1;
    this._suppressClick = true;
    window.clearTimeout(this._suppressTimer);
    this._suppressTimer = window.setTimeout(() => {
      this._suppressClick = false;
    }, 90);
    this.goTo(next);
  }

  _pointerCancel(event) {
    const drag = this._drag;
    if (!drag || drag.id !== event.pointerId) return;
    this._drag = null;
    this._suppressClick = false;
    if (this._track) this._track.classList.remove('is-dragging');
    this.goTo(this._index, false);
  }

  _onKey(event) {
    if (!this._open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.hide();
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.goTo(this._index + 1);
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.goTo(this._index - 1);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      this.goTo(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      this.goTo(this._pages.length - 1);
      return;
    }
    if (event.key === 'Tab') this._trapFocus(event);
  }

  _trapFocus(event) {
    if (!this.root) return;
    const nodes = Array.from(this.root.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])'))
      .filter((node) => !node.closest('.wm-page[aria-hidden="true"]'))
      .filter((node) => !node.disabled && node.getAttribute('aria-disabled') !== 'true');
    if (!nodes.length) {
      event.preventDefault();
      this.root.focus({ preventScroll: true });
      return;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;
    if (!this.root.contains(active)) {
      event.preventDefault();
      first.focus();
      return;
    }
    if (event.shiftKey && (active === first || active === this.root)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  goTo(index, animate = true) {
    if (!this.root || !this._track) return;
    const max = Math.max(0, this._pages.length - 1);
    const target = Number.isFinite(index) ? index : this._index;
    this._index = Math.max(0, Math.min(max, target));
    this._track.classList.toggle('is-dragging', !animate);
    this._translate();
    if (!animate) {
      void this._track.offsetWidth;
      this._track.classList.remove('is-dragging');
    }
    this._sync();
  }

  show() {
    if (!this.root || this._open) return;
    this._open = true;
    this._lastFocus = document.activeElement;
    document.body.classList.add(BODY_CLASS);
    this.root.setAttribute('aria-hidden', 'false');
    this.root.classList.add('wm-visible');
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('resize', this._onResize);
    this._layout();
    this.root.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      if (!this._open) return;
      this._layout();
    });
  }

  hide() {
    if (!this._open || !this.root) return;
    this._open = false;
    this._drag = null;
    if (this._track) this._track.classList.remove('is-dragging');
    window.clearTimeout(this._suppressTimer);
    this._suppressClick = false;
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('resize', this._onResize);
    document.body.classList.remove(BODY_CLASS);
    this.root.classList.remove('wm-visible');
    const last = this._lastFocus;
    this._lastFocus = null;
    if (last && last !== document.body && typeof last.focus === 'function' && document.contains(last)) {
      try {
        last.focus({ preventScroll: true });
      } catch (error) {}
    }
    this.root.setAttribute('aria-hidden', 'true');
  }

  destroy() {
    if (!this.root) return;
    this.hide();
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    this._view.removeEventListener('pointerdown', this._onDown);
    this._view.removeEventListener('pointermove', this._onMove);
    this._view.removeEventListener('pointerup', this._onUp);
    this._view.removeEventListener('pointercancel', this._onCancel);
    this.root.remove();
    document.body.classList.remove(BODY_CLASS);
    this.root = null;
    this._track = null;
    this._view = null;
    this._pages = [];
    this._dots = [];
    this._groups = [];
    this._open = false;
  }
}
