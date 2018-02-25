const mongoose = require("mongoose");

let SymbolSchema = new mongoose.Schema({
	stockName: String
});

let Symbol = mongoose.model("Symbol", SymbolSchema);

module.exports = {
	Symbol
};