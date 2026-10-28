import assert from 'node:assert/strict';
import {createPack,currentRound,poll,categories} from './model.js';
const policies=['skip','firstTwo','decision','audience','attendance'];
const result=Object.fromEntries(policies.map(p=>[p,{finished:0,checks:0,support:0}]));
let rows=0,dropouts=0,flagged=0,flaggedSafe=0,unflaggedDropout=0,loanSafe=0,loanFatal=0,regularDropouts=0;const inspections={harvest:0,cash:0,attendance:0,weather:0};
function play(pack,team,policy){let tokens=3,support=2,checks=0,used=0;
 const actions=[];for(let month=0;month<pack.roundCount;month++){const row=currentRound(pack,'ABCD'.indexOf(team.id),actions);let shown=[row.initialCategory],p=poll(pack,row,shown,tokens);
  if((policy==='audience'||policy==='attendance')&&tokens>0){
   const choice=policy==='attendance'?'attendance':Object.entries(p.counts).sort((a,b)=>b[1]-a[1])[0][0];
   if(categories.includes(choice)&&!shown.includes(choice)){shown.push(choice);tokens--;checks++;p=poll(pack,row,shown,tokens)}
  }
  const risk=p.counts.avoid/(p.counts.go+p.counts.avoid||1);
  const intervene=support>0&&(policy==='firstTwo'||(policy!=='skip'&&risk>=.4));
  if(intervene){support--;used++}
  if(row.fatal&&!intervene)return{finished:0,checks,support:used};actions.push(intervene?'avoid':'go');
 }return{finished:1,checks,support:used};
}
for(let seed=0;seed<120;seed++){
 const pack=createPack(seed,200);
 for(const team of pack.teams){for(const policy of policies){const r=play(pack,team,policy);for(const k of Object.keys(r))result[policy][k]+=r[k]}
  for(const row of team.rounds){rows++;dropouts+=row.fatal;regularDropouts+=row.fatal&&row.targetCues.attendance.value==='regular';
   const flag=row.targetCues.harvest.value==='failed'||row.targetCues.cash.value==='loan'||row.targetCues.weather.value==='storm';
   if(flag){flagged++;flaggedSafe+=!row.fatal}else unflaggedDropout+=row.fatal;
   if(row.targetCues.cash.value==='loan'){loanSafe+=!row.fatal;loanFatal+=row.fatal}
   const revealed=[row.initialCategory],p=poll(pack,row,revealed,3),mutated=structuredClone(row);
   mutated.fatal=!mutated.fatal;
   for(const c of categories.filter(c=>!revealed.includes(c)))mutated.targetCues[c].value=c==='attendance'?'irregular':c==='harvest'?'failed':c==='cash'?'loan':'storm';
   assert.deepEqual(p,poll(pack,mutated,revealed,3));
   assert.equal(Object.values(p.counts).reduce((a,b)=>a+b,0),team.audienceCount);
   assert.equal(p.counts[row.initialCategory],0);
   const matching=pack.historiesByTeam[team.id].filter(h=>h.contextId===row.contextId&&h.targetCues[row.initialCategory].value===row.targetCues[row.initialCategory].value);
   if(matching.length){const expected=(matching.filter(h=>h.fatal).length+1)/(matching.length+2);assert.ok(Math.abs(p.counts.avoid/(p.counts.go+p.counts.avoid)-expected)<.05,'Decision share must track historical risk');}
   const direct=poll(pack,row,[...revealed,'attendance'],2);
   assert.deepEqual(direct,poll(pack,{...row,fatal:!row.fatal},[...revealed,'attendance'],2),'Attendance lookup must not read outcome');
   for(const c of categories)inspections[c]+=p.counts[c];
   const exhausted=poll(pack,row,revealed,0);assert.equal(exhausted.counts.go+exhausted.counts.avoid,team.audienceCount);
  }
 }
}
const small=createPack(15,15),large=createPack(15,200);assert.equal(small.teams.reduce((n,t)=>n+t.audienceCount,0),15);assert.deepEqual(small.teams.map(t=>t.rounds),large.teams.map(t=>t.rounds));assert.deepEqual(createPack(15,15),small);
for(const t of small.teams){const p=poll(small,t.rounds[0],[t.rounds[0].initialCategory],3);assert.equal(p.total,t.audienceCount)}
assert.ok(loanSafe>0&&loanFatal>0);assert.ok(regularDropouts>0);assert.ok(inspections.harvest+inspections.cash>5*inspections.attendance);assert.ok(result.audience.finished>result.skip.finished);
console.log(JSON.stringify({seeds:120,teams:480,rows,dropoutRate:dropouts/rows,policies:Object.fromEntries(Object.entries(result).map(([k,v])=>[k,{finishRate:v.finished/480,meanChecks:v.checks/480,meanInterventions:v.support/480}])),perilComparison:{flagged,flaggedButNoDropout:flaggedSafe,dropoutsWithoutFlags:unflaggedDropout},loanSafe,loanFatal,regularDropouts,inspectionVotes:inspections,checks:'determinism, 15/200 board parity, exact vote totals, hidden-clue invariance, token exhaustion, attendance is not an oracle'},null,2));

// Action branches are reproducible and support changes the next known context.
const p=createPack(18);const skip=currentRound(p,0,['go']),help=currentRound(p,0,['avoid']);assert.notEqual(skip.contextId,help.contextId);assert.deepEqual(help,currentRound(p,0,['avoid']));
