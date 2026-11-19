const CSS = `
#ui-root { position:fixed; inset:0; pointer-events:none; z-index:20; font-family:Georgia,'Times New Roman',serif; color:#e8d3ae; }
#ui-root .panel { pointer-events:auto; background:linear-gradient(180deg, rgba(18,12,6,.94), rgba(10,7,4,.96));
  border:1px solid rgba(217,164,65,.35); box-shadow:0 18px 60px rgba(0,0,0,.6); }
#hintbar { position:absolute; left:50%; bottom:12%; transform:translateX(-50%); padding:8px 18px;
  background:rgba(14,9,4,.78); border:1px solid rgba(217,164,65,.4); font-size:12px; letter-spacing:.14em;
  text-transform:uppercase; opacity:0; transition:opacity .2s; }
#dialog { position:absolute; left:50%; bottom:6%; transform:translateX(-50%); width:min(760px,92vw);
  padding:22px 26px 20px; display:none; }
#dialog .who { font-size:11px; letter-spacing:.34em; text-transform:uppercase; color:#d9a441; margin-bottom:10px; }
#dialog .line { font-size:16px; line-height:1.62; min-height:52px; }
#dialog .more { margin-top:12px; font-size:11px; letter-spacing:.2em; opacity:.55; text-align:right; }
#choice { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:min(680px,92vw);
  padding:26px 28px; display:none; }
#choice .prompt { font-size:16px; line-height:1.6; margin-bottom:18px; }
#choice button { display:block; width:100%; text-align:left; margin:8px 0; padding:13px 16px;
  background:rgba(217,164,65,.06); border:1px solid rgba(217,164,65,.35); color:#e8d3ae;
  font-family:inherit; font-size:14px; line-height:1.45; cursor:pointer; transition:.18s; }
#choice button:hover { background:rgba(217,164,65,.18); border-color:#d9a441; }
#choice button b { color:#d9a441; margin-right:10px; }
#ask { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:min(620px,92vw);
  padding:22px 24px; display:none; }
#ask h3 { font-size:11px; letter-spacing:.34em; text-transform:uppercase; color:#d9a441; margin-bottom:14px; }
#ask button { display:block; width:100%; text-align:left; margin:7px 0; padding:11px 14px;
  background:rgba(217,164,65,.06); border:1px solid rgba(217,164,65,.32); color:#e8d3ae;
  font-family:inherit; font-size:13.5px; line-height:1.45; cursor:pointer; transition:.16s; }
#ask button:hover { background:rgba(217,164,65,.16); border-color:#d9a441; }
#ask .close { margin-top:14px; text-align:center; font-size:10px; letter-spacing:.24em; text-transform:uppercase; }
#hud-fight { position:absolute; left:22px; bottom:44px; display:none; }
#hud-fight .bar { width:168px; height:7px; border:1px solid rgba(232,211,174,.4); background:rgba(10,7,4,.7); }
#hud-fight .fill { height:100%; width:100%; background:#8c3b32; transition:width .2s; }
#hud-fight .wpn { font-size:10.5px; letter-spacing:.2em; text-transform:uppercase; color:#d9a441; margin-top:6px; }
#hud-fight .wpn span { color:#8f929c; letter-spacing:.12em; }
#hud-powers { position:absolute; right:22px; bottom:44px; display:none; text-align:right; }
#hud-powers .row { margin-top:5px; font-size:10.5px; letter-spacing:.2em; text-transform:uppercase; color:#cfe3f2; opacity:.85; }
#hud-powers .row b { color:#9fd0ff; font-weight:400; margin-right:8px; }
#hurt-flash { position:absolute; inset:0; background:radial-gradient(circle at 50% 50%, rgba(120,20,10,0) 45%, rgba(120,20,10,.55) 100%);
  opacity:0; transition:opacity .28s; }
#journal { position:absolute; right:3%; top:6%; width:min(440px,92vw); max-height:84vh; padding:22px 24px;
  display:none; overflow:auto; }
#journal h3 { font-size:12px; letter-spacing:.34em; text-transform:uppercase; color:#d9a441; margin-bottom:14px; }
#journal .entry { border-top:1px solid rgba(232,211,174,.16); padding:14px 0; }
#journal .entry h4 { font-size:14px; font-weight:400; margin-bottom:6px; }
#journal .entry p { font-size:12.5px; line-height:1.6; opacity:.82; }
#journal .tag { display:inline-block; margin-top:8px; padding:2px 7px; font-size:9px; letter-spacing:.16em;
  border:1px solid rgba(217,164,65,.5); color:#d9a441; text-transform:uppercase; }
#journal .tag.DISPUTED { border-color:#c76a4a; color:#e0896a; }
#journal .tag.ALTERNATE_HISTORY { border-color:#6a9ac7; color:#8fb8e0; }
#ending { position:absolute; inset:0; display:none; align-items:center; justify-content:center;
  background:radial-gradient(circle at 50% 40%, rgba(40,26,10,.92), rgba(6,4,2,.97)); pointer-events:auto; }
#ending .card { width:min(720px,92vw); padding:44px 46px; text-align:center; }
#ending h2 { font-size:clamp(22px,4vw,34px); letter-spacing:.22em; font-weight:400; color:#d9a441; margin-bottom:22px; }
#ending p { font-size:15px; line-height:1.85; opacity:.88; margin-bottom:18px; text-align:left; }
#ending .tag { display:inline-block; padding:3px 9px; font-size:9.5px; letter-spacing:.18em;
  border:1px solid rgba(217,164,65,.5); color:#d9a441; margin-bottom:26px; }
#ending button, #menu button.go { padding:12px 30px; border:1px solid #d9a441; background:transparent;
  color:#d9a441; font-family:inherit; font-size:12px; letter-spacing:.24em; text-transform:uppercase; cursor:pointer; }
#ending button:hover, #menu button.go:hover { background:#d9a441; color:#140c04; }
#menu { position:fixed; inset:0; z-index:30; display:flex; flex-direction:column; align-items:center;
  justify-content:center; gap:14px; padding:5vh 5vw; overflow:auto;
  background:radial-gradient(circle at 50% 30%, #2e1f0d 0%, #0b0703 72%); pointer-events:auto; }
#menu h1 { font-size:clamp(26px,6vw,54px); letter-spacing:.3em; font-weight:400; color:#d9a441; }
#menu .sub { font-size:11px; letter-spacing:.42em; text-transform:uppercase; opacity:.75; margin-bottom:6px; }
#menu .chapters { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:12px;
  width:min(1000px,94vw); margin:14px 0; }
#menu .ch { padding:16px 18px; border:1px solid rgba(217,164,65,.28); background:rgba(20,13,6,.6);
  cursor:pointer; transition:.18s; text-align:left; color:#e8d3ae; font-family:inherit; }
#menu .ch:hover { border-color:#d9a441; background:rgba(60,40,16,.7); transform:translateY(-2px); }
#menu .ch .n { font-size:10px; letter-spacing:.3em; color:#d9a441; }
#menu .ch .t { font-size:16px; letter-spacing:.1em; margin:6px 0 4px; }
#menu .ch .m { font-size:11px; opacity:.6; line-height:1.5; }
#menu .foot { font-size:10.5px; opacity:.5; max-width:640px; text-align:center; line-height:1.6; }
`;

export class UI {
  setPaused(on) {
    this.paused = !!on;
    const hud = document.getElementById('hud');
    if (hud) hud.style.opacity = this.paused ? '0.25' : '';
    const touch = document.getElementById('touch');
    if (touch) touch.style.pointerEvents = this.paused ? 'none' : '';
  }

  constructor() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    this.root = document.createElement('div');
    this.root.id = 'ui-root';
    this.root.innerHTML = `
      <div id="hintbar"></div>
      <div id="dialog" class="panel"><div class="who"></div><div class="line"></div><div class="more">E / click to continue</div></div>
      <div id="choice" class="panel"><div class="prompt"></div><div class="options"></div></div>
      <div id="ask" class="panel"><h3></h3><div class="questions"></div><button class="close">End the conversation</button></div>
      <div id="journal" class="panel"><h3>Field journal</h3><div class="entries"></div></div>
      <div id="ending"><div class="card panel"><h2></h2><div class="tag"></div><p></p><button>Continue</button></div></div>
      <div id="hud-fight"><div class="bar"><div class="fill"></div></div><div class="wpn"></div></div>
      <div id="hud-powers"></div>
      <div id="hurt-flash"></div>
    `;
    document.body.appendChild(this.root);

    this.hintbar = this.root.querySelector('#hintbar');
    this.dialog = this.root.querySelector('#dialog');
    this.choice = this.root.querySelector('#choice');
    this.askPanel = this.root.querySelector('#ask');
    this.journal = this.root.querySelector('#journal');
    this.ending = this.root.querySelector('#ending');
    this.fightHud = this.root.querySelector('#hud-fight');
    this.fightFill = this.fightHud.querySelector('.fill');
    this.fightWeapon = this.fightHud.querySelector('.wpn');
    this.powersHud = this.root.querySelector('#hud-powers');
    this.hurtFlash = this.root.querySelector('#hurt-flash');
    this.busy = false;
  }

  ask(speaker, questions, onPick, onClose) {
    this.busy = true;
    this.askPanel.style.display = 'block';
    this.askPanel.querySelector('h3').textContent = 'Ask ' + speaker;
    const box = this.askPanel.querySelector('.questions');
    box.innerHTML = '';
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8'];
    questions.forEach((q, idx) => {
      const b = document.createElement('button');
      b.innerHTML = `<b>${keys[idx] || '+'}</b>${q}`;
      b.addEventListener('click', () => { this.askPanel.style.display = 'none'; this.busy = false; onPick(idx); });
      box.appendChild(b);
    });
    const close = this.askPanel.querySelector('.close');
    const shut = () => {
      this.askPanel.style.display = 'none';
      window.removeEventListener('keydown', key);
      close.removeEventListener('click', shut);
      this.busy = false;
      if (onClose) onClose();
    };
    const key = (e) => {
      const idx = keys.indexOf(e.key);
      if (idx >= 0 && idx < questions.length) {
        this.askPanel.style.display = 'none';
        this.busy = false;
        window.removeEventListener('keydown', key);
        onPick(idx);
      } else if (e.code === 'Escape' || e.code === 'KeyQ') {
        shut();
      }
    };
    close.addEventListener('click', shut);
    window.addEventListener('keydown', key);
  }

  combatStatus(state) {
    if (!state) { this.fightHud.style.display = 'none'; return; }
    this.fightHud.style.display = 'block';
    const pct = Math.max(0, Math.min(100, (state.health / (state.maxHealth || 100)) * 100));
    this.fightFill.style.width = pct + '%';
    this.fightFill.style.background = pct > 55 ? '#7d8b52' : (pct > 25 ? '#b08a3a' : '#8c3b32');
    let w = state.weaponLabel || 'Fists';
    if (state.weapon === 'gun') w += ` · ${state.ammo} rounds`;
    if (state.kills) w += ` · ${state.kills} down`;
    this.fightWeapon.innerHTML = `${w} <span>· J punch · K kick · L dodge</span>`;
  }

  flashHurt() {
    this.hurtFlash.style.opacity = '1';
    setTimeout(() => { this.hurtFlash.style.opacity = '0'; }, 160);
  }

  setPowers(list) {
    if (!this.powersHud) return;
    if (!list || !list.length) {
      this.powersHud.style.display = 'none';
      this.powersHud.innerHTML = '';
      return;
    }
    this.powersHud.style.display = 'block';
    this.powersHud.innerHTML = list
      .map((p) => `<div class="row"><b>${p.key}</b>${p.label}</div>`)
      .join('');
  }

  setObjective(mission, step) {
    const chapter = document.getElementById('chapter');
    const objective = document.getElementById('objective');
    if (chapter) chapter.textContent = 'CHAPTER ' + (this.chapterNumber || '') + ' — ' + (this.chapterTitle || '');
    if (objective) objective.innerHTML = `<b style="color:#d9a441;font-weight:400">${mission}</b><br>${step}`;
  }

  setChapter(chapter) {
    this.chapterNumber = chapter.number;
    this.chapterTitle = chapter.title;
    const el = document.getElementById('chapter');
    if (el) el.textContent = `CHAPTER ${chapter.number} — ${chapter.title} · ${chapter.year}`;
  }

  toast(message, ms = 2600) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.style.opacity = '1';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { el.style.opacity = '0'; }, ms);
  }

  hint(text) {
    if (!text) { this.hintbar.style.opacity = '0'; return; }
    this.hintbar.textContent = text;
    this.hintbar.style.opacity = '1';
  }

  dialogBox(lines, onDone) {
    this.busy = true;
    this.dialog.style.display = 'block';
    let i = 0;
    const who = this.dialog.querySelector('.who');
    const line = this.dialog.querySelector('.line');
    const show = () => {
      const cur = lines[i];
      who.textContent = cur.speakerName || cur.speaker;
      line.textContent = cur.text;
      i++;
    };
    show();
    const advance = (e) => {
      if (e) e.stopPropagation();
      if (i < lines.length) show();
      else {
        this.dialog.style.display = 'none';
        window.removeEventListener('keydown', key);
        this.dialog.removeEventListener('click', advance);
        this.busy = false;
        if (onDone) onDone();
      }
    };
    const key = (e) => {
      if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') advance();
    };
    window.addEventListener('keydown', key);
    this.dialog.addEventListener('click', advance);
  }

  choose(prompt, options, onPick) {
    this.busy = true;
    this.choice.style.display = 'block';
    this.choice.querySelector('.prompt').textContent = prompt;
    const box = this.choice.querySelector('.options');
    box.innerHTML = '';
    const keys = ['1', '2', '3', '4', '5'];
    options.forEach((opt, idx) => {
      const b = document.createElement('button');
      b.innerHTML = `<b>${keys[idx]}</b>${opt.text}`;
      b.addEventListener('click', () => pick(idx));
      box.appendChild(b);
    });
    const pick = (idx) => {
      this.choice.style.display = 'none';
      window.removeEventListener('keydown', key);
      this.busy = false;
      onPick(idx, options[idx]);
    };
    const key = (e) => {
      const idx = keys.indexOf(e.key);
      if (idx >= 0 && idx < options.length) pick(idx);
    };
    window.addEventListener('keydown', key);
  }

  openJournal(entries) {
    this.journal.style.display = 'block';
    const box = this.journal.querySelector('.entries');
    if (!entries.length) {
      box.innerHTML = '<div class="entry"><p>Nothing recorded yet. Talk to people, look at things.</p></div>';
      return;
    }
    box.innerHTML = entries.map((e) => `
      <div class="entry">
        <h4>${e.title}</h4>
        <p>${e.body}</p>
        <span class="tag ${e.provenance}">${e.provenance.replace(/_/g, ' ')}</span>
        ${e.sources ? `<p style="opacity:.45;margin-top:8px;font-size:11px">Sources: ${e.sources}</p>` : ''}
      </div>`).join('');
  }

  closeJournal() { this.journal.style.display = 'none'; }

  showEnding(end, onContinue) {
    this.ending.style.display = 'flex';
    this.ending.querySelector('h2').textContent = end.title;
    this.ending.querySelector('.tag').textContent = end.provenance.replace(/_/g, ' ');
    this.ending.querySelector('p').textContent = end.text;
    const btn = this.ending.querySelector('button');
    const go = () => {
      this.ending.style.display = 'none';
      btn.removeEventListener('click', go);
      onContinue();
    };
    btn.addEventListener('click', go);
  }

  menu(chapters, onPick, onReset) {
    const el = document.createElement('div');
    el.id = 'menu';
    el.innerHTML = `
      <h1>HIS-TREE</h1>
      <div class="sub">Experience history · rewrite destiny</div>
      <div class="chapters">
        ${chapters.map((c) => `
          <button class="ch" data-id="${c.id}">
            <div class="n">CHAPTER ${c.number}</div>
            <div class="t">${c.title}</div>
            <div class="m">${c.place} · ${c.year}</div>
            <div class="m" style="opacity:.45;margin-top:6px">${c.tagline}</div>
          </button>`).join('')}
      </div>
      <div class="foot">Every historical claim in this game is tagged: VERIFIED, INTERPRETED, DISPUTED, or invented. Press C in game to read the journal and its sources.</div>
      <button class="go" style="margin-top:10px">${onReset ? 'Clear progress' : ''}</button>
    `;
    document.body.appendChild(el);
    el.querySelectorAll('.ch').forEach((b) => {
      b.addEventListener('click', () => { el.remove(); onPick(b.dataset.id); });
    });
    const go = el.querySelector('button.go');
    if (go) {
      if (onReset) go.addEventListener('click', () => { onReset(); el.remove(); });
      else go.remove();
    }
    this.menuEl = el;
  }

  removeMenu() { if (this.menuEl) { this.menuEl.remove(); this.menuEl = null; } }
}
