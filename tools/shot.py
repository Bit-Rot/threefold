import sys, asyncio
from playwright.async_api import async_playwright
async def main(url, out, w=1300, h=900, wait=1500, mobile=False):
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':w,'height':h}, device_scale_factor=1)
        logs=[]
        pg.on('console', lambda m: logs.append(m.type+': '+m.text))
        pg.on('pageerror', lambda e: logs.append('PAGEERROR: '+str(e)))
        await pg.goto(url); await pg.wait_for_timeout(wait)
        await pg.screenshot(path=out, full_page=False)
        for l in logs[:30]: print(l)
        await b.close()
a=sys.argv
asyncio.run(main(a[1], a[2], int(a[3]) if len(a)>3 else 1300, int(a[4]) if len(a)>4 else 900))
