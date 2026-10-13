/* Ore di lavoro — service worker v2
   - la pagina principale arriva sempre dalla rete quando c'è (così gli aggiornamenti si vedono subito)
   - senza rete, o con rete lenta (oltre 3 secondi), si apre la copia salvata */
const C="ore-lavoro-v2";
const F=["./","index.html","manifest.json","icon-192.png","icon-512.png","icon-180.png"];

self.addEventListener("install",e=>{
  e.waitUntil(caches.open(C).then(c=>c.addAll(F.map(u=>new Request(u,{cache:"reload"})))).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));
});

function pageKey(u){return u.origin+u.pathname;}
function fromCache(u){
  return caches.match(pageKey(u)).then(r=>r||caches.match(new URL("index.html",self.registration.scope).href)).then(r=>r||caches.match(self.registration.scope));
}
function networkFirst(req,u){
  return new Promise(resolve=>{
    let done=false;
    const finish=r=>{if(!done&&r){done=true;resolve(r);}};
    const timer=setTimeout(()=>{fromCache(u).then(finish);},3000);
    fetch(req).then(res=>{
      if(res&&res.ok){const copy=res.clone();caches.open(C).then(c=>c.put(pageKey(u),copy));}
      clearTimeout(timer);finish(res);
    }).catch(()=>{
      clearTimeout(timer);
      fromCache(u).then(r=>{if(!done){done=true;resolve(r||Response.error());}});
    });
  });
}

self.addEventListener("fetch",e=>{
  const req=e.request;
  if(req.method!=="GET")return;
  const u=new URL(req.url);
  if(u.origin!==location.origin)return;
  const isPage=req.mode==="navigate"||u.pathname.endsWith("/index.html")||u.pathname.endsWith("/");
  if(isPage){e.respondWith(networkFirst(req,u));return;}
  e.respondWith(caches.match(req).then(hit=>{
    const net=fetch(req).then(res=>{if(res&&res.ok){const copy=res.clone();caches.open(C).then(c=>c.put(req,copy));}return res;}).catch(()=>hit);
    return hit||net;
  }));
});
