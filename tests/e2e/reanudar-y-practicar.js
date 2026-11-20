// 6c + 6d (Playwright MCP: browser_run_code_unsafe con filename). Salir a mitad de un paso y
// retomar (incluso recargando), y practicar por cuenta propia sin tocar el plan guardado de hoy.
async (page) => {
  const browser = page.context().browser();
  const ctx = await browser.newContext({ serviceWorkers:'block', viewport:{width:390,height:844} });
  await ctx.addInitScript(() => { window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined; });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e=>errs.push(String(e)));
  const r = {};
  const clickTexto = (rx) => p.evaluate((src) => { const b=[...document.querySelectorAll('#pantalla button')].find(x=>!x.disabled && new RegExp(src,'i').test(x.textContent.trim())); if(b){b.click(); return true;} return false; }, rx);
  const hash = () => p.evaluate(()=>location.hash);
  const planHoy = () => p.evaluate(async()=>JSON.stringify((await window.App.Datos.obtenerOCalcularPlanDeHoy(new Date())).pasos));
  const boton = () => p.evaluate(()=>{const b=document.querySelector('#btn-empezar-plan'); return b?b.textContent.trim():null;});
  await p.goto('http://localhost:8000/#/inicio', { waitUntil: 'networkidle' });
  await p.evaluate(async()=>{ await window.App.Datos.guardarDiagnostico({porHabilidad:{lectura:{nivelCEFR:'A2'},habla:{nivelCEFR:'A2'},escucha:{nivelCEFR:'A2'},escritura:{nivelCEFR:'A2'}}}); localStorage.removeItem('rumboFlujoEnCurso'); await window.App.Storage.remove('plan', window.App.Fecha.hoyISO(new Date())); });
  await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(900);
  const plan0 = await planHoy();
  r.botonInicial = await boton();
  // --- 6c: empezar, avanzar 3 tarjetas, salir por la barra de navegación ---
  await p.click('#btn-empezar-plan'); await p.waitForTimeout(900);
  for (let i=0;i<3;i++){ await p.keyboard.press('Space'); await p.waitForTimeout(200); await p.keyboard.press('3'); await p.waitForTimeout(500); }
  r.hashEnPaso = await hash();
  await p.evaluate(()=>document.querySelector('nav.tabs button[data-ruta="inicio"]').click()); await p.waitForTimeout(1200);
  r.tras_salir = { hash: await hash(), boton: await boton(), pasoNombre: await p.evaluate(()=>document.querySelector('.tarjeta-principal-nombre')?.textContent), planIgual: (await planHoy())===plan0, completados: JSON.parse(await planHoy()).filter(x=>x.completado).length, flujo: await p.evaluate(()=>localStorage.getItem('rumboFlujoEnCurso')) };
  await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(1000);
  r.tras_recargar = { boton: await boton(), pasoNombre: await p.evaluate(()=>document.querySelector('.tarjeta-principal-nombre')?.textContent), completados: JSON.parse(await planHoy()).filter(x=>x.completado).length };
  await p.click('#btn-empezar-plan'); await p.waitForTimeout(900);
  r.retoma = { hash: await hash(), banner: await p.evaluate(()=>{const b=document.getElementById('banner-plan'); return b&&!b.hidden?b.textContent:null;}), contador: await p.evaluate(()=>document.querySelector('.repaso-contador')?.textContent) };
  // terminar el paso de verdad: ahora sí se marca
  for (let i=0;i<40;i++){ if (await clickTexto('^Terminar')) break; await p.keyboard.press('Space'); await p.waitForTimeout(150); await p.keyboard.press('3'); await p.waitForTimeout(450); }
  await p.waitForTimeout(1200);
  r.tras_terminar = { hash: await hash(), texto: await p.evaluate(()=>document.getElementById('pantalla').innerText.slice(0,50).replace(/\n+/g,' | ')), completados: JSON.parse(await planHoy()).filter(x=>x.completado).length };
  // --- 6d: practicar por cuenta propia: suma XP/minutos sin cambiar el plan ---
  const antes = await p.evaluate(async()=>({xp:(await window.App.Datos.obtenerXP()).total, min:((await window.App.Storage.get('sesiones', window.App.Fecha.hoyISO(new Date())))||{}).minutos||0, plan: JSON.stringify((await window.App.Datos.obtenerOCalcularPlanDeHoy(new Date())).pasos.map(x=>[x.tipo,x.habilidad,x.completado]))}));
  await p.goto('http://localhost:8000/#/practicar'); await p.waitForTimeout(800);
  await p.evaluate(()=>document.querySelector('[data-habilidad="lectura"]').click()); await p.waitForTimeout(1000);
  for (let i=0;i<30;i++){ if ((await hash())==='#/inicio') break;
    await p.evaluate(()=>{const o=[...document.querySelectorAll('.diagnostico-opcion')].filter(x=>!x.disabled); if(o.length && !o.some(x=>x.getAttribute('aria-current')==='true')) o[0].click();});
    await clickTexto('^(Ver preguntas|Responder|Comprobar|Siguiente|Ver resultado|Terminar)'); await p.waitForTimeout(250); }
  await p.waitForTimeout(1200);
  const despues = await p.evaluate(async()=>({xp:(await window.App.Datos.obtenerXP()).total, min:((await window.App.Storage.get('sesiones', window.App.Fecha.hoyISO(new Date())))||{}).minutos||0, plan: JSON.stringify((await window.App.Datos.obtenerOCalcularPlanDeHoy(new Date())).pasos.map(x=>[x.tipo,x.habilidad,x.completado])), ultima:(await window.App.Datos.obtenerUltimaPracticaPorHabilidad()).lectura}));
  r.practicar = { xpSuma: despues.xp-antes.xp, minSuma: despues.min-antes.min, planIgual: antes.plan===despues.plan, ultimaLectura: despues.ultima, hash: await hash() };
  await ctx.close();
  return { r, errs };
}
