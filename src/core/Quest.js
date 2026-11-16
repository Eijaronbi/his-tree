import * as THREE from 'three';
import { JOURNAL, DIALOGUE, CHARACTERS } from '../data/story.js';

const SAVE_KEY = 'his-tree:save:v1';

export function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); } catch (e) { return {}; }
}

export function writeSave(data) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
}

export class Quest {
  constructor({ chapter, scene, ui, player, npcs = {}, props = {}, world, onEnding, save, auto = false }) {
    this.chapter = chapter;
    this.scene = scene;
    this.ui = ui;
    this.player = player;
    this.npcs = npcs;
    this.props = props;
    this.world = world;
    this.onEnding = onEnding;
    this.save = save || loadSave();
    this.auto = auto;

    this.missionIndex = 0;
    this.stepIndex = 0;
    this.flags = this.save.flags || {};
    this.journal = this.save.journal || [];
    this.marker = null;
    this.done = false;
    this.cooldown = 0;

    this.chapter.missions.flatMap((m) => m.journal).forEach((id) => {});
    this._buildMarker();
  }

  get mission() { return this.chapter.missions[this.missionIndex]; }
  get step() { return this.mission ? this.mission.steps[this.stepIndex] : null; }

  _buildMarker() {
    this.marker = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 0.95, 44),
      new THREE.MeshBasicMaterial({ color: 0xd9a441, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.34, 6, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd79a, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false })
    );
    shaft.position.y = 3;
    this.marker.add(ring, shaft);
    this.markerRing = ring;
    this.marker.visible = false;
    this.scene.add(this.marker);
  }

  start() {
    this.ui.toastChapter = this.chapter;
    this.advanceText();
    this._sync();
  }

  advanceText() {
    const t = this.chapter.intro.map((l) => ({ ...l, speaker: CHARACTERS[l.speaker] ? CHARACTERS[l.speaker].name : l.speaker }));
    if (t.length) this.ui.dialogBox(t, () => { this.ui.hint(''); });
  }

  _sync() {
    const step = this.step;
    if (!step) return this._finish();
    if (step.type === 'goto' && step.marker) {
      this.marker.visible = true;
      this.marker.position.set(step.marker.x, 0, step.marker.z);
    } else {
      this.marker.visible = false;
    }
    this.ui.setObjective?.(this.mission.title, step.text);
    this.ui.hint('');
    if (this.npcs && step.type === 'talk' && this.npcs[step.who]) {
      this.npcs[step.who].highlight(true);
    }
  }

  _clearHighlights() {
    Object.values(this.npcs || {}).forEach((n) => n.highlight && n.highlight(false));
  }

  _record(id) {
    if (!id || this.journal.includes(id)) return;
    this.journal.push(id);
    this.ui.toast?.('Journal updated — press J');
  }

  _next() {
    this.stepIndex++;
    if (this.stepIndex >= this.mission.steps.length) {
      this.missionIndex++;
      this.stepIndex = 0;
    }
    this.save.flags = this.flags;
    this.save.journal = this.journal;
    this.save.chapter = this.chapter.id;
    this.save.mission = this.missionIndex;
    writeSave(this.save);
    this._sync();
  }

  _finish() {
    if (this.done) return;
    this.done = true;
    this.marker.visible = false;
    this._clearHighlights();
    const key = this.flags.ending || this.chapter.objectiveEnding || Object.keys(this.chapter.endings)[0];
    const end = this.chapter.endings[key] || Object.values(this.chapter.endings)[0];
    this.save.completed = this.save.completed || [];
    if (!this.save.completed.includes(this.chapter.id)) this.save.completed.push(this.chapter.id);
    this.save.flags = this.flags;
    this.save.journal = this.journal;
    writeSave(this.save);
    if (this.onEnding) this.onEnding(end);
  }

  entries() {
    return this.journal.map((id) => JOURNAL[id]).filter(Boolean);
  }

  update(dt, input) {
    if (this.auto) { this._autoTick(dt); return; }
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.done || this.ui.busy || this.cooldown > 0) return;
    const step = this.step;
    if (!step) return;

    if (step.type === 'goto') {
      const d = Math.hypot(this.player.position.x - step.marker.x, this.player.position.z - step.marker.z);
      if (d < step.marker.r) { this._next(); return; }
      this.ui.hint(d < step.marker.r + 8 ? 'Follow the light' : '');
    }

    if (step.type === 'talk') {
      const npc = this.npcs[step.who];
      if (!npc) { this.ui.hint('Objective target missing'); return; }
      const d = Math.hypot(this.player.position.x - npc.position.x, this.player.position.z - npc.position.z);
      if (d < 4.2) {
        this.ui.hint(`E — speak to ${npc.label}`);
        if (input.pressed('KeyE')) this._talk(npc, step);
      } else {
        this.ui.hint('');
        npc.highlight(d < 14);
      }
    }

    if (step.type === 'inspect') {
      const prop = this.props[step.target];
      if (!prop) { this.ui.hint('Look for ' + step.target); return; }
      const d = Math.hypot(this.player.position.x - prop.position.x, this.player.position.z - prop.position.z);
      if (d < 3.6) {
        this.ui.hint('E — examine');
        if (input.pressed('KeyE')) {
          this._record(step.journal);
          if (prop.desc) this.ui.dialogBox([{ speaker: prop.label || 'Examine', text: prop.desc }], () => {});
          this.cooldown = 0.4;
          this._next();
        }
      } else {
        this.ui.hint(prop.label ? `Find: ${prop.label}` : '');
      }
    }

    if (step.type === 'choice') {
      this.ui.hint('');
      this._presentChoice(step);
    }
  }

  _autoTick(dt) {
    this._autoTimer = (this._autoTimer || 0) + dt;
    if (this._autoTimer < 0.25) return;
    this._autoTimer = 0;

    const dlg = document.getElementById('dialog');
    if (dlg && dlg.style.display === 'block') { dlg.click(); return; }
    const choice = document.getElementById('choice');
    if (choice && choice.style.display === 'block') {
      const btn = choice.querySelector('button');
      if (btn) { btn.click(); return; }
    }
    if (this.done || this.ui.busy) return;

    const step = this.step;
    if (!step) return;
    const p = this.player.position;
    if (step.type === 'goto') {
      p.x = step.marker.x;
      p.z = step.marker.z;
      this._next();
      return;
    }
    if (step.type === 'talk') {
      const npc = this.npcs[step.who];
      if (!npc) { this._next(); return; }
      p.x = npc.position.x + 1.6;
      p.z = npc.position.z + 1.6;
      this._talk(npc, step);
      return;
    }
    if (step.type === 'inspect') {
      const prop = this.props[step.target];
      if (!prop) { this._next(); return; }
      p.x = prop.position.x + 1.5;
      p.z = prop.position.z + 1.5;
      this._record(step.journal);
      if (prop.desc) this.ui.dialogBox([{ speaker: prop.label || 'Examine', text: prop.desc }], () => {});
      this.cooldown = 0.4;
      this._next();
      return;
    }
    if (step.type === 'choice') {
      this.choiceOpen = true;
      this._autoChoiceIndex = this._autoChoiceIndex || 0;
      const opt = step.options[this._autoChoiceIndex % step.options.length];
      this._autoChoiceIndex = (this._autoChoiceIndex || 0) + 1;
      Object.assign(this.flags, opt.flags || {});
      if (opt.journal) this._record(opt.journal);
      this._next();
    }
  }

  _talk(npc, step) {
    const lines = (DIALOGUE[step.dialogue] || []).map((l) => ({
      ...l,
      speakerName: CHARACTERS[l.speaker] ? CHARACTERS[l.speaker].name : l.speaker
    }));
    this.ui.dialogBox(lines, () => { this.cooldown = 0.4; this._next(); });
  }

  _presentChoice(step) {
    if (this.choiceOpen) return;
    this.choiceOpen = true;
    this.ui.choose(step.prompt, step.options, (idx, opt) => {
      this.choiceOpen = false;
      Object.assign(this.flags, opt.flags || {});
      if (opt.journal) this._record(opt.journal);
      this._next();
    });
  }
}
