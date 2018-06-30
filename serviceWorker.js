let currentCache = 'cc-static-v1';

let resourcesToCache = [
    './',
    './JS/main.js',
    './CSS/main.css',
    './img/logo.png',
    './img/button.png',
    './idb/idb.js'
];

self.addEventListener('install',evnt=>{
    evnt.waitUntil(
        caches.open(currentCache).then(cache=>{
            return cache.addAll(resourcesToCache);
        })
    );
});


self.addEventListener('activate', evnt=>{
    evnt.waitUntil(
        caches.keys().then(returnedCaches=>{
            return Promise.all(
                returnedCaches.filter(cache=>{
                    return cache.startsWith('cc') && cache != currentCache;
                }).map(cacheToDelete=>{
                    return caches.delete(cacheToDelete);
                })
            )
        })
    )
});


self.addEventListener('fetch',evnt=>{
    const requesterURL = new URL(evnt.request.url);
    console.log(requesterURL.pathname);
    if(requesterURL.origin === location.origin){
        evnt.respondWith(
            caches.match(evnt.request).then(res=>{
                return res|| fetch(evnt.request);
            })
        );
    }
});

self.addEventListener('message',(evnt)=>{
    if(evnt.data.action === 'skipWaitingState'){
        self.skipWaiting();
    }
});