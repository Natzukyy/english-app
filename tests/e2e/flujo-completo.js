async (page) => {
  const browser = page.context().browser();
  const ctx = await browser.newContext({ serviceWorkers:'block', viewport:{width:1440,height:900} });
  await ctx.addInitScript(() => { window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined; });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e=>errs.push(String(e)));
  const log = [];
  const hash = () => p.evaluate(()=>location.hash);
  async function clickTexto(rx) {
    return p.evaluate((src) => { const r = new RegExp(src,'i'); const b=[...document.querySelectorAll('#pantalla button')].find(x=>!x.disabled && r.test(x.textContent.trim())); if(b){b.click(); return b.textContent.trim().slice(0,20);} return null; }, rx);
  }
  async function resolverPantalla() {
    const ruta = (await hash()).replace('#/','');
    for (let i=0;i<90;i++) {
      if ((await hash()) === '#/inicio') return;
      if (ruta==='repaso') { await p.keyboard.press('Space'); await p.waitForTimeout(150); await p.keyboard.press('3'); await p.waitForTimeout(450); await clickTexto('^(Terminar)'); continue; }
      if (ruta==='escucha') await p.evaluate(()=>document.getElementById('btn-escuchar')?.click());
      if (ruta==='habla') { await p.evaluate(()=>document.getElementById('btn-hablar')?.click()); await clickTexto('Me sali'); }
      if (ruta==='escritura') { await p.evaluate(()=>{const t=document.getElementById('campo-escritura'); if(t&&!t.value){t.value='Hello, my name is Alex and I live in Mexico. I study engineering and I like to learn English every day.'; t.dispatchEvent(new Event('input',{bubbles:true}));}}); }
      const opc = await p.evaluate(()=>{const o=[...document.querySelectorAll('.diagnostico-opcion')].filter(x=>!x.disabled); const sel=o.some(x=>x.getAttribute('aria-current')==='true'||x.classList.contains('seleccionada')); if(o.length && !sel){o[0].click(); return true;} return false;});
      if (opc) { await p.waitForTimeout(120); }
      await clickTexto('^(Ver preguntas|Terminar de escribir|Responder|Comprobar|Siguiente|Ver resultado|Finalizar|Terminar)');
      await p.waitForTimeout(250);
    }
  }
  await p.goto('http://localhost:8000/#/inicio', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  log.push('inicio: '+await p.evaluate(()=>document.querySelector('.tarjeta-principal-nombre').textContent));
  await p.click('#btn-empezar-plan'); await p.waitForTimeout(800);
  for (let i=0;i<60;i++){ if(!await p.$('.diagnostico-opcion')) break; await p.keyboard.press('a'); await p.keyboard.press('Enter'); await p.waitForTimeout(50); await p.keyboard.press('Enter'); await p.waitForTimeout(50);}
  for (let k=0;k<2;k++){ await p.waitForTimeout(300); await p.evaluate(()=>document.querySelector('.diagnostico-rubrica-fila')?.click()); await p.waitForTimeout(300); await clickTexto('^(Siguiente|Continuar|Ver resultado)'); }
  await p.waitForTimeout(800);
  await clickTexto('Ver progreso'); await p.waitForTimeout(500);
  await p.evaluate(()=>{location.hash='#/inicio';}); await p.waitForTimeout(1200);
  log.push('vuelta a inicio: '+await p.evaluate(()=>document.getElementById('pantalla').innerText.slice(0,70).replace(/\n+/g,' | ')));
  const planTrasDiag = await p.evaluate(async()=>(await window.App.Datos.obtenerOCalcularPlanDeHoy(new Date())).pasos.map(x=>x.tipo+(x.habilidad?':'+x.habilidad:'')+(x.completado?'✔':'✗')));
  for (let paso=0; paso<8; paso++) {
    const hay = await p.$('#btn-empezar-plan'); const cont = await p.$('#btn-continuar-flujo'); const cierre = await p.$('#btn-cerrar-dia');
    if (hay) await hay.click(); else if (cont) await cont.click(); else if (cierre) { log.push('CIERRE DEL DÍA visible'); await p.screenshot({path:'docs/design-review/calcomanias-2/e2e-cierre-del-dia.png'}); await cierre.click(); break; } else { log.push('sin botón; '+await hash()); break; }
    await p.waitForTimeout(700);
    log.push('paso → '+(await hash())+' banner='+await p.evaluate(()=>{const b=document.getElementById('banner-plan'); return b&&!b.hidden?b.textContent:null;}));
    await resolverPantalla(); await p.waitForTimeout(900);
  }
  await p.waitForTimeout(800);
  const final = await p.evaluate(async()=>{const pl=await window.App.Datos.obtenerOCalcularPlanDeHoy(new Date()); return {plan:pl.pasos.map(x=>x.tipo+(x.habilidad?':'+x.habilidad:'')+(x.completado?'✔':'✗')), xp:(await window.App.Datos.obtenerXP()).total, racha:(await window.App.Datos.obtenerEstadoRacha()).rachaActual, minutos:(await window.App.Storage.getAll('sesiones')).map(s=>s.minutos), tarjetasRepasadas:(await window.App.Storage.getAll('srs_cards')).filter(c=>c.repeticiones>0).length};});
  await ctx.close();
  return { planTrasDiag, log, final, errs };
}
