require("../.config/.config");
const express = require("express");
const request = require("request");
const http = require("http");
const socketIO = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const indexRoutes = require("./routes/routes");
const mongoose = require("mongoose");
const {Symbol} = require("./models/symbols");

let path = require("path");
let publicPath = path.join(__dirname , "../public");
let publicPath2 = path.join(__dirname , "../public/views");

let port = process.env.PORT || 3000;

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI, {
	//useMongoClient: true, // MongoClient deprecated on mongoose v
	promiseLibrary: mongoose.promise
}).then(db => {console.log("mongoDb connected")}).catch((err) => {
	console.log("error connecting to mongoDb");
	throw err;
}).catch((err) => {console.log(err); throw err});

app.set("view options", {layout: false});
app.set("view engine", "html");
console.log("publicPath ", publicPath);
app.use(express.static(publicPath));
app.use(express.static(publicPath2));

app.use("/", indexRoutes);

io.on("connection", (socket) => {

	console.log("Connection to server established");

/* ---------------- END CONNECTIONS TESTS ----------------- */

//Receives and sends amended symbol list array to createBoxes()
socket.on("loadBoxes", (data) => {
	console.log("load event received ", data);
	io.sockets.emit("changeBoxes", data);
});

//--> Amend this to gather stock data instead of name collection
socket.on("deleteItem", (item) => {
	console.log("deleteItem event received:", item);
	Symbol.findOneAndRemove({"stockName": item}).then((item) => {
		if(!item) {
			console.log({"error": "Can't find item"});
		}else {
			console.log("item deleted");
			getCurrentStockData();
		} //else
	}).catch((err) => {console.log(err);});
}); //deleteItem


function getCurrentStockData() {

	Symbol.find({}).then((allSym) => {
		let collection = [];
		let seriesOpts = [];
		let seriesCounter = 0;

		allSym.forEach((sym) => {

			collection.push(sym.stockName);
		});

		console.log("checking collection: ", collection);

		collection.forEach((name, i) => {
			let options = {
			url: `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${name}&apikey=process.env.API_KEY`,
			method: "GET"
		};
			request(options, (error, response, body) => {

				let result = body;
				result = JSON.parse(result);
				//console.log("checking result from deleteItem: ", result);
				let dataArr = [];
				let keys = Object.keys(result);
				//console.log("keys ", keys);
				let timeSeries = result[keys[1]];
				//console.log("timeSeries: ", timeSeries);
				let name = result[keys[0]]["2. Symbol"];

				for(key in timeSeries) {
		//Get each day's date and convert to milliseconds
					let date = new Date(key);
					let milli = date.getTime();
		//Get the closing stock value and convert to number
					let close = timeSeries[key]["4. close"];
					close = Number(close);
		//We must put data to be shown on x-axis in ascending order. We unshift milli and close into an array in dataArr for processing by Highstocks
					dataArr.unshift([milli, close]);
				}

				seriesOpts[i] = {
					name: name,
					data: dataArr
				}

				seriesCounter += 1;

				if(seriesCounter === collection.length) {
					console.log("emitting changeUp event from getCurrentStockData to draw chart");
					io.sockets.emit("changeUp", seriesOpts);
					//socket.emit("currentStockData");
					seriesCounter = 0;
					collection.length = 0;
				}
				//Triggers calling the checkSymbolList event on client

			}); //request

		}); //collection.forEach
	}).catch((err) => {console.log(err);}); //Symbol.find()

} //getCurrentStockData()

//Sends stock list to createChart() for graphic rendering
socket.on("updateChange", (data) => {
	console.log("updateChange event received: ", data.length);
	console.log("emitting changeUp");
	io.sockets.emit("changeUp", data);
});

//Gets stock data for each symbol in a given array. Used for pageload and refresh events
socket.on("getStockData", (names) => {
	console.log("names - getStockData: ", names);
	getCurrentStockData();
});

socket.on("addSymbol", (sym) => {
	console.log("sym ", sym);
	let newItem = {
		stockName: sym
	}
	Symbol.create(newItem).then((response) => {
		console.log("newItem created");
		//socket.emit("symbolAdded", response);
		getCurrentStockData();
	}).catch((err) => {console.log("catch err ", err);});
});

socket.on("checkSymbolList", () => {
	console.log("check symbol list event received");
	Symbol.find({}).then((allSym) => {
		let collection = [];
		allSym.forEach((sym) => {
			collection.push(sym.stockName);
		});
		io.sockets.emit("changeBoxes", collection);
	}).catch((err) => {console.log(err);});
});

}); //io.on


server.listen(port, () => {
	console.log(`Chart server listening on ${port}`);
});