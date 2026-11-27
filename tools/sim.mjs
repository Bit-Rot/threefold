// Headless balance + crash test: plays full runs with a greedy bot against the AI opponents.
import { Battle } from '../src/engine/battle.js';
import * as R from '../src/engine/run.js';
import { defaultMeta } from '../src/core/save.js';
import { UNLOCKS } from '../src/data/meta.js';
import { WARDEN_LIST } from '../src/data/wardens.js';

function botTurn(b) {
  let guard = 0;
  while (guard++ < 20) {
    const opts = [];
    for (const hc of b.hand) for (let l = 0; l < 3; l++) {
      const c = b.canPlay(hc.hid, l); if (!c.ok) continue;
      const lane = b.lanes[l]; const diff = lane.totals[1] - lane.totals[0];
      opts.push({ hc, l, score: hc.def.power + c.cost * 1.5 + (diff >= -4 && diff <= 10 ? 4 : diff > 15 ? -4 : 0) + Math.random() });
    }
    if (!opts.length) break;
    opts.sort((a, c) => c.score - a.score);
    b.play(opts[0].hc.hid, opts[0].l);
  }
  for (const bc of b.allCards(0)) if (b.canMoveCard(bc)) { const to = b.weakestLane(0); if (to !== bc.lane) b.playerMove(bc.bid, to); }
  b.endTurn();
}

function playRun(wardenId, heat, seed, meta) {
  const run = R.newRun(meta, wardenId, heat, seed);
  const stats = { fights: 0, wins: 0, actReached: 1, byKind: {} };
  while (!run.over) {
    const avail = R.availableNodes(run);
    const node = R.nodeById(run, avail[seed++ % avail.length]);
    R.enterNode(run, node.id);
    if (node.enc) {
      const b = new Battle(run, node.enc, seed * 7 + stats.fights);
      b.start();
      let g = 0; while (!b.over && g++ < 12) botTurn(b);
      if (!b.over) throw new Error('battle did not end');
      const out = R.applyBattle(run, meta, node, b.result);
      stats.fights++; if (out.won) stats.wins++;
      const k = node.enc.kind; (stats.byKind[k] ||= { n: 0, w: 0, m: [] }); stats.byKind[k].n++; if (out.won) stats.byKind[k].w++;
      stats.byKind[k].m.push(node.enc.opponent + ' ' + b.result.laneResults.map((r) => `${r.player}-${r.enemy}`).join(' '));
      R.takeCard(run, run.pendingReward.cards[0]);
      if (run.pendingReward.bossRelics) R.gainRelic(run, run.pendingReward.bossRelics[0]);
      if (run.over) break;
      if (node.type === 'boss') { R.finishAct(run); stats.actReached = run.act; }
    } else {
      if (node.type === 'shop') { const s = R.rollShop(run); s.items.forEach((_, i) => R.buy(run, s, i)); }
      if (node.type === 'forge') {
        if (run.gems.length) { const t = run.deck.find((c) => c.sockets.includes(null) && (run.gems[0] !== 'evo' || R.evoOptions(run).some((o) => o.uid === c.uid))); if (t) R.socketGem(run, 0, t.uid); }
        const ev = R.evoOptions(run).find((o) => o.ready); if (ev) R.evolve(run, meta, ev.uid);
        const f = R.fuseOptions(run)[0]; if (f) R.fuse(run, f.a, f.b);
      }
      if (node.type === 'purge') R.removeCard(run, run.deck[0].uid);
      if (node.type === 'mirror') R.cloneCard(run, run.deck[run.deck.length - 1].uid);
      if (node.type === 'camp') R.upgradeCard(run, run.deck.find((c) => !c.plus)?.uid);
      if (node.type === 'treasure') R.gainRandomRelicId(run);
      if (node.type === 'home') run.home.push(R.homeChoices(run)[0]);
      if (node.type === 'event') { const api = R.eventApi(run); api.upgradeRandom(1); api.gainRandomGem(); }
    }
  }
  return { ...stats, result: run.over, deck: run.deck.length };
}

const meta = defaultMeta();
meta.unlocked = UNLOCKS.map((u) => u.id);
const total = { runs: 0, victories: 0, byKind: {} };
const N = Number(process.argv[2] || 30);
for (let i = 0; i < N; i++) for (const w of WARDEN_LIST) {
  const r = playRun(w.id, 0, 1000 + i * 13, meta);
  total.runs++; if (r.result === 'victory') total.victories++;
  for (const [k, v] of Object.entries(r.byKind)) { (total.byKind[k] ||= { n: 0, w: 0 }); total.byKind[k].n += v.n; total.byKind[k].w += v.w; }
  if (i === 0) console.log(w.id, r.result, 'act', r.actReached, 'fights', r.fights, 'won', r.wins, '\n   ' + Object.entries(r.byKind).map(([k, v]) => k + ': ' + v.m.slice(0, 3).join(' | ')).join('\n   '));
}
console.log('runs', total.runs, 'victories', total.victories);
for (const [k, v] of Object.entries(total.byKind)) console.log(k, 'winrate', (v.w / v.n).toFixed(2), 'n', v.n);
