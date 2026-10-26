import assert from 'node:assert/strict';
import {createPack,currentRound,poll,categories,cardKind} from './model.js';
const report={rows:0,fatal:0,storm:0,pairWithoutStorm:0,singleIndicatorSafe:0,harvestVotes:0,cashVotes:0,weatherVotes:0,attendanceVotes:0};
for(let seed=0;seed<120;seed++){
 const pack=createPack(seed,200,'medium');
 for(const team of pack.teams)for(const row of team.rounds){
  const v=Object.fromEntries(categories.map(c=>[c,row.targetCues[c].value]));
  const pair=v.harvest==='failed'&&v.cash==='loan';
  assert.equal(row.fatal,pair);
  assert.notEqual(v.attendance,'dropout');
  report.rows++;report.fatal+=row.fatal;report.storm+=v.weather==='storm';report.pairWithoutStorm+=pair&&v.weather!=='storm';
  report.singleIndicatorSafe+=!row.fatal&&(v.harvest==='failed'||v.cash==='loan');
  const full=poll(pack,row,categories,3);assert.equal(full.counts[row.fatal?'avoid':'go'],team.audienceCount);
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
console.log(JSON.stringify({...report,fatalRate:report.fatal/report.rows,checks:'Teaching hazard rule, exact full-evidence predictions, no hidden leakage, stage-specific backfill, reproducibility, 15/200 parity'},null,2));
