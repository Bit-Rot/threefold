import sys, asyncio
from playwright.async_api import async_playwright
URL = 'http://127.0.0.1:5173/'
W = int(sys.argv[1]) if len(sys.argv) > 1 else 1280
H = int(sys.argv[2]) if len(sys.argv) > 2 else 800
TAG = sys.argv[3] if len(sys.argv) > 3 else 's'

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': W, 'height': H})
        logs = []
        pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
        pg.on('console', lambda m: logs.append(m.text) if m.type == 'error' and '404' not in m.text else None)
        await pg.goto(URL); await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(2000)
        # give lots of shards + unlock all, start a run
        await pg.evaluate("""() => { const G = window.__G; G.meta.shards = 999; }""")
        await pg.click('[data-a=archive]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'shots/{TAG}_archive.png')
        await pg.evaluate("""() => { const G = window.__G; G.meta.unlocked = ['warden_tide','warden_pyre','warden_hex','warden_forge','cache_patience','cache_tribes','cache_gold','cache_crowns','gem_echo','gem_bulwark','gem_drift','perk_scout','perk_reroll','perk_skip','perk_banish','relics_rare','relics_tribes','locs_mystic']; G.meta.maxHeat = 3; }""")
        await pg.click('[data-a=title]'); await pg.click('[data-a=newRun]'); await pg.wait_for_timeout(300)
        await pg.click('[data-a=pickWarden][data-id=tidecaller]'); await pg.click('[data-a=heat][data-d="1"]'); await pg.wait_for_timeout(200)
        await pg.screenshot(path=f'shots/{TAG}_wardens.png')
        await pg.click('[data-a=startRun]'); await pg.wait_for_timeout(400)
        await pg.evaluate("""() => { const G = window.__G; G.run.gold = 500; G.run.deck.push(window.__R.makeInst(G.run,'slinger'), window.__R.makeInst(G.run,'ballista')); }""")
        for t in ['shop', 'gem', 'forge', 'home', 'camp', 'treasure', 'purge', 'mirror']:
            await pg.evaluate("""(t) => { const r = window.__G.run; const n = r.map.rows[1][0]; n.type = t; r.pos = r.map.rows[0][0].id; r.node = null; window.__openNode(n.id); }""", t)
            await pg.wait_for_timeout(400)
            await pg.screenshot(path=f'shots/{TAG}_{t}.png')
            if t == 'gem':
                btn = await pg.query_selector('[data-a=chooseGem][data-id=evo]')
                if btn:
                    await btn.click()
                    await pg.screenshot(path=f'shots/{TAG}_gem_evo.png')
                    await pg.click('[data-a=closeModal]')
        await pg.evaluate("""() => { window.__G.modal = { type: 'deck' }; }""")
        await pg.click('[data-a=deck]'); await pg.wait_for_timeout(400)
        await pg.screenshot(path=f'shots/{TAG}_deck.png')
        await pg.click('[data-a=closeModal]')
        await pg.evaluate("""() => { const G = window.__G; G.screen='codex'; }""")
        await pg.click('[data-a=menu]'); await pg.click('[data-a=saveQuit]'); await pg.click('[data-a=codex]'); await pg.wait_for_timeout(300)
        await pg.click('[data-a=codexTab][data-t=Enemies]'); await pg.wait_for_timeout(500)
        await pg.screenshot(path=f'shots/{TAG}_codex.png')
        # boss battle
        await pg.click('[data-a=title]'); await pg.click('[data-a=continue]'); await pg.wait_for_timeout(500)
        await pg.evaluate("""() => { const r = window.__G.run; const boss = r.map.rows.at(-1)[0]; r.pos = r.map.rows.at(-2)[0].id; r.node = null; window.__openNode(boss.id); }""")
        await pg.wait_for_timeout(1500)
        await pg.screenshot(path=f'shots/{TAG}_boss.png')
        for l in logs[:30]: print(l)
        await b.close()
asyncio.run(main())
