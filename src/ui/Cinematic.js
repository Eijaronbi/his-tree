const CSS = `
#cine-root { position:fixed; inset:0; z-index:40; pointer-events:none;
  font-family:Georgia,'Times New Roman',serif; color:#e8d3ae; }
#cine-root .bar { position:absolute; left:0; right:0; height:0; background:#050302;
  transition:height .9s cubic-bezier(.4,0,.2,1); }
#cine-root .bar.top { top:0; }
#cine-root .bar.bottom { bottom:0; }
#cine-root.letterboxed .bar { height:11vh; }
#cine-root .card { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
  text-align:center; opacity:0; transition:opacity 1.1s ease; }
#cine-root.showcard .card { opacity:1; }
#cine-root .card .num { font-size:11px; letter-spacing:.42em; text-transform:uppercase;
  color:#d9a441; margin-bottom:14px; }
#cine-root .card h1 { margin:0 0 12px; font-size:clamp(26px,5.2vw,58px); font-weight:400;
  letter-spacing:.2em; text-transform:uppercase; text-shadow:0 6px 30px rgba(0,0,0,.8); }
#cine-root .card .sub { font-size:12.5px; letter-spacing:.24em; text-transform:uppercase;
  opacity:.78; }
#cine-root .fade { position:absolute; inset:0; background:#050302; opacity:0;
  transition:opacity .8s ease; }
#cine-root.blackout .fade { opacity:1; }
#cine-root .skip { position:absolute; right:22px; bottom:calc(11vh + 18px); font-size:10px;
  letter-spacing:.24em; text-transform:uppercase; opacity:.45; }
`;

const DOM = `
<div class="bar top"></div>
<div class="bar bottom"></div>
<div class="card">
  <div class="num"></div>
  <h1></h1>
  <div class="sub"></div>
</div>
<div class="skip">space — skip</div>
<div class="fade"></div>
`;

function smooth(t) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export class Cinematic {
  constructor({ camera, onComplete }) {
    this.camera = camera;
    this.onComplete = onComplete;
    this.active = false;
    this.finished = false;
    this.shots = [];
    this.shotIndex = 0;
    this.shotTime = 0;
    this.elapsed = 0;
    this.fadeOut = 0;
    this.state = 'idle';
    this.pos = { x: 0, y: 0, z: 0 };
    this.target = { x: 0, y: 0, z: 0 };
    this.fov = 50;

    if (!document.getElementById('cine-root')) {
      const style = document.createElement('style');
      style.textContent = CSS;
      document.head.appendChild(style);
      const root = document.createElement('div');
      root.id = 'cine-root';
      root.innerHTML = DOM;
      document.body.appendChild(root);
    }
    this.root = document.getElementById('cine-root');
    this.card = this.root.querySelector('.card');
    this.numEl = this.root.querySelector('.card .num');
    this.titleEl = this.root.querySelector('.card h1');
    this.subEl = this.root.querySelector('.card .sub');

    this.onKey = (e) => {
      if (!this.active) return;
      if (e.code === 'Space' || e.code === 'Escape' || e.code === 'Enter') {
        e.preventDefault();
        this.skip();
      }
    };
    window.addEventListener('keydown', this.onKey);
    this.root.addEventListener('click', () => { if (this.active) this.skip(); });
  }

  start(config) {
    if (!config || !config.shots || !config.shots.length) return false;
    this.config = config;
    this.shots = config.shots;
    this.shotIndex = 0;
    this.shotTime = 0;
    this.elapsed = 0;
    this.fadeOut = 0;
    this.finished = false;
    this.active = true;
    this.state = 'running';
    this.numEl.textContent = config.number ? `Chapter ${config.number}` : '';
    this.titleEl.textContent = config.title || '';
    this.subEl.textContent = config.subtitle || '';
    this.root.classList.add('letterboxed');
    this.root.classList.remove('blackout', 'showcard');
    this._applyShot(this.shots[0], 1);
    window.setTimeout(() => {
      if (this.active) this.root.classList.add('showcard');
    }, 700);
    return true;
  }

  _applyShot(shot, blend) {
    const cam = this.camera;
    const px = shot.pos[0], py = shot.pos[1], pz = shot.pos[2];
    const tx = shot.target[0], ty = shot.target[1], tz = shot.target[2];
    const fov = shot.fov || 45;
    if (blend >= 1) {
      this.pos = { x: px, y: py, z: pz };
      this.target = { x: tx, y: ty, z: tz };
      this.fov = fov;
    } else {
      const k = smooth(blend);
      this.pos = {
        x: this.pos.x + (px - this.pos.x) * k,
        y: this.pos.y + (py - this.pos.y) * k,
        z: this.pos.z + (pz - this.pos.z) * k
      };
      this.target = {
        x: this.target.x + (tx - this.target.x) * k,
        y: this.target.y + (ty - this.target.y) * k,
        z: this.target.z + (tz - this.target.z) * k
      };
      this.fov = this.fov + (fov - this.fov) * k;
    }
    cam.position.set(this.pos.x, this.pos.y, this.pos.z);
    cam.lookAt(this.target.x, this.target.y, this.target.z);
    if (Math.abs(cam.fov - this.fov) > 0.01) {
      cam.fov = this.fov;
      cam.updateProjectionMatrix();
    }
  }

  skip() {
    if (!this.active || this.state !== 'running') return;
    this.state = 'fading';
    this.root.classList.remove('showcard');
  }

  update(dt) {
    if (!this.active) return;
    this.elapsed += dt;

    if (this.state === 'running') {
      const shot = this.shots[this.shotIndex];
      this.shotTime += dt;
      const dur = Math.max(0.4, shot.dur || 4);
      const blend = Math.min(1, this.shotTime / Math.min(1.6, dur * 0.45));
      this._applyShot(shot, blend);
      if (this.shotTime >= dur) {
        this.shotIndex++;
        this.shotTime = 0;
        if (this.shotIndex >= this.shots.length) {
          this.state = 'fading';
          this.root.classList.remove('showcard');
        }
      }
      return;
    }

    if (this.state === 'fading') {
      this.fadeOut += dt;
      if (this.fadeOut > 0.85) {
        this.root.classList.add('blackout');
        if (this.fadeOut > 1.7) {
          this.active = false;
          this.finished = true;
          this.state = 'idle';
          this.root.classList.remove('letterboxed', 'showcard');
          if (this.onComplete) this.onComplete();
        }
      }
    }
  }

  dispose() {
    window.removeEventListener('keydown', this.onKey);
    if (this.root) this.root.remove();
  }
}
