// 6e: con el service worker activo, recargar SIN internet y completar un paso.
async (page) => {
  const browser = page.context().browser();
  const ctx = await browser.newContext({ viewport:{width:390,height:844} }); // serviceWorkers: permitido
  await ctx.addInitScript(() => { window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined; });
  const p = await ctx.newPage(); const errs=[]; const fallidas=[];
  p.on('pageerror', e=>errs.push(String(e))); p.on('requestfailed', r=>fallidas.push(r.url().replace('http://localhost:8000','')));
  const r = {};
  await p.goto('http://localhost:8000/#/inicio', { waitUntil: 'networkidle' });
  r.sw = await p.evaluate(async()=>{ const reg = await navigator.serviceWorker.ready; await new Promise(res=>setTimeout(res,1500)); const keys = await caches.keys(); const c = keys.length? await (await caches.open(keys[keys.length-1])).keys():[]; return { activo: !!reg.active, caches: keys, entradas: c.length }; });
  await p.evaluate(async()=>{ await window.App.Datos.guardarDiagnostico({porHabilidad:{lectura:{nivelCEFR:'A2'},habla:{nivelCEFR:'A2'},escucha:{nivelCEFR:'A2'},escritura:{nivelCEFR:'A2'}}}); localStorage.removeItem('rumboFlujoEnCurso'); await window.App.Storage.remove('plan', window.App.Fecha.hoyISO(new Date())); });
  await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(800);
  // ---- SIN INTERNET ----
  await ctx.setOffline(true);
  fallidas.length = 0;
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1500);
  r.offline_recarga = await p.evaluate(()=>({ titulo: document.title, fuente: [...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family), pantalla: document.getElementById('pantalla').innerText.slice(0,60).replace(/\n+/g,' | ') }));
  // paso de lectura completo, offline
  await p.goto('http://localhost:8000/#/lectura'); await p.waitForTimeout(1200);
  r.offline_lectura = await p.evaluate(()=>document.getElementById('pantalla').innerText.slice(0,40).replace(/\n+/g,' | '));
  const clickTexto = (rx) => p.evaluate((src) => { const b=[...document.querySelectorAll('#pantalla button')].find(x=>!x.disabled && new RegExp(src,'i').test(x.textContent.trim())); if(b){b.click(); return true;} return false; }, rx);
  for (let i=0;i<30;i++){ if ((await p.evaluate(()=>location.hash))==='#/inicio') break;
    await p.evaluate(()=>{const o=[...document.querySelectorAll('.diagnostico-opcion')].filter(x=>!x.disabled); if(o.length && !o.some(x=>x.getAttribute('aria-current')==='true')) o[0].click();});
    await clickTexto('^(Ver preguntas|Responder|Comprobar|Siguiente|Ver resultado|Terminar)'); await p.waitForTimeout(250); }
  await p.waitForTimeout(1000);
  r.offline_fin = await p.evaluate(async()=>({ hash: location.hash, xp: (await window.App.Datos.obtenerXP()).total, ultimaLectura: (await window.App.Datos.obtenerUltimaPracticaPorHabilidad()).lectura }));
  // repaso offline (cola desde IndexedDB + contenido en caché)
  await p.goto('http://localhost:8000/#/repaso'); await p.waitForTimeout(1200);
  r.offline_repaso = await p.evaluate(()=>document.querySelector('.repaso-contador')?.textContent);
  r.requestsFallidas = [...new Set(fallidas)];
  await ctx.setOffline(false);
  await ctx.close();
  return { r, errs };
}
