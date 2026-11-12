// Mide los fps reales del juego en un Chrome sin interfaz (protocolo de depuración,
// sin dependencias). Uso, con el servidor de desarrollo en el puerto 5180:
//   node scripts/medir-fps.mjs /ruta/a/un/perfil-temporal
import { spawn } from 'node:child_process';
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9333;
const profile = process.argv[2];
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--window-size=960,704', '--no-first-run', '--use-angle=metal', '--enable-gpu', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result?.result?.value ?? r.result; };
await send('Page.navigate', { url: 'http://localhost:5180/?seed=FUNCION2&jugar' });
await sleep(4000);
const script = `(async () => {
  const g = window.__phaser;
  for (let i = 0; i < 100 && !window.__juego; i++) await new Promise(r => setTimeout(r, 50));
  const sample = async (secs) => { const d = []; let last = performance.now(); const start = last; await new Promise(res => { const loop = (now) => { d.push(now - last); last = now; if (now - start < secs*1000) requestAnimationFrame(loop); else res(); }; requestAnimationFrame(loop); }); d.shift(); d.sort((a,b)=>a-b); const mean = d.reduce((a,b)=>a+b,0)/d.length; return { fps: +(1000/mean).toFixed(1), p95ms: +d[Math.floor(d.length*0.95)].toFixed(1), peorMs: +d[d.length-1].toFixed(1), largos: d.filter(x=>x>25).length, fotogramas: d.length }; };
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const out = { renderer: g.renderer.type === 2 ? 'WebGL' : 'Canvas' };
  let j = window.__juego; j.dios();
  j.sala('gran_final'); await wait(800); out.salaActoI = await sample(4);
  j.estres(300); out.trescientasBalas = await sample(3);
  j.acto(4); await wait(1500); j = window.__juego; j.dios();
  j.sala('apagon_total'); await wait(800); out.apagonTotal = await sample(4);
  j.sala('numero_final'); await wait(800); out.numeroFinal = await sample(4);
  j.ir('jefe'); await wait(2500);
  const sc = j.escena; sc.bossIntro = null; if (sc.scene.isPaused()) sc.scene.resume();
  const b = sc.bossIds[0]; let k = 0; while (b.phase < 2 && k++ < 60) { b.damage(b.maxHp*0.06, null, 0, true); await wait(250); }
  await wait(1500);
  out.maestroFase3 = { fase: b.phase + 1, oscuro: !!sc.dark, ...(await sample(5)) };
  j.estres(300); out.maestroFase3_300balas = await sample(3);
  return JSON.stringify(out);
})()`;
console.log(await evalJs(script));
// Lo mismo en tamaño de móvil (375×812) con controles táctiles.
await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await send('Page.reload');
await sleep(4000);
console.log('MOVIL', await evalJs(script));
ws.close();
proc.kill();
