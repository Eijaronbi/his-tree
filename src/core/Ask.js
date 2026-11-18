import { ASK_DB, CHAPTER_TOPICS, DEFAULT_TOPICS } from '../data/ask_db.js';

function evalAnswer(answer, ctx) {
  if (typeof answer === 'function') {
    try { return answer(ctx) || '...'; } catch (e) { return '...'; }
  }
  if (Array.isArray(answer)) return answer.join(' ');
  return answer || '...';
}

/**
 * Lets the player ask any nearby person questions: directions for the current
 * objective, history for the era, and whatever that person would know.
 */
export class Ask {
  constructor({ chapter, ui, player, npcs = {}, quest, input }) {
    this.chapter = chapter;
    this.ui = ui;
    this.player = player;
    this.npcs = npcs;
    this.quest = quest;
    this.input = input;
    this.open = false;
    this.target = null;
    this.lastHint = '';
  }

  topicsFor(npcId, npcLabel) {
    const chapterTopics = (CHAPTER_TOPICS[this.chapter ? this.chapter.id : ''] || []).slice();
    const npcData = (ASK_DB[this.chapter ? this.chapter.id : ''] || {})[npcId];
    const npcTopics = npcData ? npcData.topics.slice() : [];
    const seen = new Set();
    const merged = [];
    for (const t of npcTopics.concat(chapterTopics).concat(DEFAULT_TOPICS)) {
      if (!t || seen.has(t.id)) continue;
      seen.add(t.id);
      merged.push(t);
    }
    return merged;
  }

  answerFor(topic, npcId, npcLabel) {
    const ctx = {
      chapter: this.chapter,
      quest: this.quest,
      npcLabel,
      npcId,
      player: this.player
    };
    const npcData = (ASK_DB[this.chapter ? this.chapter.id : ''] || {})[npcId];
    if (npcData) {
      const found = npcData.topics.find((t) => t.id === topic.id);
      if (found) return evalAnswer(found.a, ctx);
    }
    return evalAnswer(topic.a, ctx);
  }

  update(dt, input) {
    if (!this.player || !this.npcs) return;
    if (this.ui.busy || this.open) return;
    const p = this.player.position;
    let best = null;
    let bestD = 5.0;
    for (const npc of Object.values(this.npcs)) {
      if (!npc || !npc.root) continue;
      const d = Math.hypot(p.x - npc.position.x, p.z - npc.position.z);
      if (d < bestD) { bestD = d; best = npc; }
    }
    this.near = best;
    if (!best) return;
    const hint = `Q — ask ${best.label} something`;
    if (hint !== this.lastHint) {
      this.lastHint = hint;
      this.ui.hint(hint);
    }
    if (input.pressed('KeyQ')) this.openPanel(best);
  }

  closePanel() {
    this.open = false;
    if (this.input && this.input.just) this.input.just.delete('KeyQ');
  }

  openPanel(npc) {
    const topics = this.topicsFor(npc.spec.id, npc.label);
    if (!topics.length) return;
    this.open = true;
    this.target = npc;
    this.ui.ask(npc.label, topics.map((t) => t.q), (idx) => {
      const topic = topics[idx];
      const answer = this.answerFor(topic, npc.spec.id, npc.label);
      this.ui.dialogBox([{ speaker: npc.label, text: answer }], () => {
        this.openPanel(npc);
      });
    }, () => { this.closePanel(); });
  }
}
