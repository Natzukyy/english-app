// 6b: cambio de día SIN esperar (page.clock) -- plan nuevo, no repite la habilidad principal de
// ayer, y tras faltar 3 días no se acumulan atrasos.
async (page) => {
  const browser = page.context().browser();
  const ctx = await browser.newContext({ serviceWorkers:'block', viewport:{width:390,height:844} });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e=>errs.push(String(e)));
  await p.clock.install({ time: new Date('2026-11-20T10:00:00') });
  await p.goto('http://localhost:8000/#/inicio', { waitUntil: 'networkidle' });
  const principal = pasos => (pasos.find(x=>x.tipo==='practica' && x.habilidad!=='escritura')||{}).habilidad||null;
  const resumen = pl => ({ id: pl.id, pasos: pl.pasos.map(x=>x.tipo+(x.habilidad?':'+x.habilidad:'')), minutos: pl.totalMinutos, repaso: (pl.pasos.find(x=>x.tipo==='repaso')||{}) });
  const dia1 = await p.evaluate(async () => {
    await window.App.Datos.guardarDiagnostico({porHabilidad:{lectura:{nivelCEFR:'A2'},habla:{nivelCEFR:'A2'},escucha:{nivelCEFR:'A2'},escritura:{nivelCEFR:'A2'}}});
    const hoy = new Date();
    const tarjetas = await window.App.Datos.sembrarTarjetasSiHaceFalta(hoy);
    for (let k=0;k<30;k++) { const t=tarjetas[k]; await window.App.Storage.put('srs_cards', Object.assign({}, t, window.App.SRS.calificarTarjeta(t, 4, hoy))); }
    return await window.App.Datos.obtenerOCalcularPlanDeHoy(hoy);
  });
  const out = { fecha1: await p.evaluate(()=>window.App.Fecha.hoyISO(new Date())), dia1: resumen(dia1), principal1: principal(dia1.pasos) };
  // día siguiente
  await p.clock.setSystemTime(new Date('2026-11-21T10:00:00')); await p.reload({waitUntil:'networkidle'});
  const dia2 = await p.evaluate(async()=>await window.App.Datos.obtenerOCalcularPlanDeHoy(new Date()));
  out.dia2 = resumen(dia2); out.principal2 = principal(dia2.pasos);
  out.nuevoPlan = dia2.id !== dia1.id; out.noRepiteHabilidad = out.principal1 !== out.principal2;
  // faltar 3 días (22, 23 y 24): se vuelve el 25
  await p.clock.setSystemTime(new Date('2026-11-25T10:00:00')); await p.reload({waitUntil:'networkidle'});
  const dia5 = await p.evaluate(async()=>{ const pl = await window.App.Datos.obtenerOCalcularPlanDeHoy(new Date()); const cards = await window.App.Storage.getAll('srs_cards'); const hoy = window.App.Fecha.hoyISO(new Date()); return { pl, vencidasReales: cards.filter(c=>c.repeticiones>0 && c.proximaFecha<=hoy).length }; });
  out.dia5 = resumen(dia5.pl); out.vencidasReales = dia5.vencidasReales;
  out.sinAcumular = { pasosIgualesEnEstructura: out.dia5.pasos.length <= out.dia2.pasos.length + 1, tarjetasVencidasEnPlan: out.dia5.repaso.tarjetasVencidas, topeVencidas: 20, minutosPlan: out.dia5.minutos };
  // cola real de repaso ese día: tope 20 vencidas + 15 nuevas
  out.colaDia5 = await p.evaluate(async()=>(await window.App.Datos.obtenerColaRepaso(new Date())).length);
  await ctx.close();
  return { out, errs };
}
