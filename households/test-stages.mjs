import assert from 'node:assert/strict';
import {createPack,currentRound,poll,hallucinatedPoll,hintedPoll,categories,cardKind} from './model.js';
const report={rows:0,fatal:0,storm:0,pairWithoutStorm:0,singleIndicatorSafe:0,harvestVotes:0,cashVotes:0,weatherVotes:0,attendanceVotes:0};
for(let seed=0;seed<120;seed++){
 const pack=createPack(seed,200,'medium');
 for(const team of pack.teams)for(const row of team.rounds){
  const v=Object.fromEntries(categories.map(c=>[c,row.targetCues[c].value]));
  const pair=v.harvest==='failed'&&v.cash==='loan',streak=!!row.streak&&v.harvest==='weak'&&v.cash==='low';
  const att=v.harvest==='good'&&v.cash==='enough'&&v.attendance==='irregular';
  assert.equal(row.fatal,pair||streak||att);
  assert.notEqual(v.attendance,'dropout');
  report.rows++;report.fatal+=row.fatal;report.storm+=v.weather==='storm';report.pairWithoutStorm+=pair&&v.weather!=='storm';
  report.singleIndicatorSafe+=!row.fatal&&(v.harvest==='failed'||v.cash==='loan');
  // The archive has never seen the attendance rule, so the AI says Skip there even with every card up.
  const full=poll(pack,row,categories,3);assert.equal(full.counts[row.fatal&&!att?'avoid':'go'],team.audienceCount);
  const shown=[row.initialCategory],vote=poll(pack,row,shown,3),mutated=structuredClone(row);
  mutated.fatal=!mutated.fatal;
  for(const c of categories.filter(c=>!shown.includes(c)))mutated.targetCues[c].value='unseen mutation';
  assert.deepEqual(vote,poll(pack,mutated,shown,3),'Cannot use hidden clues or live fatal outcome');
  for(const c of categories)report[c+'Votes']+=vote.counts[c];
  const decision=poll(pack,row,shown,0);assert.equal(decision.counts.go+decision.counts.avoid,team.audienceCount);
 }
}
assert.ok(report.fatal/report.rows>.4&&report.fatal/report.rows<.6);
assert.ok(report.singleIndicatorSafe>100);
assert.ok(report.pairWithoutStorm>100);
for(const mode of ['easy','medium','hard']){
 const a=createPack(15,15,mode),b=createPack(15,200,mode);
 assert.deepEqual(a.teams.map(t=>t.rounds),b.teams.map(t=>t.rounds));
 assert.deepEqual(currentRound(a,0,['avoid','go']),currentRound(b,0,['avoid','go']));
 assert.deepEqual(a,createPack(15,15,mode));
 assert.equal(a.interventions,mode==='hard'?2:6);
}
assert.equal(cardKind('weather','storm','easy'),'normal');
assert.equal(cardKind('weather','storm','medium'),'normal');
assert.equal(cardKind('attendance','dropout','easy'),'danger');
assert.equal(cardKind('harvest','failed','easy'),'normal');
for(const team of createPack(15,200,'easy').teams)for(const row of team.rounds)assert.equal(row.targetCues.attendance.value==='dropout',row.fatal);
assert.equal(cardKind('harvest','failed','medium'),'indicator');
assert.equal(cardKind('cash','loan','medium'),'indicator');
for(const c of categories)assert.equal(cardKind(c,'failed','hard'),'normal');
// Backfill must use the teaching sampler as well as the teaching archive.
const empty=createPack(15,200,'medium');empty.historiesByTeam.A=[];
for(const row of empty.teams[0].rounds){const full=poll(empty,row,categories,3);assert.equal(full.counts[row.fatal?'avoid':'go'],empty.teams[0].audienceCount);}
// Two-month rule, staged by Team C in Indicators: weak+low twice in a row after a Skip.
for(let seed=0;seed<120;seed++){
 const p=createPack(seed,200,'medium'),m1=currentRound(p,2,[]),m2=currentRound(p,2,['go']),m3=currentRound(p,2,['go','avoid']),val=(r,c)=>r.targetCues[c].value;
 assert.deepEqual([val(m1,'harvest'),val(m1,'cash'),m1.fatal],['weak','low',false]);
 assert.deepEqual([val(m2,'harvest'),val(m2,'cash'),m2.initialCategory,m2.contextId,m2.fatal,m2.hallucinate],['weak','low','cash','C05',true,'torn']);
 assert.deepEqual([val(m3,'harvest'),val(m3,'cash'),m3.fatal],['weak','enough',false]);
 const n=p.teams[2].audienceCount,aud=poll(p,m2,['cash'],1),ai=hallucinatedPoll(p,m2,['cash']),after=hallucinatedPoll(p,m2,['cash','harvest']);
 assert.ok(aud.counts.harvest>aud.counts.weather+aud.counts.attendance,'Audience asks for the harvest');
 assert.equal(poll(p,m2,['cash','harvest'],0).counts.avoid,n,'The honest AI sees the streak');
 assert.ok(ai.counts.avoid>ai.counts.go&&after.counts.go>after.counts.avoid&&Math.abs(after.counts.go-after.counts.avoid)<=.1*n,'AI is torn and tips to Skip');
}
// Attendance rule, staged by Team A in Indicators: month 3 is good, enough, irregular with Cash up.
for(let seed=0;seed<120;seed++){
 const p=createPack(seed,200,'medium'),m3=currentRound(p,0,['go','avoid']),m4=currentRound(p,0,['go','avoid','avoid']),val=(r,c)=>r.targetCues[c].value;
 assert.deepEqual([val(m3,'harvest'),val(m3,'cash'),val(m3,'attendance'),m3.initialCategory,m3.fatal,m3.hallucinate],['good','enough','irregular','cash',true,'skip']);
 assert.deepEqual([val(m4,'harvest'),val(m4,'cash'),val(m4,'attendance'),m4.fatal],['good','enough','regular',false]);
 const n=p.teams[0].audienceCount,ai=hallucinatedPoll(p,m3,['cash','attendance']);
 assert.equal(hintedPoll(p,m3,['cash']).counts.attendance,n,'Audience asks for attendance');
 assert.equal(hintedPoll(p,m3,['cash','attendance']),null,'Hint ends once attendance is up');
 assert.equal(ai.counts.go,Math.round(.9*n),'AI is confident to Skip');
}
// Risks keeps its boards: the attendance rule is Indicators only.
for(const team of createPack(15,200,'easy').teams)for(const row of team.rounds){const v=row.targetCues;
 if(v.harvest.value==='good'&&v.cash.value==='enough')assert.equal(row.fatal,false)}
// Team B, and Teams A and C outside Indicators, keep their seed-15 boards.
for(const mode of ['easy','medium','hard'])for(const t of [0,1,2]){if(mode==='medium'&&t!==1)continue;
 const p=createPack(15,200,mode),legs=[];for(let i=0;i<4;i++){const r=currentRound(p,t,legs);assert.ok(!r.hallucinate&&(mode==='hard'||r.fatal===(r.targetCues.harvest.value==='failed'&&r.targetCues.cash.value==='loan')));legs.push(r.fatal?'avoid':'go')}}
console.log(JSON.stringify({...report,fatalRate:report.fatal/report.rows,checks:'Teaching hazard rule, exact full-evidence predictions, no hidden leakage, stage-specific backfill, reproducibility, 15/200 parity'},null,2));
