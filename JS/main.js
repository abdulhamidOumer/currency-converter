const currencyDropDown = document.getElementById('fromCurrency');
const populateDropDown = ()=>{
    fetch('https://free.currencyconverterapi.com/api/v5/currencies',{method:"GET",
    headers:{'Accept':'application/json','Content-Type':'application/json'},
    }).then(function(response){
        response.json().then(res => {
            for(let key in res.results){
                const currency = res.results[key];
                const option = document.createElement('option');
                option.value = currency.id;
                option.innerHTML = currency.currencyName;
                currencyDropDown.appendChild(option);
            }
        })
    });
}

populateDropDown();