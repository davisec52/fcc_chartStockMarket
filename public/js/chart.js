console.log("chart.js connected");
$(document).ready(function() {

let socket = io();

function createChart(seriesOptions) {

		console.log("createChart called");
		console.log("seriesOptions from createChart: ", seriesOptions);

    Highcharts.stockChart('container', {

        rangeSelector: {
            selected: 4
        },

        yAxis: {
            labels: {
                formatter: function () {
                    return (this.value > 0 ? ' + ' : '') + this.value + '%';
                }
            },
            plotLines: [{
                value: 0,
                width: 2,
                color: 'silver'
            }]
        },

        plotOptions: {
            series: {
                compare: 'percent',
                showInNavigator: true
            }
        },

        tooltip: {
            pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b> ({point.change}%)<br/>',
            valueDecimals: 2,
            split: true
        },

        series: seriesOptions
    });

    seriesOptions.length = 0;

} //end createChart()

	let addBtn = document.getElementById("add-btn");
	let run = true;
	addBtn.addEventListener("click", (evt) => {
		evt.preventDefault();
		let inputVal = document.getElementById("stock-input").value.toUpperCase();
		
		if(document.getElementById("stock-input").value === "") {
			alert("missing term");
			run = false;
			return;
		}else {
			let h4Arr =document.getElementsByClassName("symbol-hd");
			Array.prototype.forEach.call(h4Arr, function(h4, index) {
				let el = $(h4).contents().prevObject[0].firstChild.data;
				if(el === inputVal) {
					alert("Duplicate items. Enter unique stock symbol.");
					run = false;
					return;
				}
			});
		}

		if(!run) {
			return;
		}else {

			document.getElementById("loader-box").style.display = "block";
			//Adds new symbol to db and initiates drawing of chart
			socket.emit("addSymbol", inputVal);
			//initiates getting new symbol list which is sent to createBoxes
			socket.emit("checkSymbolList");
		}

		document.getElementById("stock-input").value = "";
		
	}); //AddBtn

	//On page load, fetches any existing names in db and sends names to bodyData event in order to draw chart
	//Names pushed into the stockNames array. ruhAjax() creates a copy of stockNames and any future
	//operations on the data are performed on the copy 
	function pageLoad() {
		socket.emit("getStockData");
		socket.emit("checkSymbolList");
	}
	pageLoad();

//Adds the stock symbol boxes to page and services delete
	let createBoxes = (stocks) => {
		console.log("create - Boxes called");
		let wrap = document.getElementById("wrapper");
		let stockDivs = document.getElementById("stock-divs");
		stockDivs.innerHTML = "";

		stocks.forEach((stock, id) => {

			let newSymDiv = document.createElement("div");
			newSymDiv.setAttribute("class", "align");
			let newSymbol = 

				`
					<div class="stock-box">
						<h4 class="symbol-hd">${stock}<button id=${id} class="delete-btn">X</button></h4>
					</div>
				`;

				newSymDiv.innerHTML = newSymbol;
				stockDivs.appendChild(newSymDiv);
				document.getElementById("loader-box").style.display = "none";
		});

		//Delete
			let symbolHd = document.getElementsByClassName("symbol-hd");
			Array.prototype.forEach.call(symbolHd, function(el, index) {
				el.lastChild.addEventListener("click", function(evt) {
					evt.preventDefault();

					document.getElementById("loader-box").style.display = "none";

					let name = $(el).contents().filter(function() {
						  return this.nodeType === Node.TEXT_NODE;
						}).text();

					try {
						socket.emit("deleteItem", name);
					}catch(error) {console.log(error);}finally {socket.emit("checkSymbolList");}
				});
			});
	};//end createBoxes()

	socket.on("changeUp", createChart);
	socket.on("changeBoxes", createBoxes);

});//document
