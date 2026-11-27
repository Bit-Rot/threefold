// Headless balance + crash test: plays full runs with a greedy bot against the AI opponents.
import { Battle } from '../src/engine/battle.js';
import * as R from '../src/engine/run.js';
import { defaultMeta } from '../src/core/save.js';
import { makeRng } from '../src/core/rng.js';
import { UNLOCKS } from '../src/data/meta.js';
import { STARTER_DECK_LIST } from '../src/data/starterDecks.js';

function botTurn(b, rng) {
  let guard = 0;
  while (guard++ < 20) {
    const opts = [];
    for (const hc of b.hand) for (let l = 0; l < 3; l++) {
      const c = b.canPlay(hc.hid, l); if (!c.ok) continue;
      const lane = b.lanes[l]; const diff = lane.totals[1] - lane.totals[0];
      opts.push({ hc, l, score: b.handPower(hc) + c.cost * 1.5 + (diff >= -4 && diff <= 10 ? 4 : diff > 15 ? -4 : 0) + rng.next() });
    }
    if (!opts.length) break;
    opts.sort((a, c) => c.score - a.score);
    b.play(opts[0].hc.hid, opts[0].l);
  }
  for (const bc of b.allCards(0)) if (b.canMoveCard(bc)) { const to = b.weakestLane(0); if (to !== bc.lane) b.playerMove(bc.bid, to); }
  b.endTurn();
}

function playRun(starterDeckId, heat, seed, meta) {
  const run = R.newRun(meta, starterDeckId, heat, seed);
  const rng = makeRng(seed ^ 0x113311);
  const stats = { fights: 0, wins: 0, actReached: 1, byKind: {} };
  while (!run.over) {
    const avail = R.availableNodes(run);
    const node = R.nodeById(run, rng.pick(avail));
    if (!node || !R.enterNode(run, node.id)) throw new Error('No reachable node');
    run.node = { id: node.id, type: node.type, done: false };
    if (node.enc) {
      const b = new Battle(run, node.enc, seed * 7 + stats.fights);
      b.start();
      let g = 0; while (!b.over && g++ < 12) botTurn(b, rng);
      if (!b.over) throw new Error('battle did not end');
      const out = R.applyBattle(run, meta, node, b.result);
      stats.fights++; if (out.won) stats.wins++;
      const k = node.enc.kind; (stats.byKind[k] ||= { n: 0, w: 0, m: [] }); stats.byKind[k].n++; if (out.won) stats.byKind[k].w++;
      stats.byKind[k].m.push(node.enc.opponent + ' ' + b.result.laneResults.map((r) => `${r.player}-${r.enemy}`).join(' '));
      if (run.over) break;
      R.takeCard(run, run.pendingReward.cards[0]);
      if (run.pendingReward.bossRelics) R.gainRelic(run, run.pendingReward.bossRelics[0]);
      run.pendingReward = null;
      run.node.done = true;
      if (node.type === 'boss') { R.finishAct(run); stats.actReached = run.act; }
    } else {
      if (node.type === 'shop') {
        const shop = R.rollShop(run);
        shop.items.forEach((item, i) => {
          if (item.kind === 'gem' && item.id === 'evo') {
            const option = R.evoOptions(run)[0];
            if (option) R.buy(run, shop, i, option.base.uid, { meta, catalystUid: option.catalyst.uid });
            return;
          }
          const target = item.kind === 'gem' ? run.deck.find((card) => R.canSocket(card, item.id)) : null;
          R.buy(run, shop, i, target?.uid);
        });
      }
      if (node.type === 'gem') {
        run.node.gemChoices = R.rollGemChoices(run);
        const id = run.node.gemChoices[0];
        if (id === 'evo') {
          const { base, catalyst } = R.evoOptions(run)[0];
          if (!R.claimGem(run, id, base.uid, { meta, catalystUid: catalyst.uid })) throw new Error('Evolution claim failed');
        } else if (id) {
          const target = run.deck.find((card) => R.canSocket(card, id));
          if (!R.claimGem(run, id, target?.uid)) throw new Error('Gem claim failed');
        }
      }
      if (node.type === 'forge') {
        const f = R.fuseOptions(run)[0]; if (f) R.fuse(run, f.a, f.b);
      }
      if (node.type === 'purge') R.removeCard(run, run.deck[0].uid);
      if (node.type === 'mirror') R.cloneCard(run, run.deck[run.deck.length - 1].uid);
      if (node.type === 'camp') R.restAtCamp(run);
      if (node.type === 'treasure') R.gainRandomRelicId(run);
      if (node.type === 'home') { const [id] = R.homeChoices(run); if (id) run.home.push(id); }
      run.node.done = true;
    }
  }
  return { ...stats, result: run.over, deck: run.deck.length };
}

const meta = defaultMeta();
meta.unlocked = UNLOCKS.map((u) => u.id);
const total = { runs: 0, victories: 0, byKind: {} };
const N = Number(process.argv[2] || 30);
for (let i = 0; i < N; i++) for (const starter of STARTER_DECK_LIST) {
  const r = playRun(starter.id, 0, 1000 + i * 13, meta);
  total.runs++; if (r.result === 'victory') total.victories++;
  for (const [k, v] of Object.entries(r.byKind)) { (total.byKind[k] ||= { n: 0, w: 0 }); total.byKind[k].n += v.n; total.byKind[k].w += v.w; }
  if (i === 0) console.log(starter.id, r.result, 'act', r.actReached, 'fights', r.fights, 'won', r.wins, '\n   ' + Object.entries(r.byKind).map(([k, v]) => k + ': ' + v.m.slice(0, 3).join(' | ')).join('\n   '));
}
console.log('runs', total.runs, 'victories', total.victories);
for (const [k, v] of Object.entries(total.byKind)) console.log(k, 'winrate', (v.w / v.n).toFixed(2), 'n', v.n);
