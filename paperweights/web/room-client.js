// Live audience votes, only when served by paperweights/room/server.py. Absent elsewhere.
// ?trial (the OMENS practice run) keeps polls simulated so no phone votes open.
export const room=new URLSearchParams(location.search).has('trial')?null:await fetch('/api/room',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
const post=(path,body)=>fetch('/api/room'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json());
export const open=(key,kind,extra={})=>post('/open',{key,kind,...extra});
export const close=key=>post('/close',{key});
export function watch(fn,ms=500){if(!room)return;let last=-1;setInterval(async()=>{try{const s=await fetch('/api/room',{cache:'no-store'}).then(r=>r.json());if(s.version!==last){last=s.version;fn(s)}}catch{}},ms)}
