import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultMeta, loadMeta, saveMeta } from '../src/core/save.js';
import { CARDS, CARD_LIST, TRIBES } from '../src/data/cards.js';
import { BOSS_ORDER, OPPONENTS } from '../src/data/enemies.js';
import { STARTER_DECK_LIST } from '../src/data/starterDecks.js';
import { ACHIEVEMENTS, cardUnlock } from '../src/data/achievements.js';
import { LEVELS, levelAvailable } from '../src/data/levels.js';
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

test('a shared battle opens two two-node routes that converge on each of eight bosses', () => {
  const run = newRun();
  const encountered = [];
  for (let act = 1; act <= R.ACTS; act++) {
    const [[battle], branches, stops, [boss]] = run.map.rows;
    assert.deepEqual(run.map.rows.map((row) => row.length), [1, 2, 2, 1]);
    assert.equal(battle.type, 'battle');
    assert.equal(boss.type, 'boss');
    assert.ok([...branches, ...stops].every((node) => !node.enc));
    assert.ok(stops.some((node) => ['gem', 'shop'].includes(node.type)));
    const col = act % 2;
    assert.deepEqual(R.availableNodes(run), [battle.id]);
    assert.equal(R.enterNode(run, branches[col].id), false);
    assert.equal(R.enterNode(run, battle.id), true);
    assert.deepEqual(R.availableNodes(run), branches.map((node) => node.id));
    const alternative = structuredClone(run);
    assert.equal(R.enterNode(run, stops[col].id), false);
    assert.equal(R.enterNode(run, branches[col].id), true);
    assert.deepEqual(R.availableNodes(run), [stops[col].id]);
    assert.equal(R.enterNode(run, branches[1 - col].id), false);
    assert.equal(R.enterNode(run, stops[1 - col].id), false);
    assert.equal(R.enterNode(run, boss.id), false);
    assert.equal(R.enterNode(run, stops[col].id), true);
    assert.deepEqual(R.availableNodes(run), [boss.id]);
    assert.equal(R.enterNode(run, boss.id), true);
    assert.equal(R.enterNode(alternative, branches[1 - col].id), true);
    assert.equal(R.enterNode(alternative, stops[1 - col].id), true);
    assert.deepEqual(R.availableNodes(alternative), [boss.id]);
    encountered.push(boss.enc.opponent);
    R.finishAct(run);
    assert.equal(run.over, act === R.ACTS ? 'victory' : false);
  }
  assert.equal(encountered.length, 8);
  assert.deepEqual(encountered, BOSS_ORDER);
  assert.equal(new Set(encountered).size, 8);
});

test('map migration updates unstarted stages and preserves a route already in use', () => {
  const run = newRun();
  run.v = 2;
  run.map.rows.shift();
  R.migrateRun(run);
  assert.deepEqual(run.map.rows.map((row) => row.length), [1, 2, 2, 1]);
  assert.equal(run.v, 7);

  run.v = 2;
  run.map.rows.shift();
  const [entry] = run.map.rows[0];
  run.pos = entry.id;
  run.node = { id: entry.id, type: entry.type, done: false };
  R.migrateRun(run);
  assert.equal(run.pos, entry.id);
  assert.equal(run.node.done, false);
  assert.deepEqual(run.map.rows.map((row) => row.length), [2, 2, 1]);
  R.finishAct(run);
  assert.deepEqual(run.map.rows.map((row) => row.length), [1, 2, 2, 1]);
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

test('Junk cards leave the card catalogue, decks, and existing saved offers', () => {
  assert.ok(CARD_LIST.every((card) => !/\bjunk\b/i.test(card.text)));
  for (const { deck } of Object.values(OPPONENTS)) {
    assert.equal(deck.length, 12);
    assert.ok(deck.every((id) => CARDS[id]));
  }

  const run = newRun();
  const [[battle], , , [boss]] = run.map.rows;
  run.v = 3;
  run.pos = boss.id;
  run.node = { id: boss.id, type: 'boss', done: true };
  run.pendingReward = { cards: ['avalanche', 'echo_bard', 'grand_choir'], bossRelics: ['star_map'] };
  const [card] = run.deck;
  Object.assign(card, { id: 'tinker', plus: 1, bonus: 2, sockets: ['ember', null] });
  const savedCard = { ...card, id: 'twin_blades' };
  R.migrateRun(run);
  assert.deepEqual(run.deck[0], savedCard);
  assert.deepEqual(R.nodeById(run, battle.id), battle);
  assert.equal(run.pendingReward.kind, 'boss');
  assert.deepEqual(run.pendingReward.bossRelics, ['star_map']);
  assert.ok(run.pendingReward.cards.every((id) => CARDS[id]?.rarity === 'rare'));
  assert.ok(run.pendingReward.cards.some((id) => CARDS[id].cost <= 2));
  const saved = structuredClone(run);
  R.migrateRun(run);
  assert.deepEqual(run, saved);

  run.v = 3;
  run.pendingReward = null;
  const items = [{ kind: 'card', id: 'scrap_thrower', price: 41, sold: false }];
  run.node = { type: 'shop', done: false, shop: { items } };
  R.migrateRun(run);
  assert.deepEqual(items, [{ kind: 'card', id: 'slinger', price: 41, sold: false }]);
});

test('all starter decks can start a fresh run and only change the initial cards', () => {
  assert.equal(STARTER_DECK_LIST.length, 5);
  const baseline = newRun();
  for (const starter of STARTER_DECK_LIST) {
    const run = R.newRun(defaultMeta(), starter.id, 0, 917);
    assert.equal(run.starterDeckId, starter.id);
    assert.equal(starter.cards.length, 12);
    assert.deepEqual(run.deck.map((card) => card.id), starter.cards);
    assert.deepEqual(run.relics, []);
    assert.deepEqual(run.unlocked, baseline.unlocked);
    assert.deepEqual(run.map, baseline.map);
    const battle = new Battle(run, encounter, 23);
    battle.start();
    assert.equal(battle.hand.length, DRAW_PER_TURN);
  }
});

test('former Warden purchases and active runs migrate to starter decks', () => {
  const meta = defaultMeta();
  meta.unlocked = ['warden_tide', 'warden_forge', 'gem_echo'];
  meta.shards = 5;
  saveMeta(meta);
  const migrated = loadMeta();
  assert.equal(migrated.shards, 75);
  assert.deepEqual(new Set(migrated.unlocked), new Set(['gem_echo', ...ACHIEVEMENTS.filter((a) => ['cache_tide', 'relics_tide', 'locs_tide', 'cache_siege'].includes(a.legacy)).map((a) => a.id)]));
  assert.deepEqual(loadMeta(), migrated);

  const run = R.newRun(meta, 'tidecaller', 0, 917);
  run.v = 5;
  run.warden = run.starterDeckId;
  delete run.starterDeckId;
  run.relics = ['lodestone'];
  run.pos = run.map.rows[0][0].id;
  run.deck[0].sockets[0] = 'ember';
  const expected = structuredClone(run);
  expected.v = 7;
  expected.starterDeckId = expected.warden;
  delete expected.warden;
  assert.deepEqual(R.migrateRun(run), expected);
});

test('each former cache card earns an individual unlock for future drafts and shops', () => {
  const expected = CARD_LIST.map(cardUnlock).filter(Boolean).sort();
  const listed = ACHIEVEMENTS.filter((a) => a.kind === 'Cards').map((a) => a.id).sort();
  assert.deepEqual(listed, expected);
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
  const meta = defaultMeta();
  const run = R.newRun(meta, 'tidecaller', 0, 917);
  const [[node]] = run.map.rows;
  for (let i = 0; i < 2; i++) {
    R.applyBattle(run, meta, node, { won: false, lanesWon: 0, gold: 0, progress: { moves: 1 } });
  }
  assert.deepEqual(meta.unlocked, ['card_blink_fox']);
  assert.deepEqual(run.earnedAchievements, ['card_blink_fox']);
  assert.ok(!R.cardPool(run).some((card) => card.id === 'blink_fox'));
  const next = R.newRun(meta, 'bastion', 0, 917);
  assert.ok(R.cardPool(next).some((card) => card.id === 'blink_fox'));
  assert.ok(!R.cardPool(next).some((card) => card.id === 'wind_dancer'));
});

test('levels unlock one step at a time after boss wins and leave Heat with the full run', () => {
  const meta = defaultMeta();
  assert.ok(levelAvailable(meta, 1));
  assert.equal(R.startLevel(meta, 2), null);
  const defeated = R.startLevel(meta, 1, 'bastion', 917);
  R.applyBattle(defeated, meta, defeated.map.rows.at(-1)[0], { won: false, lanesWon: 0, gold: 0 });
  assert.equal(defeated.over, 'defeat');
  assert.equal(R.endRun(defeated, meta).nextLevel, null);
  assert.equal(meta.levelsCleared, 0);

  for (const level of LEVELS) {
    const run = R.startLevel(meta, level.id, 'bastion', 917);
    const boss = run.map.rows.at(-1)[0];
    assert.equal(boss.enc.opponent, level.boss);
    assert.equal(boss.enc.bonus, level.extraPower);
    assert.equal(R.startLevel(meta, level.id + 1), null);
    R.applyBattle(run, meta, boss, { won: true, lanesWon: 3, gold: 15 });
    assert.equal(run.over, 'victory');
    assert.equal(meta.levelsCleared, level.id);
    assert.equal(R.endRun(run, meta).nextLevel, level.id === LEVELS.length ? null : level.id + 1);
    assert.equal(meta.maxHeat, 0);
  }
  assert.ok(R.startLevel(meta, 1));
});

test('fight rewards spread across energy costs and keep the encounter rarity floor', () => {
  const band = (id) => Math.ceil(CARDS[id].cost / 2);
  const floors = { battle: ['common', 'uncommon', 'rare', 'legendary'], boss: ['rare', 'legendary'] };
  for (const [kind, rarities] of Object.entries(floors)) {
    const run = newRun();
    const twoCardBands = new Set();
    for (let count = 2; count <= 4; count++) {
      for (let i = 0; i < 24; i++) {
        const choices = R.rollRewardCards(run, kind, count);
        assert.equal(new Set(choices).size, count);
        assert.ok(choices.every((id) => rarities.includes(CARDS[id].rarity)));
        const bands = [...new Set(choices.map(band))].sort();
        if (count === 2) {
          assert.equal(bands.length, 2);
          assert.equal(bands[0], 1);
          twoCardBands.add(bands[1]);
        } else {
          assert.deepEqual(bands, [1, 2, 3]);
        }
      }
    }
    assert.deepEqual([...twoCardBands].sort(), [2, 3]);
  }

  const run = newRun();
  run.banishes = 2;
  const [, , , [boss]] = run.map.rows;
  R.applyBattle(run, defaultMeta(), boss, { won: true, lanesWon: 2, gold: 10 });
  const { cards } = run.pendingReward;
  const index = cards.findIndex((id) => band(id) === 1);
  const original = cards.slice();
  assert.equal(R.banishRewardCard(run, index), original[index]);
  assert.notEqual(cards[index], original[index]);
  assert.equal(band(cards[index]), 1);
  assert.deepEqual(cards.filter((_, i) => i !== index), original.filter((_, i) => i !== index));
  R.banishRewardCard(run, index);
  assert.equal(new Set(cards).size, 3);
  assert.ok(cards.every((id) => CARDS[id].rarity === 'rare' && !run.banished.includes(id)));
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

test('Evo Gems offer and complete an evolution at the Gem node', () => {
  const run = newRun();
  const meta = defaultMeta();
  const ordinary = run.deck.find((c) => c.id === 'spearman');
  const base = run.deck.find((c) => c.id === 'recruit');
  const catalyst = run.deck.find((c) => c.id === 'drummer');
  run.deck = [base, ordinary];
  assert.equal(R.canOfferGem(run, 'evo'), false);
  for (let i = 0; i < 20; i++) {
    assert.ok(!R.rollGemChoices(run).includes('evo'));
    assert.ok(!R.rollShop(run).items.some((item) => item.id === 'evo'));
  }
  run.node = { type: 'gem', done: false, gemChoices: ['evo', 'thrift'] };
  assert.equal(R.claimGem(run, 'ember', ordinary.uid), false);
  assert.equal(R.claimGem(run, 'evo', base.uid, { meta, catalystUid: catalyst.uid }), false);
  assert.equal(run.node.done, false);
  run.deck.push(catalyst);
  for (const card of run.deck) card.sockets = ['ember'];
  assert.equal(R.canSocket(base, 'evo'), false);
  assert.deepEqual(R.rollGemChoices(run), ['evo']);
  assert.equal(R.claimGem(run, 'evo', base.uid, { meta, catalystUid: ordinary.uid }), false);
  assert.equal(R.claimGem(run, 'evo', base.uid, { meta, catalystUid: catalyst.uid }), true);
  assert.equal(base.id, 'champion');
  assert.deepEqual(base.sockets, ['ember']);
  assert.equal(meta.recipes.champion, true);
  assert.ok(!run.deck.includes(catalyst));
  assert.equal(run.gold, 60);
  assert.equal(R.claimGem(run, 'thrift', ordinary.uid), false);
});

test('the shop charges for an Evo Gem only when the selected pair evolves', () => {
  const run = newRun();
  run.gold = 100;
  const shop = { items: [{ kind: 'gem', id: 'evo', price: 90, sold: false }] };
  const meta = defaultMeta();
  const { base, catalyst, recipe } = R.evoOptions(run)[0];
  assert.equal(R.buy(run, shop, 0, base.uid), false);
  assert.equal(R.buy(run, shop, 0, base.uid, { meta, catalystUid: catalyst.uid }), true);
  assert.equal(run.gold, 10);
  assert.equal(shop.items[0].sold, true);
  assert.equal(base.id, recipe.result);
  assert.deepEqual(base.sockets, [null]);
  assert.equal(R.buy(run, shop, 0, base.uid, { meta, catalystUid: catalyst.uid }), false);
});

test('migration refunds reserved Evo Gems and replaces retired nodes without losing progress', () => {
  const run = newRun();
  run.v = 1;
  run.gems = ['ember', 'evo'];
  run.deck[0].sockets[0] = 'spark';
  run.deck[1].sockets = ['evo', 'ember'];
  const [[battle], [event]] = run.map.rows;
  battle.type = 'elite';
  battle.enc = { kind: 'elite', opponent: 'elite_ram' };
  event.type = 'event';
  run.pos = event.id;
  run.visited = [battle.id, event.id];
  run.node = { id: event.id, type: 'event', done: false, result: 'Relic gained' };
  const next = R.availableNodes(run);
  R.migrateRun(run);
  assert.equal(run.gold, 285);
  assert.equal(run.deck[0].sockets[0], 'spark');
  assert.deepEqual(run.deck[1].sockets, [null, 'ember']);
  assert.ok(!('gems' in run));
  assert.equal(battle.enc.kind, 'battle');
  assert.ok(OPPONENTS[battle.enc.opponent]);
  assert.ok(R.NODE_INFO[event.type]);
  assert.equal(run.node.type, event.type);
  assert.equal(run.node.done, true);
  assert.deepEqual(R.availableNodes(run), next);
  R.migrateRun(run);
  assert.equal(run.gold, 285);
});

test('new cards start with one socket and fusion preserves capacity and gems', () => {
  const run = R.newRun(defaultMeta(), 'forgemaster', 0, 917);
  assert.ok(run.deck.every((card) => card.sockets.length === 1));
  assert.ok(CARD_LIST.every((card) => R.makeInst(run, card.id).sockets.length === 1));
  const a = R.makeInst(run, 'recruit', { sockets: ['ember'] });
  const b = R.makeInst(run, 'recruit', { sockets: ['thrift'] });
  run.deck = [a, b];
  assert.deepEqual(R.fuseOptions(run), []);
  assert.equal(R.fuse(run, a.uid, b.uid), null);
  a.sockets[0] = null;
  assert.ok(R.fuse(run, a.uid, b.uid));
  assert.deepEqual(run.deck[0].sockets, ['thrift']);
});

test('Campfire restores the current heart maximum once per visit', () => {
  const run = newRun();
  run.hearts = 1;
  run.maxHearts = 4;
  run.node = { type: 'camp', done: false };
  const deck = structuredClone(run.deck);
  R.restAtCamp(run);
  assert.equal(run.hearts, 4);
  assert.equal(run.node.heartsRestored, 3);
  R.restAtCamp(run);
  assert.equal(run.node.heartsRestored, 3);
  assert.deepEqual(run.deck, deck);
});
