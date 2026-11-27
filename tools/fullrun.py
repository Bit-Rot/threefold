import sys, asyncio
from playwright.async_api import async_playwright
W = int(sys.argv[1]) if len(sys.argv) > 1 else 1280
H = int(sys.argv[2]) if len(sys.argv) > 2 else 800
STARTER_DECK = sys.argv[3] if len(sys.argv) > 3 else 'bastion'
JS = """async (starterDeck) => {
  const G = window.__G, A = window.__A, R = window.__R;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  G.meta.unlocked = ['cache_tide','cache_ash','cache_hex','cache_siege','relics_tide','relics_ash','relics_hex','locs_tide','perk_skip','perk_reroll','perk_scout'];
  A.newRun(); A.pickStarterDeck({id: starterDeck}); A.startRun();
  const seen = new Set(); let steps = 0;
  while (steps++ < 400) {
    await sleep(30);
    const s = G.screen; seen.add(s);
    if (s === 'summary') return {ok: true, seen: [...seen], victory: G.summary.victory, act: G.summary.run.act, fights: G.summary.run.fights};
    if (s === 'map') { const av = R.availableNodes(G.run); A.enterNode({id: av[steps % av.length]}); continue; }
    if (s === 'battle') {
      const b = G.battle;
      if (b.over) { A.afterBattle(); continue; }
      for (let k = 0; k < 6; k++) { let best = null; for (const hc of b.hand) for (const l of [0,1,2]) if (b.canPlay(hc.hid,l).ok) { best = [hc.hid,l]; break; } if (!best) break; b.play(best[0], best[1]); }
      A.endTurn(); continue;
    }
    if (s === 'reward') { const pr = G.run.pendingReward; if (pr.bossRelics) A.bossRelic({id: pr.bossRelics[0]}); else A.takeCard({i: 0}); continue; }
    if (s === 'home') { A.pickHome({id: G.run.node.choices[0]}); continue; }
    if (s === 'camp') { A.leaveNode(); continue; }
    if (s === 'purge') { A.purgeCard({uid: G.run.deck[0].uid}); continue; }
    if (s === 'mirror') { A.mirrorCard({uid: G.run.deck[G.run.deck.length-1].uid}); continue; }
    if (s === 'shop') { A.buy({i: 0}); A.leaveNode(); continue; }
    if (s === 'gem') {
      const id = G.run.node.gemChoices[0];
      if (id === 'evo') {
        const { base, catalyst } = R.evoOptions(G.run)[0];
        A.chooseGem({id}); A.confirmEvo({uid: base.uid, catalyst: catalyst.uid});
        continue;
      }
      const card = G.run.deck.find((c) => R.canSocket(c, id));
      if (card) { A.chooseGem({id}); A.modalPick({uid: card.uid}); } else A.leaveNode();
      continue;
    }
    if (['forge','treasure'].includes(s)) { A.leaveNode(); continue; }
    return {ok: false, stuck: s};
  }
  return {ok: false, steps};
}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': W, 'height': H})
        logs = []
        pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
        pg.on('console', lambda m: logs.append(m.text) if m.type == 'error' and '404' not in m.text else None)
        await pg.goto('http://127.0.0.1:5173/'); await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(1500)
        res = await pg.evaluate(JS, STARTER_DECK)
        print(res)
        await pg.screenshot(path=f'shots/fullrun_{STARTER_DECK}.png')
        for l in logs[:20]: print(l)
        await b.close()
asyncio.run(main())
