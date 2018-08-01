const currencyDropDowns = document.getElementsByClassName('currencySelecters');
const resultText = document.getElementById('resultText');
const convertButton = document.getElementById('convertButton');
const toCurrencyDropDown = document.getElementById('toCurrency');
const offlineCurrenciesButton = document.getElementById('showOfflineCurrencies');
const offlineCurrenciesContainer = document.getElementById('offlineCurrenciesContainer');
const offlineCurrenciesList = document.getElementById('lists');
const closeButton = document.getElementById('closeButton');


//A function to run all the required actions when the app runs
const runApp = ()=>{
    registerServiceWorker();
    populateDropDown();
    handleImportantUpdates();

    setInterval(()=>{
        handleImportantUpdates(); //Runs every two hour to check for currency change updates
    }, 2000*3600);
}

//Shows hidden offline currency container
offlineCurrenciesButton.onclick = ()=>{
    offlineCurrenciesContainer.style.display = "block";
}

//Hides offline currency container
closeButton.onclick = ()=>{
    offlineCurrenciesContainer.style.display = "none";
}

//Runs the required function to convert from one currency to another
convertButton.onclick = ()=>{
    const amountText = document.getElementById('fromInput').value;
    let floatAmount = parseFloat(amountText);
    if(isNaN(floatAmount))
        floatAmount = 0;

    calaculateCurrency(floatAmount);
}

//Displays the currency type on page when a user chosses one
toCurrencyDropDown.onchange = ()=>{
    editResultText('0.00');
}


//Registers service worker to the site
const registerServiceWorker = ()=>{
    if(!navigator.serviceWorker){
        console.log("Service Worker not supported");
         //Stops here if browser doesn't support service worker
        return
    }

    navigator.serviceWorker.register('serviceWorker.js').then(register=>{
        console.log(`Registered at scope ${register.scope}`);

        if(!navigator.serviceWorker.controller) return;

        //Runs handleSwUpdate() function when service worker is updated and on waiting state
        if(register.waiting){
            handleSwUpdate(register.waiting);
            return
        }


        if(register.installing){
            swInstallingTracker(register.installing);
            return;
        }

        register.addEventListener('updatefound',()=>{
            swInstallingTracker(register.installing);
        });



    }).catch(error=>{
        console.log(`Service Worker Registeration Failed:\n${error}`);
    });


    navigator.serviceWorker.addEventListener('controllerchange', ()=> {
        //Displays the following messege when there is an update avialable or when serviceworker is changed
        snackbar('NORMAL','Update Avialable. Refreh to get the new look.');
        setTimeout(()=>{snackbar('HIDE')},4000);
    });

}


//Creates the required indexDb databases an stores to run the app offline
const currenciesDb = idb.open('currency-converter-db',1,(upgradeDb)=>{
    const oldestVersion = upgradeDb.oldVersion;
    switch(oldestVersion){
        case 0:{
            //Store To Hold all the currencies avialable(updated every two hours)
            const currencyStore = upgradeDb.createObjectStore('currencies',{keyPath:"currencyName"});

            //Store To Hold Exchange rates and currencies that a user has converted(updated every two hours)
            const converted_currencies = upgradeDb.createObjectStore('converted-currencies',{keyPath:"query"});

            //Holds the last time the currency store was updated. useful to notify users if store wasn't updated for a long time
            upgradeDb.createObjectStore('stores-time-line',{keyPath:"storeName"});

            //Index to retrive information by id of currencies
            currencyStore.createIndex('id','id');

            ////Index to retrive information by date for the converted_currencies store
            converted_currencies.createIndex('by-date', 'lastUpdated');
        }
    }

});

//Sends a message to the serviceworker to skipwaiting
const handleSwUpdate = (sw)=>{
    sw.postMessage({action:'skipWaitingState'});
}


//Checks whether the serviceworker finished installing and runs handleSwUpdate()
const swInstallingTracker = (sw)=>{
    sw.addEventListener('statechange',()=>{
        if(sw.state === 'installed'){
            handleSwUpdate(sw);
        }
    });
}


//Function to show and hide loading container to user
const loading = (property)=>{
    const loadingContainer = document.getElementById('loadingContainer');
    switch(property){
        case 'SHOW':{
            loadingContainer.style.display = 'block';
            break
        }
        case 'HIDE':{
            loadingContainer.style.display = 'none';
            break
        }
    }
}

//Fetches currencies from api and saves it to the currencies store
const populateCurrenciestore = (showLoading=true, dropDown = false)=>{
    if(showLoading) loading('SHOW');

    snackbar('NORMAL','Retriving Currencies From Network');
    setTimeout(()=>{snackbar('HIDE')},7000);
    fetch('https://free.currencyconverterapi.com/api/v5/currencies',{method:"GET",
    headers:{'Accept':'application/json','Content-Type':'application/json'},
    }).then((response)=>{
        response.json().then(res => {

            let noError = true;
            for(let key in res.results){
                const currency = res.results[key];
                //currencies.push([key, currency.currencyName])
                currenciesDb.then((db)=>{
                    const transaction = db.transaction('currencies','readwrite');
                    const store = transaction.objectStore('currencies');

                    store.put(currency);
                    return transaction.complete;
                }).then(()=>{
                    noError = true;
                }).catch(()=>{
                    noError = false;
                });

                if(noError === false) break;

            }

            if(noError){
                currenciesDb.then(db=>{
                    const transaction = db.transaction('stores-time-line', 'readwrite');
                    const store = transaction.objectStore('stores-time-line');
                    const currentDateTime = new Date();

                    store.put({storeName:"currencies", lastUpdated:currentDateTime});
                    return transaction.complete;
                }).then(()=>{
                    if(dropDown) populateDropDown();
                    else loading('HIDE');
                })
            }

        })
    }).catch((err)=>{
        loading('HIDE');
        snackbar('NORMAL','A network Error occured!!','red');
        setTimeout(()=>{snackbar('HIDE')},4000);
    });
}

//Gets the offline currencies from the offline_currencies store and adds it to the user interface
const populateOfflineCurrencies = ()=>{
    const mainContainer = document.getElementById('lists');
    mainContainer.innerHTML = "";

    currenciesDb.then((db)=>{
        const transaction = db.transaction('converted-currencies');
        const store = transaction.objectStore('converted-currencies');

        return store.openCursor();
    }).then(recurseCurrencies=(cursor)=>{
        if(!cursor) return;
        const currency = cursor.value;

        const divContainer = document.createElement('div');
        divContainer.className = "fromToContainer";

        const fromLabel = document.createElement('label');
        fromLabel.className = "inline fromText";
        fromLabel.innerText = "From: ";
        const fromCurrTxt = document.createElement('p');
        fromCurrTxt.className = "inline";
        fromLabel.appendChild(fromCurrTxt);


        const toLabel = document.createElement('label');
        toLabel.className = "inline toText";
        toLabel.innerText = "To: ";
        const toCurrTxt = document.createElement('p');
        toCurrTxt.className = "inline";
        toLabel.appendChild(toCurrTxt);

        for(let i=0;i<2;i++){
            currenciesDb.then((db)=>{
                const transaction = db.transaction('currencies');
                const store = transaction.objectStore('currencies');
                const idIndex = store.index('id');
                switch(i){
                    case 0:{
                        return idIndex.get(currency.fromCurrency);
                    }
                    case 1:{
                        return idIndex.get(currency.toCurrency);
                    }
                }
            }).then((val)=>{
                switch(i){
                    case 0:{
                        fromCurrTxt.innerText = val.currencyName;
                    }
                    case 1:{
                        toCurrTxt.innerText = val.currencyName;
                    }
                }
            });
        }

        divContainer.appendChild(fromLabel);
        divContainer.appendChild(toLabel);
        mainContainer.appendChild(divContainer);

        return cursor.continue().then(recurseCurrencies);
    }).then(()=>{

        return;
    });
}


//Gets currencies from currencies store and adds it to the user interface
const populateDropDown = ()=>{
    let currenciesCount = 0;
    currenciesDb.then((db)=>{
        const transaction = db.transaction('currencies');
        const store = transaction.objectStore('currencies');

        return store.openCursor();
    }).then(recurseCurrencies=(cursor)=>{
        if(!cursor) return;
        const currency = cursor.value;
        for(let i=0;i < currencyDropDowns.length; i++ ){
            const option = document.createElement('option');

            option.value = currency.id;
            option.innerHTML = currency.currencyName;
            currencyDropDowns[i].appendChild(option);
        }

        currenciesCount += 1;
        return cursor.continue().then(recurseCurrencies);
    }).then(()=>{
        if(currenciesCount === 0) populateCurrenciestore(true,true);
        else{
            populateOfflineCurrencies();
            loading('HIDE');
        }

    })

}

//A function to show the converted currency result on the user interface
const editResultText = (value)=>{
    const toCurrency = document.getElementById('toCurrency');
    const toCurrencyValue = toCurrency.options[toCurrency.selectedIndex].value;
    resultText.innerText = `${value} ${toCurrencyValue}`;
}

//A function to show the exchange rate on the user interface
const editExchangeText = (value)=>{
    const toCurrency = document.getElementById('toCurrency');
    const toCurrencyValue = toCurrency.options[toCurrency.selectedIndex].value;

    const fromCurrency = document.getElementById('fromCurrency');
    const fromCurrencyValue = fromCurrency.options[fromCurrency.selectedIndex].value;

    const exchangeRateText = document.getElementById('exchangeRateText');
    exchangeRateText.innerText = ` 1 ${fromCurrencyValue} equals ${value} ${toCurrencyValue}`;
}



//Fetch the exchange rate from api and shows to the user then saves it to the offline_currencies store
const calaculateCurrencyOnline = (amount)=>{

    const toCurrency = document.getElementById('toCurrency');
    const toCurrencyValue = toCurrency.options[toCurrency.selectedIndex].value;

    const fromCurrency = document.getElementById('fromCurrency');
    const fromCurrencyValue = fromCurrency.options[fromCurrency.selectedIndex].value;

    const fromCurr = encodeURIComponent(fromCurrencyValue);
    const toCurr = encodeURIComponent(toCurrencyValue);
    const query = fromCurr + '_' + toCurr;

    const url = `https://free.currencyconverterapi.com/api/v5/convert?q=${query}`;
    loading('SHOW');
    fetch(url,{method:"GET",
    headers:{'Accept':'application/json','Content-Type':'application/json'},
    }).then((response)=>{
        response.json().then(res => {
            const value = res.results[query].val * amount;
            editResultText(value.toFixed(2));
            editExchangeText(res.results[query].val);

            currenciesDb.then((db)=>{
                const transaction = db.transaction('converted-currencies','readwrite');
                const store = transaction.objectStore('converted-currencies', 'readwrite');
                store.put({
                    query:query,
                    fromCurrency:fromCurrencyValue,
                    toCurrency:toCurrencyValue,
                    rate:res.results[query].val,
                    lastUpdated: new Date()
                });
            })
            populateOfflineCurrencies();
            loading('HIDE');
        })
    }).catch(()=>{
        loading('HIDE');
        snackbar('NORMAL','A network Error occured!!','red');
        setTimeout(()=>{snackbar('HIDE')},4000);
    });
}


//Tries to get exchange rate from offline_currencies store and if not found runs the calaculateCurrencyOnline() function
const calaculateCurrency = (floatAmount)=>{
    const toCurrency = document.getElementById('toCurrency');
    const toCurrencyValue = toCurrency.options[toCurrency.selectedIndex].value;

    const fromCurrency = document.getElementById('fromCurrency');
    const fromCurrencyValue = fromCurrency.options[fromCurrency.selectedIndex].value;
    const fromCurr = encodeURIComponent(fromCurrencyValue);
    const toCurr = encodeURIComponent(toCurrencyValue);
    const query = fromCurr + '_' + toCurr;

    currenciesDb.then((db)=>{
        const transaction = db.transaction('converted-currencies');
        const store = transaction.objectStore('converted-currencies');

        return store.get(query);
    }).then((val)=>{
        if(val){
            const value = val.rate * floatAmount;
            editResultText(value.toFixed(2));
            editExchangeText(val.rate);
            return;
        }
        else{
            calaculateCurrencyOnline(floatAmount);
            return;
        }
    })
}


//Function to show and hide messages on snackbar
const snackbar = (type,message='',color='white')=>{
    const snackbar = document.getElementById('snackbar');
    const snackbarSpinner = document.getElementById('snackbarLoader');
    const snackbarMessage = document.getElementById('snackbarMessage');
    switch(type){
        case 'NORMAL':{
            snackbar.style.display = 'block';
            snackbarMessage.innerText = message;
            snackbarMessage.style.color = color;
            break;
        }
        case 'WITH_SPINNER':{
            snackbar.style.display = 'block';
            snackbarSpinner.style.display = 'block';
            snackbarMessage.innerText = message;
            snackbarMessage.style.color = color;
            break;
        }
        case 'HIDE':{
            snackbar.style.display = 'none';
            snackbarSpinner.style.display = 'none';
            break;
        }

    }
    return;
}

//Accepts a single or two queries then fetchs result from api. (Useful for updates that run on 2 hours difference)
const updateFromQuery = (queries)=>{
    const url = `https://free.currencyconverterapi.com/api/v5/convert?q=${queries}`;
    let results = {};
    snackbar('WITH_SPINNER','Updating Offline Currencies');
    fetch(url,{method:"GET",
    headers:{'Accept':'application/json','Content-Type':'application/json'},
    }).then((response)=>{
        response.json().then(res => {
            for(let i=0; i<queries.length; i++){
                    const value = res.results[queries[i]].val;
                    results[queries[i]] = value;
            }
            currenciesDb.then((db)=>{
                const transaction = db.transaction('converted-currencies','readwrite');
                const store = transaction.objectStore('converted-currencies', 'readwrite');
                return store.openCursor();

            }).then(recurseCursor=(cursor)=>{
                if(!cursor) return;
                let oldCurrency = cursor.value;
                if(results[oldCurrency.query]){
                    let updatedValue = results[oldCurrency.query];

                    oldCurrency.rate = updatedValue;
                    oldCurrency.lastUpdated = new Date();
                    cursor.update(oldCurrency);
                }

                return cursor.continue().then(recurseCursor);
            }).then(()=>{
                populateOfflineCurrencies();
                handleLastUpdatedTime();
            })

        })
    }).catch(()=>{
        loading('HIDE');
        snackbar('NORMAL','A network Error occured!!','red');
        setTimeout(()=>{snackbar('HIDE')},4000);
    });
}


//A function to calculate the last time a user updated information from online, If it has been more than 3 hours notifies user to get online
const handleLastUpdatedTime = ()=>{
    currenciesDb.then((db)=>{
        const transaction = db.transaction('stores-time-line');
        const store = transaction.objectStore('stores-time-line');
        return store.get('currencies')
    }).then(val=>{
        const currentDate = new Date();
        const lastUpdated = val.lastUpdated;
        const timeDiff = Math.abs(lastUpdated.getTime() - currentDate.getTime());
        let diffHrs = Math.abs(timeDiff / (1000 * 3600 ));
        diffHrs = Math.round(diffHrs);
        if(diffHrs > 3){
            snackbar('NORMAL',`It has almost been ${diffHrs} hours since exchange rates were updated. Connect to the internet to get the latest updates.`);
        }

    })
}

//Iterates on items in the offline_currencies store and gets updates for every item.
const upateOfflineCurrencies = (length)=>{
    let current_queries = [];
    let count = 0;
    currenciesDb.then((db)=>{
        const transaction = db.transaction('converted-currencies');
        const store = transaction.objectStore('converted-currencies');
        return store.openCursor();
    }).then(recurseCursors=(cursor)=>{
        if(!cursor) return;
        const currency = cursor.value;
        const query = currency.query;
        current_queries.push(query);
        count+=1;

        if(current_queries.length === 2 || count === length){
            updateFromQuery(current_queries);
            current_queries = [];
            return cursor.continue().then(recurseCursors);
        }
        else{
            return cursor.continue().then(recurseCursors);
        }
    })
}

//Deletes items in the oldest items in the offline_currencies store and runs upateOfflineCurrencies funcion on the rest of items
const handleOfflineCurrencies = ()=>{
    currenciesDb.then((db)=>{
        const transaction = db.transaction('converted-currencies');
        const store = transaction.objectStore('converted-currencies');
        const dateIndex = store.index('by-date');
        return dateIndex.openCursor(null,'prev');
    }).then((cursor)=>{
        if(!cursor) return;
        return cursor.advance(30);
    }).then(deleteTheRest= (cursor)=>{
        if(!cursor) return;
        cursor.delete();
        return cursor.continue().then(deleteTheRest);
    }).then(()=>{
        currenciesDb.then((db)=>{
            const transaction = db.transaction('converted-currencies');
            const store = transaction.objectStore('converted-currencies');
            return store.getAll();
        }).then(val=>{
            upateOfflineCurrencies(val.length);
        })
    });
}

//Runs important updates on the stores
const handleImportantUpdates = ()=>{
    populateCurrenciestore(false);
    handleOfflineCurrencies();

}

//Run the App
runApp();
