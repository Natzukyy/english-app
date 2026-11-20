// Fotogramas de la lluvia de calcomanías (celebración de subida de nivel), con y sin movimiento reducido.
async (page) => {
  const browser = page.context().browser();
  const out = {};
  for (const reducido of [false, true]) {
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, reducedMotion: reducido ? 'reduce' : 'no-preference' });
    await ctx.addInitScript(() => {
      window.__piezas = [];
      const captar = () => { document.getAnimations().forEach(a => { if (a.animationName === 'lluvia-cae' && !window.__piezas.includes(a)) { a.pause(); window.__piezas.push(a); } }); };
      document.addEventListener('animationstart', captar, true);
    });
    const p = await ctx.newPage();
    await p.goto('http://localhost:8000/#/inicio', { waitUntil: 'networkidle' });
    await p.evaluate(() => { window.App.Util.anotarCelebracion({ tipo: 'xp', nivel: 2 }); });
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(650);
    const tag = reducido ? 'reducido' : 'normal';
    out[tag] = await p.evaluate(() => ({ piezasPausadas: window.__piezas.length, contenedor: !!document.querySelector('.lluvia-calcomanias'), mensaje: document.querySelector('.celebracion-mensaje')?.textContent || null, bloquea: document.querySelector('.lluvia-calcomanias') ? getComputedStyle(document.querySelector('.lluvia-calcomanias')).pointerEvents : null, props: window.__piezas[0] ? Object.keys(window.__piezas[0].effect.getKeyframes()[0]).filter(k => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)) : [] }));
    if (!reducido) {
      for (let f = 0; f < 5; f++) {
        await p.evaluate((pct) => { window.__piezas.forEach(a => { const t = a.effect.getComputedTiming(); a.currentTime = (t.delay || 0) + pct * t.activeDuration; }); }, f / 4);
        await p.waitForTimeout(60);
        await p.screenshot({ path: 'docs/design-review/calcomanias-2/anim/12-lluvia-f' + f + '.png' });
      }
    } else {
      await p.screenshot({ path: 'docs/design-review/calcomanias-2/anim/12-lluvia-reducido.png' });
    }
    await ctx.close();
  }
  return out;
}
