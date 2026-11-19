const STYLE_ID = 'avatarpicker-styles';
const BODY_CLASS = 'avatarpicker-open';

const CSS = `
#avatarpicker-root {
  --ap-ink: var(--ink, #0b0805);
  --ap-sand: var(--sand, #e8d3ae);
  --ap-ochre: var(--ochre, #d9a441);
  --ap-line: rgba(217, 164, 65, .22);
  --ap-hair: rgba(232, 211, 174, .11);
  position: fixed;
  inset: 0;
  z-index: 62;
  display: flex;
  flex-direction: column;
  padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
  color: var(--ap-sand);
  background:
    radial-gradient(86% 60% at 22% 0%, rgba(217, 164, 65, .1), rgba(217, 164, 65, 0) 60%),
    radial-gradient(130% 110% at 50% 118%, #191108 0%, #0b0805 62%, #050402 100%);
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
#avatarpicker-root.ap-visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition: opacity .28s ease, visibility 0s linear 0s;
}
body.avatarpicker-open { overflow: hidden; }
#avatarpicker-root *,
#avatarpicker-root *::before,
#avatarpicker-root *::after { box-sizing: border-box; }
#avatarpicker-root .ap-top {
  flex: 0 0 auto;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: clamp(12px, 2.4vh, 24px) clamp(16px, 3vw, 40px) clamp(8px, 1.4vh, 14px);
}
#avatarpicker-root .ap-heading { min-width: 0; }
#avatarpicker-root .ap-kicker {
  margin: 0;
  font-size: 9px;
  letter-spacing: .36em;
  text-transform: uppercase;
  color: var(--ap-ochre);
}
#avatarpicker-root .ap-title {
  margin: 7px 0 0;
  font-size: clamp(17px, 2.5vw, 26px);
  font-weight: 400;
  line-height: 1.1;
  letter-spacing: .1em;
  text-transform: uppercase;
}
#avatarpicker-root .ap-close {
  flex: 0 0 auto;
  margin-left: auto;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--ap-line);
  background: transparent;
  color: var(--ap-sand);
  font-family: inherit;
  font-size: 17px;
  line-height: 1;
  cursor: pointer;
  transition: border-color .2s ease, color .2s ease;
}
#avatarpicker-root .ap-close:hover { border-color: var(--ap-ochre); color: var(--ap-ochre); }
#avatarpicker-root .ap-close:focus-visible,
#avatarpicker-root .ap-card:focus-visible {
  outline: 1px solid var(--ap-ochre);
  outline-offset: 2px;
}
#avatarpicker-root .ap-body {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, .92fr) minmax(0, 1.08fr);
  gap: clamp(10px, 1.8vw, 22px);
  padding: 0 clamp(16px, 3vw, 40px) clamp(10px, 1.6vh, 18px);
}
#avatarpicker-root .ap-stage {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--ap-line);
  background: radial-gradient(64% 58% at 50% 42%, #1e150b 0%, #120c06 56%, #0a0704 100%);
  touch-action: none;
  overscroll-behavior: contain;
}
#avatarpicker-root .ap-stage-frame {
  position: absolute;
  inset: 7px;
  z-index: 3;
  border: 1px solid rgba(232, 211, 174, .05);
  pointer-events: none;
}
#avatarpicker-root .ap-canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}
#avatarpicker-root .ap-placeholder {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(10px, 1.8vh, 16px);
  pointer-events: none;
  transition: opacity .45s ease, visibility .45s ease;
}
#avatarpicker-root .ap-stage.is-ready .ap-placeholder { opacity: 0; visibility: hidden; }
#avatarpicker-root .ap-ring {
  position: relative;
  width: clamp(66px, 22vh, 112px);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border: 1px solid rgba(217, 164, 65, .26);
  border-radius: 50%;
}
#avatarpicker-root .ap-ring::before {
  content: '';
  position: absolute;
  inset: 13%;
  border: 1px dashed rgba(232, 211, 174, .17);
  border-radius: 50%;
  animation: ap-turn 26s linear infinite;
}
#avatarpicker-root .ap-ring::after {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(217, 164, 65, .55);
}
#avatarpicker-root .ap-loading {
  margin: 0;
  font-size: 8.5px;
  letter-spacing: .34em;
  text-transform: uppercase;
  opacity: .44;
}
@keyframes ap-turn { to { transform: rotate(360deg); } }
#avatarpicker-root .ap-tag {
  position: absolute;
  z-index: 2;
  font-size: 7.5px;
  letter-spacing: .3em;
  text-transform: uppercase;
  opacity: .4;
  pointer-events: none;
  white-space: nowrap;
}
#avatarpicker-root .ap-tag.is-left { top: 11px; left: 13px; }
#avatarpicker-root .ap-tag.is-right { top: 11px; right: 13px; }
#avatarpicker-root .ap-caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  padding: clamp(30px, 6vh, 56px) clamp(12px, 1.8vw, 18px) clamp(11px, 1.8vh, 15px);
  background: linear-gradient(180deg, rgba(9, 6, 3, 0) 0%, rgba(9, 6, 3, .82) 58%, rgba(9, 6, 3, .93) 100%);
  pointer-events: none;
}
#avatarpicker-root .ap-name {
  margin: 0;
  font-size: clamp(14px, 1.9vw, 20px);
  font-weight: 400;
  line-height: 1.15;
  letter-spacing: .1em;
  text-transform: uppercase;
  overflow-wrap: break-word;
}
#avatarpicker-root .ap-era {
  margin: 5px 0 0;
  font-size: 8.5px;
  letter-spacing: .26em;
  text-transform: uppercase;
  color: var(--ap-ochre);
  opacity: .92;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
#avatarpicker-root .ap-blurb {
  margin: 7px 0 0;
  max-width: 46ch;
  font-size: 11.5px;
  line-height: 1.45;
  font-style: italic;
  opacity: .64;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
#avatarpicker-root .ap-roster {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
#avatarpicker-root .ap-roster-head {
  flex: 0 0 auto;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: clamp(6px, 1vh, 9px);
  border-bottom: 1px solid var(--ap-hair);
}
#avatarpicker-root .ap-roster-title {
  margin: 0;
  font-size: 9.5px;
  letter-spacing: .3em;
  text-transform: uppercase;
  color: var(--ap-ochre);
  white-space: nowrap;
}
#avatarpicker-root .ap-roster-count {
  margin: 0;
  font-size: 8px;
  letter-spacing: .2em;
  text-transform: uppercase;
  opacity: .42;
  white-space: nowrap;
}
#avatarpicker-root .ap-grid {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 96px), 1fr));
  align-content: start;
  gap: clamp(7px, 1.1vw, 11px);
  padding: clamp(8px, 1.2vh, 12px) 2px 4px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(217, 164, 65, .3) transparent;
}
#avatarpicker-root .ap-grid::-webkit-scrollbar { width: 5px; }
#avatarpicker-root .ap-grid::-webkit-scrollbar-thumb { background: rgba(217, 164, 65, .3); }
#avatarpicker-root .ap-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin: 0;
  padding: 5px;
  border: 1px solid rgba(217, 164, 65, .24);
  border-radius: 1px;
  background: rgba(22, 14, 8, .6);
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  text-align: left;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  transition: border-color .2s ease, background-color .2s ease;
}
#avatarpicker-root .ap-card:hover { border-color: rgba(217, 164, 65, .5); }
#avatarpicker-root .ap-card[aria-selected="true"] {
  border-color: var(--ap-ochre);
  background: rgba(217, 164, 65, .09);
}
#avatarpicker-root .ap-card.is-locked { cursor: default; }
#avatarpicker-root .ap-card.is-locked:hover { border-color: rgba(217, 164, 65, .24); }
#avatarpicker-root .ap-thumb {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background: linear-gradient(155deg, #3b2a18 0%, #1b1209 62%, #0d0805 100%);
}
#avatarpicker-root .ap-thumb img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
#avatarpicker-root .ap-initial {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 20px;
  letter-spacing: .06em;
  color: rgba(232, 211, 174, .28);
}
#avatarpicker-root .ap-card.is-locked .ap-thumb img { filter: grayscale(.72) brightness(.58); }
#avatarpicker-root .ap-lock {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(7, 5, 3, .56);
  color: rgba(232, 211, 174, .74);
  font-size: 7.5px;
  letter-spacing: .26em;
  text-transform: uppercase;
}
#avatarpicker-root .ap-card[aria-selected="true"] .ap-thumb::after {
  content: '';
  position: absolute;
  inset: 3px;
  border: 1px solid rgba(217, 164, 65, .78);
  pointer-events: none;
}
#avatarpicker-root .ap-card-name {
  margin: 6px 1px 0;
  font-size: 11px;
  font-weight: 400;
  line-height: 1.25;
  letter-spacing: .02em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: break-word;
}
#avatarpicker-root .ap-card-era {
  margin: 3px 1px 1px;
  font-size: 8px;
  line-height: 1.3;
  letter-spacing: .1em;
  text-transform: uppercase;
  opacity: .48;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: break-word;
}
#avatarpicker-root .ap-cta {
  position: absolute;
  right: clamp(10px, 1.6vw, 18px);
  bottom: clamp(10px, 1.6vw, 18px);
  z-index: 4;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 9px 16px 9px 12px;
  border: 1px solid var(--ap-ochre);
  background: linear-gradient(180deg, rgba(217, 164, 65, .96), rgba(184, 133, 46, .96));
  color: #1b1105;
  font-family: inherit;
  font-size: 10px;
  letter-spacing: .22em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(0, 0, 0, .45);
  transition: transform .16s ease, box-shadow .16s ease, filter .16s ease;
}
#avatarpicker-root .ap-cta:hover { transform: translateY(-1px); filter: brightness(1.06); }
#avatarpicker-root .ap-cta:active { transform: translateY(0); }
#avatarpicker-root .ap-cta-key {
  padding: 3px 7px;
  border: 1px solid rgba(27, 17, 5, .45);
  font-size: 8.5px;
  letter-spacing: .14em;
}
#avatarpicker-root .ap-cta-label { font-weight: 500; }
#avatarpicker-root .ap-hint {
  flex: 0 0 auto;
  margin: 6px 0 0;
  font-size: 8px;
  letter-spacing: .2em;
  text-transform: uppercase;
  opacity: .32;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
}
#avatarpicker-root .ap-empty {
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 10px;
  letter-spacing: .3em;
  text-transform: uppercase;
  opacity: .5;
}
@media (orientation: landscape) and (max-height: 520px) {
  #avatarpicker-root .ap-top { padding-top: 8px; gap: 10px; }
  #avatarpicker-root .ap-title { font-size: 15px; margin-top: 5px; }
  #avatarpicker-root .ap-kicker { font-size: 8px; }
  #avatarpicker-root .ap-close { width: 28px; height: 28px; font-size: 15px; }
  #avatarpicker-root .ap-body { gap: 10px; padding-bottom: calc(6px + env(safe-area-inset-bottom, 0px)); }
  #avatarpicker-root .ap-tag.is-right { display: none; }
  #avatarpicker-root .ap-ring { width: 78px; }
  #avatarpicker-root .ap-caption { padding-top: 24px; padding-bottom: 9px; }
  #avatarpicker-root .ap-name { font-size: 13px; }
  #avatarpicker-root .ap-blurb { font-size: 10.5px; margin-top: 5px; -webkit-line-clamp: 1; }
  #avatarpicker-root .ap-grid { grid-template-columns: repeat(auto-fill, minmax(min(100%, 78px), 1fr)); gap: 7px; padding-top: 7px; }
  #avatarpicker-root .ap-card-name { font-size: 10px; }
  #avatarpicker-root .ap-cta {
  position: absolute;
  right: clamp(10px, 1.6vw, 18px);
  bottom: clamp(10px, 1.6vw, 18px);
  z-index: 4;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 9px 16px 9px 12px;
  border: 1px solid var(--ap-ochre);
  background: linear-gradient(180deg, rgba(217, 164, 65, .96), rgba(184, 133, 46, .96));
  color: #1b1105;
  font-family: inherit;
  font-size: 10px;
  letter-spacing: .22em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(0, 0, 0, .45);
  transition: transform .16s ease, box-shadow .16s ease, filter .16s ease;
}
#avatarpicker-root .ap-cta:hover { transform: translateY(-1px); filter: brightness(1.06); }
#avatarpicker-root .ap-cta:active { transform: translateY(0); }
#avatarpicker-root .ap-cta-key {
  padding: 3px 7px;
  border: 1px solid rgba(27, 17, 5, .45);
  font-size: 8.5px;
  letter-spacing: .14em;
}
#avatarpicker-root .ap-cta-label { font-weight: 500; }
#avatarpicker-root .ap-hint { display: none; }
}
@media (max-width: 720px) {
  #avatarpicker-root .ap-top { padding-top: 14px; }
  #avatarpicker-root .ap-title { font-size: 16px; letter-spacing: .08em; }
  #avatarpicker-root .ap-body {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 33%) minmax(0, 1fr);
    gap: 10px;
    padding: 0 14px calc(10px + env(safe-area-inset-bottom, 0px));
  }
  #avatarpicker-root .ap-tag.is-right { display: none; }
  #avatarpicker-root .ap-grid { grid-template-columns: repeat(auto-fill, minmax(min(100%, 94px), 1fr)); }
  #avatarpicker-root .ap-cta {
  position: absolute;
  right: clamp(10px, 1.6vw, 18px);
  bottom: clamp(10px, 1.6vw, 18px);
  z-index: 4;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 9px 16px 9px 12px;
  border: 1px solid var(--ap-ochre);
  background: linear-gradient(180deg, rgba(217, 164, 65, .96), rgba(184, 133, 46, .96));
  color: #1b1105;
  font-family: inherit;
  font-size: 10px;
  letter-spacing: .22em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(0, 0, 0, .45);
  transition: transform .16s ease, box-shadow .16s ease, filter .16s ease;
}
#avatarpicker-root .ap-cta:hover { transform: translateY(-1px); filter: brightness(1.06); }
#avatarpicker-root .ap-cta:active { transform: translateY(0); }
#avatarpicker-root .ap-cta-key {
  padding: 3px 7px;
  border: 1px solid rgba(27, 17, 5, .45);
  font-size: 8.5px;
  letter-spacing: .14em;
}
#avatarpicker-root .ap-cta-label { font-weight: 500; }
#avatarpicker-root .ap-hint { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  #avatarpicker-root,
  #avatarpicker-root *,
  #avatarpicker-root *::before,
  #avatarpicker-root *::after { transition-duration: .01ms !important; animation: none !important; }
}
`;

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const tag = document.createElement('style');
  tag.id = STYLE_ID;
  tag.textContent = CSS;
  document.head.appendChild(tag);
}

function clean(value) {
  return value == null ? '' : String(value).trim();
}

function initialOf(name) {
  const match = clean(name).match(/[A-Za-z0-9\u00c0-\u024f]/);
  return match ? match[0].toUpperCase() : '?';
}

export class AvatarPicker {
  constructor(options = {}) {
    const opts = options || {};
    this.avatars = Array.isArray(opts.avatars)
      ? opts.avatars.filter((item) => item && typeof item === 'object' && !Array.isArray(item))
      : [];
    this.onSelect = typeof opts.onSelect === 'function' ? opts.onSelect : null;
    this.onHover = typeof opts.onHover === 'function' ? opts.onHover : null;
    this.mount = opts.mount && opts.mount.nodeType === 1 ? opts.mount : document.body;
    this._open = false;
    this._active = -1;
    this._selectedId = null;
    this._cards = [];
    this._ready = false;
    this._lastFocus = null;
    this._onKeyDown = (event) => this._onKey(event);
    this._onPreviewReady = () => this._setReady(true);
    this._checkPreview = () => this._detectPreview();
    installStyles();
    this._build();
    this._active = this._firstSelectable();
    if (this._active >= 0) {
      this._selectedId = clean(this.avatars[this._active].id) || null;
      this._paint();
    }
  }

  get isOpen() {
    return this._open;
  }

  get selectedId() {
    return this._selectedId;
  }

  _build() {
    const root = document.createElement('div');
    root.id = 'avatarpicker-root';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Choose your witness');
    root.tabIndex = -1;

    const top = document.createElement('header');
    top.className = 'ap-top';
    const heading = document.createElement('div');
    heading.className = 'ap-heading';
    const kicker = document.createElement('p');
    kicker.className = 'ap-kicker';
    kicker.textContent = 'HIS-TREE';
    const title = document.createElement('h1');
    title.className = 'ap-title';
    title.textContent = 'Choose your witness';
    heading.append(kicker, title);

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'ap-close';
    close.setAttribute('aria-label', 'Close witness picker');
    close.textContent = '\u00d7';
    close.addEventListener('click', () => this.hide());

    top.append(heading, close);

    const body = document.createElement('div');
    body.className = 'ap-body';

    const stage = document.createElement('div');
    stage.className = 'ap-stage';
    stage.setAttribute('aria-busy', 'true');

    const canvas = document.createElement('canvas');
    canvas.id = 'avatar-preview';
    canvas.className = 'ap-canvas';
    canvas.setAttribute('aria-hidden', 'true');

    const placeholder = document.createElement('div');
    placeholder.className = 'ap-placeholder';
    placeholder.setAttribute('aria-hidden', 'true');
    const ring = document.createElement('div');
    ring.className = 'ap-ring';
    const loading = document.createElement('p');
    loading.className = 'ap-loading';
    loading.textContent = 'Loading witness';
    placeholder.append(ring, loading);

    const tagLeft = document.createElement('span');
    tagLeft.className = 'ap-tag is-left';
    tagLeft.textContent = 'Witness preview';
    const tagRight = document.createElement('span');
    tagRight.className = 'ap-tag is-right';
    tagRight.textContent = 'Drag to inspect';

    const frame = document.createElement('div');
    frame.className = 'ap-stage-frame';

    const caption = document.createElement('div');
    caption.className = 'ap-caption';
    const name = document.createElement('h2');
    name.className = 'ap-name';
    name.setAttribute('aria-live', 'polite');
    const era = document.createElement('p');
    era.className = 'ap-era';
    const blurb = document.createElement('p');
    blurb.className = 'ap-blurb';
    caption.append(name, era, blurb);

    const cta = document.createElement('button');
    cta.type = 'button';
    cta.className = 'ap-cta';
    cta.innerHTML = '<span class="ap-cta-key">ENTER</span><span class="ap-cta-label">Begin the chapter</span>';
    cta.addEventListener('click', (event) => {
      event.stopPropagation();
      if (this._active >= 0) this._confirm(this._active);
    });

    stage.append(canvas, placeholder, tagLeft, tagRight, caption, cta, frame);
    this._cta = cta;

    const roster = document.createElement('div');
    roster.className = 'ap-roster';
    const head = document.createElement('div');
    head.className = 'ap-roster-head';
    const rosterTitle = document.createElement('h2');
    rosterTitle.className = 'ap-roster-title';
    rosterTitle.textContent = 'The witness';
    const rosterCount = document.createElement('p');
    rosterCount.className = 'ap-roster-count';
    head.append(rosterTitle, rosterCount);

    const grid = document.createElement('div');
    grid.className = 'ap-grid';
    grid.setAttribute('role', 'listbox');
    grid.setAttribute('aria-label', 'Available witnesses');

    this._cards = this.avatars.map((avatar, index) => this._createCard(avatar, index));
    if (this._cards.length) {
      for (const card of this._cards) grid.appendChild(card);
    } else {
      const empty = document.createElement('div');
      empty.className = 'ap-empty';
      empty.textContent = 'No witnesses';
      grid.appendChild(empty);
    }

    const hint = document.createElement('p');
    hint.className = 'ap-hint';
    hint.textContent = 'Arrows move \u00b7 Enter confirms \u00b7 Esc closes';

    roster.append(head, grid, hint);
    body.append(stage, roster);
    root.append(top, body);
    this.mount.appendChild(root);

    const sealed = this.avatars.filter((avatar) => avatar.locked === true).length;
    const total = this.avatars.length;
    rosterCount.textContent = sealed
      ? total + ' listed \u00b7 ' + sealed + ' sealed'
      : total + (total === 1 ? ' witness' : ' witnesses');

    this.root = root;
    this._canvas = canvas;
    this._stage = stage;
    this._captionName = name;
    this._captionEra = era;
    this._captionBlurb = blurb;

    if (typeof MutationObserver === 'function') {
      this._observer = new MutationObserver(this._checkPreview);
      this._observer.observe(canvas, {
        attributes: true,
        attributeFilter: ['width', 'height', 'data-ready', 'data-preview-ready', 'data-avatar-ready']
      });
    }
    canvas.addEventListener('avatarpreview:ready', this._onPreviewReady);
  }

  _createCard(avatar, index) {
    const locked = avatar.locked === true;
    const card = document.createElement(locked ? 'div' : 'button');
    card.className = 'ap-card' + (locked ? ' is-locked' : '');
    card.setAttribute('role', 'option');
    card.setAttribute('aria-selected', 'false');
    card.dataset.index = String(index);

    if (locked) {
      card.setAttribute('aria-disabled', 'true');
    } else {
      card.type = 'button';
      card.tabIndex = -1;
      card.addEventListener('click', () => this._setActive(index, false));
      card.addEventListener('focus', () => this._hover(index));
      card.addEventListener('pointerenter', () => this._hover(index));
    }

    const thumb = document.createElement('div');
    thumb.className = 'ap-thumb';

    const initial = document.createElement('span');
    initial.className = 'ap-initial';
    initial.setAttribute('aria-hidden', 'true');
    initial.textContent = initialOf(avatar.name);
    thumb.appendChild(initial);

    const src = clean(avatar.thumb);
    if (src) {
      const image = document.createElement('img');
      image.src = src;
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.addEventListener('error', () => image.remove());
      thumb.appendChild(image);
    }

    if (locked) {
      const lock = document.createElement('span');
      lock.className = 'ap-lock';
      lock.textContent = 'Sealed';
      thumb.appendChild(lock);
    }

    const name = document.createElement('p');
    name.className = 'ap-card-name';
    name.textContent = clean(avatar.name) || 'Unknown witness';
    const era = document.createElement('p');
    era.className = 'ap-card-era';
    era.textContent = clean(avatar.era) || clean(avatar.role) || 'Undated';

    card.append(thumb, name, era);
    return card;
  }

  _firstSelectable() {
    for (let i = 0; i < this.avatars.length; i += 1) {
      if (this.avatars[i].locked !== true) return i;
    }
    return -1;
  }

  _hover(index) {
    const avatar = this.avatars[index];
    if (!avatar || !this.onHover) return;
    this.onHover(clean(avatar.id));
  }

  _setActive(index, focus) {
    if (index < 0 || index >= this.avatars.length) return;
    if (this._active === index) {
      if (focus && this._cards[index]) this._cards[index].focus();
      return;
    }
    this._active = index;
    this._paint();
    if (focus && this._cards[index]) this._cards[index].focus({ preventScroll: false });
    this._hover(index);
  }

  _paint() {
    this._cards.forEach((card, index) => {
      const active = index === this._active;
      card.setAttribute('aria-selected', active ? 'true' : 'false');
      if (!card.classList.contains('is-locked')) card.tabIndex = active ? 0 : -1;
    });
    const avatar = this.avatars[this._active];
    if (!avatar) return;
    this._captionName.textContent = clean(avatar.name) || 'Unknown witness';
    this._captionEra.textContent = clean(avatar.era) || clean(avatar.role) || 'Undated';
    this._captionBlurb.textContent = clean(avatar.blurb) || '';
    this._captionBlurb.style.display = clean(avatar.blurb) ? '' : 'none';
    if (this._open && this._cards[this._active]) {
      try {
        this._cards[this._active].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      } catch (error) {}
    }
  }

  _confirm(index) {
    const avatar = this.avatars[index];
    if (!avatar || avatar.locked === true) return;
    this._selectedId = clean(avatar.id) || null;
    if (this.onSelect) this.onSelect(avatar);
  }

  _columns() {
    if (!this._cards.length) return 1;
    const top = this._cards[0].offsetTop;
    let count = 0;
    for (const card of this._cards) {
      if (Math.abs(card.offsetTop - top) < 2) count += 1;
      else break;
    }
    return Math.max(1, count);
  }

  _step(amount) {
    const total = this.avatars.length;
    if (!total) return;
    let next = this._active < 0 ? 0 : this._active;
    for (let i = 0; i < total; i += 1) {
      next = (next + amount) % total;
      if (next < 0) next += total;
      if (this.avatars[next].locked !== true) {
        this._setActive(next, true);
        return;
      }
    }
  }

  _onKey(event) {
    if (!this._open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.hide();
      return;
    }
    if (event.key === 'Tab') {
      this._trapFocus(event);
      return;
    }
    if (event.target && event.target.closest && event.target.closest('.ap-close')) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      if (this._active >= 0) {
        event.preventDefault();
        this._confirm(this._active);
      }
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this._step(1);
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this._step(-1);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this._step(this._columns());
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this._step(-this._columns());
    }
  }

  _trapFocus(event) {
    if (!this.root) return;
    const nodes = Array.from(this.root.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter((node) => !node.closest('.ap-card.is-locked'));
    if (!nodes.length) {
      event.preventDefault();
      this.root.focus({ preventScroll: true });
      return;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const current = document.activeElement;
    if (!this.root.contains(current)) {
      event.preventDefault();
      first.focus();
      return;
    }
    if (event.shiftKey && current === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  }

  _detectPreview() {
    if (this._ready || !this._canvas) return;
    const canvas = this._canvas;
    const declared = canvas.dataset.ready === 'true'
      || canvas.dataset.previewReady === 'true'
      || canvas.dataset.avatarReady === 'true';
    const sized = canvas.width > 1
      && canvas.height > 1
      && !(canvas.width === 300 && canvas.height === 150);
    if (declared || sized) this._setReady(true);
  }

  _setReady(value) {
    const ready = value !== false;
    this._ready = ready;
    if (!this._stage) return;
    this._stage.classList.toggle('is-ready', ready);
    this._stage.setAttribute('aria-busy', ready ? 'false' : 'true');
    if (ready) {
      if (this._poll) {
        window.clearInterval(this._poll);
        this._poll = 0;
      }
      if (this._observer) {
        this._observer.disconnect();
        this._observer = null;
      }
    }
  }

  setPreviewReady(value = true) {
    this._setReady(value);
  }

  show() {
    if (!this.root || this._open) return;
    this._open = true;
    this._lastFocus = document.activeElement;
    document.body.classList.add(BODY_CLASS);
    this.root.setAttribute('aria-hidden', 'false');
    this.root.classList.add('ap-visible');
    window.addEventListener('keydown', this._onKeyDown);
    if (this._active < 0) this._active = this._firstSelectable();
    if (this._active >= 0) {
      const avatar = this.avatars[this._active];
      if (!this._selectedId) this._selectedId = clean(avatar.id) || null;
      this._paint();
      const card = this._cards[this._active];
      if (card && !card.classList.contains('is-locked')) card.focus({ preventScroll: true });
    } else {
      this.root.focus({ preventScroll: true });
    }
    this._detectPreview();
    if (!this._ready) {
      if (this._poll) window.clearInterval(this._poll);
      this._poll = window.setInterval(this._checkPreview, 500);
    }
  }

  hide() {
    if (!this._open || !this.root) return;
    this._open = false;
    window.removeEventListener('keydown', this._onKeyDown);
    if (this._poll) {
      window.clearInterval(this._poll);
      this._poll = 0;
    }
    document.body.classList.remove(BODY_CLASS);
    this.root.classList.remove('ap-visible');
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
    if (this._canvas) this._canvas.removeEventListener('avatarpreview:ready', this._onPreviewReady);
    if (this._poll) {
      window.clearInterval(this._poll);
      this._poll = 0;
    }
    this.root.remove();
    document.body.classList.remove(BODY_CLASS);
    this.root = null;
    this._canvas = null;
    this._stage = null;
    this._cards = [];
    this._open = false;
  }
}
