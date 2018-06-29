let currentCache = 'cc-static-v1';

let resourcesToCache = [
    'index.html',
    'JS/main.js',
    'CSS/main.css',
    'img/logo.png'
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

    if(requesterURL.origin === location.origin){
        evnt.respondWith(
            caches.match(evnt.request).then(res=>{
                if(res) return res;
                return fetch(evnt.request);
            })
        );
    }
});

self.addEventListener('message',(evnt)=>{
    if(evnt.data.action === 'skipWaitingState'){
        self.skipWaiting();
    }
});