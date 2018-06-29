const currencyDropDowns = document.getElementsByClassName('currencySelecters');
const resultText = document.getElementById('resultText');
const convertButton = document.getElementById('convertButton');
const toCurrencyDropDown = document.getElementById('toCurrency');


const registerServiceWorker = ()=>{
    if(!navigator.serviceWorker){
        console.log("Service Worker not supported");
        return
    }

    navigator.serviceWorker.register('serviceWorker.js').then(register=>{
        console.log(`Registered at scope ${register.scope}`);

        if(!navigator.serviceWorker.controller) return;

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


    
    navigator.serviceWorker.addEventListener('controllerchange', function() {
        snackbar('NORMAL','Update Avialable. Refreh to get the new look.');
        setTimeout(()=>{snackbar('HIDE')},4000);    
    });

}



const handleSwUpdate = (sw)=>{
    sw.postMessage({action:'skipWaitingState'});
}


const swInstallingTracker = (sw)=>{
    sw.addEventListener('statechange',()=>{
        if(sw.state === 'installed'){
            handleSwUpdate(sw);
        }
    });
}


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


const populateDropDown = ()=>{
    loading('SHOW');
    fetch('https://free.currencyconverterapi.com/api/v5/currencies',{method:"GET",
    headers:{'Accept':'application/json','Content-Type':'application/json'},
    }).then(function(response){
        response.json().then(res => {

            const currencies = [];
            for(let key in res.results){
                const currency = res.results[key];
                currencies.push([key, currency.currencyName])
            }

            currencies.sort((a,b)=>{
                if (a[1] === b[1]) {
                    return 0;
                }
                else {
                    return (a[1] < b[1]) ? -1 : 1;
                }
            });

            for(let key of currencies){
                for(let i=0;i < currencyDropDowns.length; i++ ){
                    const currency = res.results[key[0]];
                    const option = document.createElement('option');
                    option.value = currency.id;
                    option.innerHTML = currency.currencyName;
                    currencyDropDowns[i].appendChild(option);
                }
            }

            editResultText('0.00');
            registerServiceWorker();
            loading('HIDE');
        })
    });
}

const editResultText = (value)=>{
    const toCurrency = document.getElementById('toCurrency');
    const toCurrencyValue = toCurrency.options[toCurrency.selectedIndex].value;
    resultText.innerText = `${value} ${toCurrencyValue}`;
}

const calaculateCurrency = (amount)=>{
    
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
    }).then(function(response){
        response.json().then(res => {
            const value = res.results[query].val * amount;
            editResultText(value.toFixed(2));
            loading('HIDE');
        })
    });
}

function snackbar(type,message=''){
    const snackbar = document.getElementById('snackbar');
    const snackbarSpinner = document.getElementById('snackbarLoader');
    const snackbarMessage = document.getElementById('snackbarMessage');
    switch(type){
        case 'NORMAL':{
            snackbar.style.display = 'block';
            snackbarMessage.innerText = message;
            break;
        }
        case 'WITH_SPINNER':{
            snackbar.style.display = 'block';
            snackbarSpinner.style.display = 'block';
            snackbarMessage.innerText = message;
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

populateDropDown();

convertButton.onclick = ()=>{
    const amountText = document.getElementById('fromInput').value;
    let floatAmount = parseFloat(amountText);
    if(isNaN(floatAmount))
        floatAmount = 0;

    calaculateCurrency(floatAmount);
}

toCurrencyDropDown.onchange = ()=>{
    editResultText('0.00');
}