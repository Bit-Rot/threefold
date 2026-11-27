import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultMeta } from '../src/core/save.js';
import { CARDS, CARD_LIST, TRIBES } from '../src/data/cards.js';
import { BOSS_ORDER, OPPONENTS } from '../src/data/enemies.js';
import { EVENTS } from '../src/data/events.js';
import { Battle, DRAW_PER_TURN, MAX_HAND } from '../src/engine/battle.js';
import * as R from '../src/engine/run.js';

const newRun = () => R.newRun(defaultMeta(), 'bastion', 0, 917);
const encounter = { opponent: 'goblin_raiders', locs: ['open_field', null, 'open_field'] };

test('five-card draws recycle unused cards on both sides without firing Lingering', () => {
  const run = newRun();
  run.deck = Array.from({ length: 12 }, () => R.makeInst(run, 'ember_wisp'));
  const battle = new Battle(run, encounter, 23);
  battle.start();
  for (let turn = 1; turn <= 6; turn++) {
    assert.equal(battle.turn, turn);
    assert.equal(battle.hand.length, DRAW_PER_TURN);
    assert.equal(battle.S[0].energy, turn);
    assert.equal(battle.S[0].discardedCount, 0);
    assert.ok(battle.S[1].hand.length <= DRAW_PER_TURN);
    assert.equal(new Set(battle.hand.map((hc) => hc.inst.uid)).size, DRAW_PER_TURN);
    battle.endTurn();
  }
  assert.equal(battle.over, true);
});

test('reveal draws, queued cards, and relic bonuses work with a fresh hand', () => {
  const run = newRun();
  run.relics = ['scroll_case'];
  run.deck = Array.from({ length: 12 }, () => R.makeInst(run, 'scholar'));
  const battle = new Battle(run, encounter, 23);
  battle.start();
  assert.equal(battle.hand.length, DRAW_PER_TURN);
  assert.equal(battle.S[1].hand.length, DRAW_PER_TURN);
  battle.endTurn();
  assert.equal(battle.hand.length, DRAW_PER_TURN + 1);
  assert.equal(battle.play(battle.hand[0].hid, 0).ok, true);
  battle.endTurn();
  assert.equal(battle.hand.length, MAX_HAND);
  battle.queueCard(CARDS.patient_monk, null, -1);
  battle.endTurn();
  const monk = battle.hand.find((hc) => hc.def.id === 'patient_monk');
  assert.equal(battle.hand.length, DRAW_PER_TURN + 1);
  assert.equal(battle.handPower(monk), 4);
  const staged = battle.play(monk.hid, 1);
  assert.equal(staged.ok, true);
  assert.equal(staged.bc.base, 4);
});

test('routes lock to one lane, reach eight distinct bosses, and finish after the eighth', () => {
  const run = newRun();
  const encountered = [];
  for (let act = 1; act <= R.ACTS; act++) {
    const [starts, stops, bosses] = run.map.rows;
    assert.deepEqual(run.map.rows.map((row) => row.length), [2, 2, 1]);
    assert.ok(stops.some((node) => ['gem', 'shop'].includes(node.type)));
    const col = act % 2;
    assert.deepEqual(R.availableNodes(run), starts.map((node) => node.id));
    assert.equal(R.enterNode(run, stops[col].id), false);
    assert.equal(R.enterNode(run, starts[col].id), true);
    assert.deepEqual(R.availableNodes(run), [stops[col].id]);
    assert.equal(R.enterNode(run, stops[1 - col].id), false);
    assert.equal(R.enterNode(run, stops[col].id), true);
    assert.equal(R.enterNode(run, bosses[0].id), true);
    encountered.push(bosses[0].enc.opponent);
    R.finishAct(run);
    assert.equal(run.over, act === R.ACTS ? 'victory' : false);
  }
  assert.equal(encountered.length, 8);
  assert.deepEqual(encountered, BOSS_ORDER);
  assert.equal(new Set(encountered).size, 8);
});

test('every boss has a complete deck and can resolve a battle', () => {
  for (const card of CARD_LIST) {
    assert.equal(typeof card.text, 'string', card.id);
    assert.ok(TRIBES.includes(card.tribe), card.id);
  }
  for (const id of BOSS_ORDER) {
    assert.equal(OPPONENTS[id].deck.length, 12);
    assert.ok(OPPONENTS[id].deck.every((card) => CARDS[card]));
    const battle = new Battle(newRun(), { ...encounter, opponent: id }, 29);
    battle.start();
    for (let turn = 1; turn <= battle.maxTurns; turn++) battle.endTurn();
    assert.equal(battle.over, true);
    assert.equal(battle.result.laneResults.length, 3);
  }
});

test('shop gems are charged only once and only when an eligible card is socketed', () => {
  const run = newRun();
  const card = run.deck[0];
  const shop = { items: [{ kind: 'gem', id: 'ember', price: 45, sold: false }] };
  assert.equal(R.buy(run, shop, 0), false);
  assert.equal(R.buy(run, shop, 0, 'missing'), false);
  assert.equal(run.gold, 60);
  assert.equal(shop.items[0].sold, false);
  assert.equal(R.buy(run, shop, 0, card.uid), true);
  assert.deepEqual(card.sockets, ['ember']);
  assert.equal(R.buy(run, shop, 0, run.deck[1].uid), false);
  assert.equal(run.gold, 15);
});

test('only an open Gem node can grant its offer, and Evo Gems require a base card', () => {
  const run = newRun();
  const ordinary = run.deck.find((c) => c.id === 'spearman');
  const base = run.deck.find((c) => c.id === 'recruit');
  run.node = { type: 'gem', done: false, gemChoices: ['evo', 'thrift'] };
  assert.equal(R.claimGem(run, 'ember', ordinary.uid), false);
  assert.equal(R.claimGem(run, 'evo', ordinary.uid), false);
  assert.ok(R.canSocket(base, 'evo'));
  assert.equal(R.claimGem(run, 'evo', base.uid), true);
  assert.equal(R.claimGem(run, 'thrift', ordinary.uid), false);
  assert.deepEqual(base.sockets, ['evo']);
  assert.equal(run.gold, 60);
  run.node = { type: 'forge', done: false, gemChoices: ['thrift'] };
  assert.equal(R.claimGem(run, 'thrift', ordinary.uid), false);
});

test('events, elite rewards and migration leave no loose gem inventory', () => {
  const run = newRun();
  run.v = 1;
  run.gems = ['ember', 'evo'];
  run.deck[0].sockets[0] = 'spark';
  R.migrateRun(run);
  assert.equal(run.gold, 195);
  assert.equal(run.deck[0].sockets[0], 'spark');
  assert.ok(!('gems' in run));
  R.migrateRun(run);
  assert.equal(run.gold, 195);
  const sockets = run.deck.flatMap((card) => card.sockets).filter(Boolean);
  const result = R.applyBattle(run, defaultMeta(), { enc: { kind: 'elite' } }, { won: true, lanesWon: 2, gold: 10 });
  assert.ok(!('gem' in result));
  for (const event of EVENTS) {
    const copy = structuredClone(run);
    for (const choice of event.choices) if (!choice.can || choice.can(copy)) choice.apply(R.eventApi(copy));
    assert.ok(!('gems' in copy));
    assert.deepEqual(copy.deck.flatMap((card) => card.sockets).filter(Boolean).filter((g) => !sockets.includes(g)), []);
  }
});

test('fusion preserves installed gems and cannot create a loose reward', () => {
  const run = newRun();
  const a = R.makeInst(run, 'recruit', { sockets: ['ember', 'spark'] });
  const b = R.makeInst(run, 'recruit', { sockets: ['thrift', 'gilded'] });
  run.deck = [a, b];
  assert.deepEqual(R.fuseOptions(run), []);
  assert.equal(R.fuse(run, a.uid, b.uid), null);
  b.sockets.pop();
  assert.ok(R.fuse(run, a.uid, b.uid));
  assert.deepEqual(run.deck[0].sockets, ['ember', 'spark', 'thrift']);
  assert.ok(!('gems' in run));
});
