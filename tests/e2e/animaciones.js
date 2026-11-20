// Tarea 5: fotogramas de cada animación (pausadas y recorridas al 0/25/50/75/100 %) + qué
// propiedades anima cada una (deben ser solo transform/opacity). Playwright MCP, con filename.
async (page) => {
  const browser = page.context().browser();
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => {
    // Reconocimiento de voz simulado (el MCP no tiene micrófono): start() emite un resultado y termina.
    class FakeRec extends EventTarget {
      start() { setTimeout(() => {
        const res = Object.assign([{ transcript: window.__fraseHablada || 'I go to school by bus' }], { isFinal: true });
        const ev = new Event('result'); ev.resultIndex = 0; ev.results = [res]; this.dispatchEvent(ev);
        setTimeout(() => this.dispatchEvent(new Event('end')), 50);
      }, window.__recDelay || 400); }
      stop() {} abort() {}
    }
    window.SpeechRecognition = FakeRec; window.webkitSpeechRecognition = FakeRec;
    window.__anim = [];
    const RUIDO = /^(color|background-color|border-.*-color|outline.*|border-color|text-decoration.*)$/;
    const captar = () => { document.getAnimations().forEach(a => {
      if (window.__anim.includes(a)) return;
      if (a.transitionProperty && RUIDO.test(a.transitionProperty)) return;
      try { a.pause(); window.__anim.push(a); } catch (e) {} }); };
    document.addEventListener('animationstart', captar, true);
    document.addEventListener('transitionrun', captar, true);
  });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const out = {}; const props = {};
  const DIR = 'docs/design-review/calcomanias-2/anim/';
  const info = () => p.evaluate(() => window.__anim.map(a => {
    const k = (a.effect && a.effect.getKeyframes) ? a.effect.getKeyframes() : []; const t = a.effect.getComputedTiming();
    const pr = new Set(); k.forEach(f => Object.keys(f).forEach(n => { if (!['offset', 'easing', 'composite', 'computedOffset'].includes(n)) pr.add(n); }));
    const el = a.effect.target; const pseudo = a.effect.pseudoElement || ''; const r = el ? el.getBoundingClientRect() : { x: 0, y: 0, width: 0, height: 0 };
    return { nombre: (a.animationName || ('transition:' + a.transitionProperty)) + pseudo, props: [...pr], dur: Math.round(t.duration), iter: t.iterations === Infinity ? 'inf' : t.iterations, sel: el ? (el.id ? '#' + el.id : el.className && el.className.baseVal === undefined ? '.' + String(el.className).split(' ')[0] : el.tagName) : '?', r: [r.x, r.y, r.width, r.height].map(Math.round) };
  }));
  async function frames(nombre, max) {
    const vistos = new Set(); const lista = (await info()).filter(a => a.r[2] > 0 && !vistos.has(a.nombre + a.sel) && vistos.add(a.nombre + a.sel)).slice(0, max || 6);
    out[nombre] = lista.map(a => ({ nombre: a.nombre, props: a.props.join(','), dur: a.dur, iter: a.iter, sel: a.sel }));
    lista.forEach(a => a.props.forEach(pp => { props[pp] = (props[pp] || new Set()).add(a.nombre); }));
    const total = (await p.evaluate(() => window.__anim.length));
    out[nombre + '__total'] = total;
    if (!lista.length) return;
    // recuadro que une a los objetivos (limitado al viewport)
    const x0 = Math.max(0, Math.min(...lista.map(a => a.r[0])) - 20), y0 = Math.max(0, Math.min(...lista.map(a => a.r[1])) - 20);
    const x1 = Math.min(390, Math.max(...lista.map(a => a.r[0] + a.r[2])) + 20), y1 = Math.min(844, Math.max(...lista.map(a => a.r[1] + a.r[3])) + 20);
    for (let f = 0; f < 5; f++) {
      await p.evaluate((pct) => { window.__anim.forEach(a => { try { const t = a.effect.getComputedTiming(); const fin = t.iterations === Infinity ? t.duration : t.endTime; a.currentTime = pct * (isFinite(fin) ? fin : 1000); } catch (e) {} }); }, f / 4);
      await p.waitForTimeout(60);
      await p.screenshot({ path: DIR + nombre + '-f' + f + '.png', clip: { x: x0, y: y0, width: Math.max(40, x1 - x0), height: Math.max(40, y1 - y0) } });
    }
    await p.evaluate(() => { window.__anim.forEach(a => { try { a.finish(); } catch (e) { a.cancel(); } }); window.__anim = []; });
  }
  // Termina (o cancela, si son infinitas) lo que mi propia captura dejó en pausa: una animación de
  // entrada pausada sigue controlando "transform" y ocultaría las transiciones posteriores.
  const reset = () => p.evaluate(() => { document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { a.cancel(); } }); window.__anim = []; });
  const seed = (extra) => p.evaluate(async (extra) => {
    await window.App.Datos.guardarDiagnostico({ porHabilidad: { lectura: { nivelCEFR: 'A2' }, habla: { nivelCEFR: 'A2' }, escucha: { nivelCEFR: 'A2' }, escritura: { nivelCEFR: 'A2' } } });
    if (extra) await extra();
  });
  await p.goto('http://localhost:8000/#/inicio', { waitUntil: 'networkidle' }); await seed();
  // S1 pop de entrada (Practicar)
  await reset(); await p.goto('http://localhost:8000/#/practicar'); await p.waitForTimeout(500); await frames('01-pop-entrada-practicar', 4);
  // S3 volteo de tarjeta + S4 salida al calificar (Repaso)
  await reset(); await p.goto('http://localhost:8000/#/repaso'); await p.waitForTimeout(1800); await reset();
  await p.keyboard.press('Space'); await p.waitForFunction(() => document.querySelector('#repaso-marco.revelada')); await p.waitForTimeout(40); await frames('03-volteo-tarjeta', 4);
  await p.waitForTimeout(500); await reset();
  await p.keyboard.press('3'); await p.waitForTimeout(40); await frames('04-salida-tarjeta-al-calificar', 4);
  await p.waitForTimeout(900); await reset();
  // S5 sacudida en error (Diagnóstico): responder 'a' hasta que alguna sea incorrecta
  await p.goto('http://localhost:8000/#/diagnostico'); await p.waitForTimeout(1000);
  for (let i = 0; i < 12; i++) { await reset(); await p.keyboard.press('a'); await p.keyboard.press('Enter'); await p.waitForTimeout(100);
    const nom = await p.evaluate(() => window.__anim.map(a => a.animationName)); if (nom.some(n => /sacud|shake/i.test(n))) { await frames('05-sacudida-error', 12); break; }
    if (i === 11) out['05-sacudida-error'] = 'no se observó sacudida'; await p.keyboard.press('Enter'); await p.waitForTimeout(250); }
  // S6 barras (Progreso) + count-up
  await reset(); await p.goto('http://localhost:8000/#/progreso');
  out['06b-count-up'] = await p.evaluate(async () => { const m = []; for (let i = 0; i < 10; i++) { m.push(document.querySelector('#valor-xp')?.textContent); await new Promise(r => setTimeout(r, 90)); } return m; });
  await reset(); await p.goto('http://localhost:8000/#/inicio'); await p.goto('http://localhost:8000/#/progreso'); await p.waitForTimeout(120); await frames('06-barras-progreso', 6);
  // S7 sol de racha (siempre gira) y pulso al cumplir la meta
  await p.evaluate(async () => { await window.App.Datos.registrarSesion(20, 5, new Date()); });
  await reset(); await p.goto('http://localhost:8000/#/inicio'); await p.waitForTimeout(700); await frames('07-sol-racha-pulso', 6);
  // S8 palomita + marcador (Inicio con pasos hechos)
  await p.evaluate(async () => { const hoy = window.App.Fecha.hoyISO(new Date()); await window.App.Storage.put('plan', { id: hoy, totalMinutos: 18, pasos: [{ tipo: 'repaso', minutos: 8, completado: true, tarjetasVencidas: 0, tarjetasNuevas: 15 }, { tipo: 'practica', habilidad: 'habla', minutos: 10, completado: false, nivelCEFR: 'A2' }] }); });
  await reset(); await p.goto('http://localhost:8000/#/inicio'); await p.reload(); await p.waitForTimeout(500); await frames('08-palomita-y-estrella', 6);
  // S10 ondas del micrófono + S11 chips en cascada (Habla)
  await p.evaluate(() => { window.__recDelay = 5000; });
  await reset(); await p.goto('http://localhost:8000/#/habla'); await p.waitForTimeout(900); await reset();
  await p.evaluate(() => document.getElementById('btn-hablar').click()); await p.waitForTimeout(150); await frames('10-ondas-microfono', 4);
  await p.evaluate(() => { window.__recDelay = 100; }); await p.goto('http://localhost:8000/#/habla'); await p.waitForTimeout(900); await reset();
  await p.evaluate(() => document.getElementById('btn-hablar').click()); await p.waitForSelector('.habla-chip', { timeout: 4000 }).catch(() => {}); await p.waitForTimeout(40); await frames('11-resultado-habla-chips', 8);
  // S12 lluvia de calcomanías
  await p.evaluate(() => { window.App.Util.anotarCelebracion({ tipo: 'xp', nivel: 2 }); });
  await reset(); await p.goto('http://localhost:8000/#/inicio'); await p.reload(); await p.waitForTimeout(700); await frames('12-lluvia', 30);
  await ctx.close();
  const resumenProps = Object.fromEntries(Object.entries(props).map(([k, v]) => [k, [...v]]));
  return { out, propiedadesAnimadas: resumenProps, errs };
}
