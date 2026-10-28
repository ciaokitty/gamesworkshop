// Live audience votes, only when served by paperweights/room/server.py. Absent elsewhere.
// ?trial (the OMENS practice run) opens no phone votes: a mock room streams votes instead, so the
// Audience poll fills and wobbles as it does with real phones.
const trial=new URLSearchParams(location.search).has('trial');
export const room=trial?{mock:true}:await fetch('/api/room',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
const post=(path,body)=>fetch('/api/room'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json());

// Mock room: which card the room would flip next, by the card just turned. Close shares, so the lead can change while votes arrive.
const NEXT={harvest:{cash:5,attendance:3,weather:2},cash:{harvest:5,attendance:3,weather:2},attendance:{harvest:4,cash:4,weather:2},weather:{harvest:4,cash:4,attendance:2}};
const PHONES=30,listeners=[],votes={},timers={};
const emit=()=>listeners.forEach(fn=>fn({votes}));
function mockOpen(key,extra){
 clearInterval(timers[key]);
 const [,cat]=String(extra.cue).split(':'),pool=Object.entries(NEXT[cat]||{}).filter(([c])=>!extra.exclude?.includes(c)),sum=pool.reduce((s,[,w])=>s+w,0);
 const v=votes[key]={counts:Object.fromEntries(pool.map(([c])=>[c,0])),total:0,status:'open'};
 timers[key]=setInterval(()=>{ // a few phones at a time, each picking by the room's leaning
  for(let n=1+Math.floor(Math.random()*3);n>0&&v.total<PHONES;n--){let r=Math.random()*sum;const [c]=pool.find(([,w])=>(r-=w)<0)??pool[0];v.counts[c]++;v.total++}
  if(v.total>=PHONES)clearInterval(timers[key]);
  emit();
 },450);
 return Promise.resolve({ok:true});
}
function mockClose(key){clearInterval(timers[key]);delete votes[key];return Promise.resolve({ok:true})}

export const open=(key,kind,extra={})=>trial?mockOpen(key,extra):post('/open',{key,kind,...extra});
export const close=key=>trial?mockClose(key):post('/close',{key});
// The room summary arrives as server-sent events whenever it changes; the browser reconnects by itself.
export function watch(fn){if(!room)return;if(trial)return void listeners.push(fn);const events=new EventSource('/api/room/events');events.onmessage=e=>{try{fn(JSON.parse(e.data))}catch{}}}
