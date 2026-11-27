import sys, asyncio
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5173/'
W = int(sys.argv[2]) if len(sys.argv) > 2 else 1280
H = int(sys.argv[3]) if len(sys.argv) > 3 else 800
TAG = sys.argv[4] if len(sys.argv) > 4 else 'd'

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': W, 'height': H}, device_scale_factor=1, has_touch=False)
        logs = []
        pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
        await pg.goto(URL)
        await pg.evaluate("localStorage.clear()")
        await pg.reload()
        await pg.wait_for_timeout(2500)
        await pg.screenshot(path=f'shots/{TAG}_title.png')
        await pg.click('[data-a=newRun]'); await pg.wait_for_timeout(400)
        await pg.screenshot(path=f'shots/{TAG}_wardens.png')
        await pg.click('[data-a=startRun]'); await pg.wait_for_timeout(600)
        await pg.click('.node.avail'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'shots/{TAG}_map.png')
        await pg.click('[data-a=enterNode]'); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=f'shots/{TAG}_battle0.png')
        for turn in range(6):
            # play cards by tapping hand card then lane center
            for k in range(4):
                ok = await pg.evaluate("""() => { const G = window.__G; const b = G.battle; if (!b || b.over) return null;
                    for (const hc of b.hand) for (const l of [0,2,1]) if (b.canPlay(hc.hid,l).ok) return [hc.hid,l]; return null; }""")
                if not ok: break
                hid, lane = ok
                await pg.click(f'.hc[data-hid="{hid}"]'); await pg.wait_for_timeout(150)
                pos = await pg.evaluate(f"""() => {{ const G=window.__G; const c=document.getElementById('gl').getBoundingClientRect(); return null; }}""")
                # tap lane: compute screen x from lane index
                box = await pg.evaluate("""(lane) => { const c=document.getElementById('gl').getBoundingClientRect(); const G=window.__G; return [c.left + c.width/2 + [-1,0,1][lane]*Math.min(c.width*0.3, c.height*0.28), c.top + c.height*0.78]; }""", lane)
                await pg.mouse.click(box[0], box[1]); await pg.wait_for_timeout(250)
            if turn == 2:
                await pg.screenshot(path=f'shots/{TAG}_battle2.png')
            await pg.click('[data-a=endTurn]'); await pg.wait_for_timeout(700)
        await pg.wait_for_timeout(800)
        await pg.screenshot(path=f'shots/{TAG}_result.png')
        await pg.click('[data-a=afterBattle]'); await pg.wait_for_timeout(500)
        await pg.screenshot(path=f'shots/{TAG}_reward.png')
        await pg.click('[data-a=takeCard]'); await pg.wait_for_timeout(500)
        await pg.screenshot(path=f'shots/{TAG}_map2.png')
        for l in logs[:40]: print(l)
        await b.close()

asyncio.run(main())
