import {chromium} from '../space/rover-run/src/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('households/out',{recursive:true});
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1366,height:768}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();
const base=process.env.HOUSEHOLDS_URL||'http://localhost:8684/paperweights/web/';
async function state(){return page.evaluate(()=>paperweights.state())}
async function click(i,selector){await page.locator(`[data-team=${'ABCD'[i]}] ${selector}`).click()}
const runs=[];
for(const seed of [15,16,17,18]){
 const url=new URL(base);url.searchParams.set('scenario','households');url.searchParams.set('mode','hard');url.searchParams.set('seed',seed);await page.goto(url.href);await page.waitForFunction(()=>window.paperweights);await page.clock.runFor(100);
 const log=[];
 for(let turn=0;turn<4;turn++)for(let i=0;i<4;i++){
  let t=(await state()).teams[i];if(t.status!=='deciding')continue;
  await click(i,'[data-poll=ai]');t=(await state()).teams[i];
  const first=structuredClone(t.polls.ai.counts);
  const choice=Object.entries(first).sort((a,b)=>b[1]-a[1])[0][0];
  if(!['go','avoid'].includes(choice)&&t.tokens>0){await click(i,`[data-category=${choice}]`);await click(i,'[data-poll=ai]');t=(await state()).teams[i]}
  const counts=t.polls.ai.counts;
  // Moderate threshold preserves scarce support for evidence of risk.
  const risk=counts.avoid/(counts.go+counts.avoid||1);
  const action=t.support>0&&risk>=.4?'avoid':'go';
  if(seed===15&&turn===0&&i===0)await page.screenshot({path:'households/out/hard-rover.png'});
  await click(i,`[data-action=${action}]`);await page.clock.runFor(700);
  const after=(await state()).teams[i];
  log.push({team:t.id,turn:turn+1,initial:first,revealed:t.revealed,final:counts,action,status:after.status,support:after.support,checks:after.tokens});
 }
 assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight));
 const final=await state();runs.push({seed,finished:final.teams.filter(t=>t.status==='finished').length,teams:final.teams.map(t=>({id:t.id,status:t.status,round:t.round})),log});
 if(seed===15){await page.screenshot({path:'households/out/hard-ended.png'});await page.locator('#reset').click();await page.locator('[data-team=A] [data-poll=ai]').click();await page.locator('#theme').click();await page.screenshot({path:'households/out/hard-light.png'})}
}
// Resource and independent-team checks.
await page.locator('#reset').click();const before=(await state()).teams.slice(1);const t=(await state()).teams[0];
for(const c of ['harvest','cash','attendance','weather'].filter(c=>!t.revealed.includes(c)))await click(0,`[data-category=${c}]`);
assert.equal((await state()).teams[0].tokens,0);await click(0,'[data-poll=ai]');assert.equal(await page.locator('[data-team=A] .poll-row').count(),2);assert.deepEqual((await state()).teams.slice(1),before);
await click(0,'.reset-team');assert.equal((await state()).teams[0].tokens,3);
await page.selectOption('#difficulty','medium');await page.waitForFunction(()=>window.paperweights?.state().mode==='medium');await page.selectOption('#difficulty','hard');await page.waitForFunction(()=>window.paperweights?.state().mode==='hard');assert.equal((await state()).scenario,'households');
for(const [width,height] of [[1280,720],[1920,1080],[1024,768]]){await page.setViewportSize({width,height});for(let i=0;i<4;i++)await click(i,'[data-poll=ai]');assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth),`overflow ${width}x${height}`)}
assert.deepEqual(runs.map(r=>r.finished),[2,3,1,0],'Hard outcome regression');assert.ok(runs.every(r=>r.teams.every(t=>['finished','eliminated'].includes(t.status))),'All teams complete their run');assert.deepEqual(errors,[]);await writeFile('households/out/playtest.json',JSON.stringify({runs,errors},null,2));console.log(JSON.stringify({runs:runs.map(({seed,finished,teams})=>({seed,finished,teams})),errors}));await browser.close();
