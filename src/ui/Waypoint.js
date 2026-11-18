import * as THREE from 'three';

const MINI_CSS = `
#waypoint{position:fixed;left:0;top:0;z-index:22;pointer-events:none;display:none;
will-change:transform}
#waypoint .wp-in{display:flex;flex-direction:column;align-items:center;gap:3px;
transform:translate(-50%,-50%)}
#waypoint .wp-arrow{width:16px;height:16px;border-left:2px solid #d9a441;border-top:2px solid #d9a441;
transform:rotate(45deg);filter:drop-shadow(0 0 6px rgba(217,164,65,.75))}
#waypoint .wp-dist{font-size:9px;letter-spacing:.16em;color:#e8d3ae;text-shadow:0 1px 3px #000;
font-variant-numeric:tabular-nums}
#waypoint.is-edge .wp-arrow{width:12px;height:12px;border-color:#e8d3ae}
#minimap{position:fixed;right:12px;top:56px;width:104px;height:104px;z-index:21;border-radius:50%;
background:rgba(11,8,5,.62);border:1px solid rgba(217,164,65,.28);box-shadow:0 3px 14px rgba(0,0,0,.45);
opacity:0;transition:opacity .35s ease;pointer-events:none}
#minimap.on{opacity:1}
#minimap canvas{width:100%;height:100%;border-radius:50%;display:block}
@media (orientation:landscape) and (max-height:520px){
  #minimap{width:78px;height:78px;top:46px;right:56px}
}
`;

export class Waypoint {
  constructor({ mount } = {}) {
    if (!document.getElementById('waypoint')) {
      const style = document.createElement('style');
      style.id = 'waypoint-styles';
      style.textContent = MINI_CSS;
      document.head.appendChild(style);

      const wp = document.createElement('div');
      wp.id = 'waypoint';
      wp.innerHTML = '<div class="wp-in"><div class="wp-arrow"></div><div class="wp-dist"></div></div>';
      (mount || document.body).appendChild(wp);
      this.el = wp;
      this.distEl = wp.querySelector('.wp-dist');

      const mini = document.createElement('div');
      mini.id = 'minimap';
      const c = document.createElement('canvas');
      c.width = 208;
      c.height = 208;
      mini.appendChild(c);
      (mount || document.body).appendChild(mini);
      this.mini = mini;
      this.ctx = c.getContext('2d');
      this.acc = 0;
    } else {
      this.el = document.getElementById('waypoint');
      this.distEl = this.el.querySelector('.wp-dist');
      this.mini = document.getElementById('minimap');
      this.ctx = this.mini.querySelector('canvas').getContext('2d');
      this.acc = 0;
    }
    this.visible = false;
    this._v = new THREE.Vector3();
  }

  clear() {
    this.el.style.display = 'none';
    this.mini.classList.remove('on');
    this.visible = false;
  }

  update(dt, { camera, player, target, world, npcs, yaw }) {
    if (!camera || !player) { this.clear(); return; }
    this.acc += dt;

    if (target) {
      const v = this._v;
      v.set(target.x, (target.y || 0) + 1.55, target.z);
      const dist = Math.hypot(player.position.x - target.x, player.position.z - target.z);
      v.project(camera);
      const w = window.innerWidth;
      const h = window.innerHeight;
      const behind = v.z > 1;
      let sx = v.x, sy = v.y;
      let edge = behind;
      if (behind) { sx = -sx; sy = -sy; }
      let px = (sx * 0.5 + 0.5) * w;
      let py = (-sy * 0.5 + 0.5) * h;
      const pad = 46;
      const padBottom = 132;
      if (px < pad || px > w - pad || py < pad + 30 || py > h - padBottom) {
        const cx = w / 2;
        const cy = h / 2;
        let dx = px - cx;
        let dy = py - cy;
        const len = Math.max(0.001, Math.hypot(dx, dy));
        const maxX = w / 2 - pad;
        const maxY = h / 2 - ((padBottom - pad) / 2) - 18;
        const k = Math.min(maxX / Math.abs(dx || 0.001), maxY / Math.abs(dy || 0.001));
        px = cx + dx * Math.min(1, k / len * len === 0 ? 1 : k);
        py = cy + dy * Math.min(1, k);
        edge = true;
      }
      this.el.style.display = 'block';
      this.el.classList.toggle('is-edge', edge);
      this.el.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
      this.distEl.textContent = `${Math.round(dist)} m`;
      this.visible = true;
    } else {
      this.el.style.display = 'none';
      this.visible = false;
    }

    if (this.acc > 0.085) {
      this.acc = 0;
      this._drawMini(player, target, world, npcs, yaw);
      this.mini.classList.add('on');
    }
  }

  _drawMini(player, target, world, npcs, yaw) {
    const ctx = this.ctx;
    const S = 208;
    const cx = S / 2;
    const cy = S / 2;
    const R = S / 2 - 3;
    const span = 78;
    const k = R / (span * 0.5);
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(24,17,9,.92)';
    ctx.fillRect(0, 0, S, S);

    const px = player.position.x;
    const pz = player.position.z;
    const tx = (x, z) => [cx + (x - px) * k, cy + (z - pz) * k];

    ctx.fillStyle = 'rgba(120,92,52,.55)';
    const cols = world && world.colliders ? world.colliders : null;
    if (cols) {
      for (const c of cols) {
        if (c.solid === false) continue;
        if (c.r > 6) continue;
        const [x, y] = tx(c.x, c.z);
        if (x < -20 || x > S + 20 || y < -20 || y > S + 20) continue;
        const r = Math.max(3, c.r * k * 0.8);
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }
    if (world && world.hall) {
      const W = world.hall.W;
      const D = world.hall.D;
      const [x0, y0] = tx(-W / 2, -D / 2);
      ctx.strokeStyle = 'rgba(140,108,62,.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x0, y0, W * k, D * k);
    }

    if (npcs) {
      ctx.fillStyle = 'rgba(214,196,168,.55)';
      for (const n of Object.values(npcs)) {
        if (!n || !n.position || !n.root || n.root.visible === false) continue;
        const [x, y] = tx(n.position.x, n.position.z);
        if (x < 0 || x > S || y < 0 || y > S) continue;
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (target) {
      const [x, y] = tx(target.x, target.z);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#d9a441';
      ctx.shadowColor = 'rgba(217,164,65,.9)';
      ctx.shadowBlur = 8;
      ctx.fillRect(-4.5, -4.5, 9, 9);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-(yaw || 0));
    ctx.fillStyle = '#f2e3c2';
    ctx.beginPath();
    ctx.moveTo(0, -7.5);
    ctx.lineTo(5, 5.5);
    ctx.lineTo(0, 2.6);
    ctx.lineTo(-5, 5.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();
    ctx.strokeStyle = 'rgba(217,164,65,.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.fillStyle = 'rgba(232,211,174,.7)';
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, 20);
  }

  dispose() {
    if (this.el) this.el.remove();
    if (this.mini) this.mini.remove();
  }
}
