const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const {Symbol} = require("../models/symbols");

router.get("/", (req, res) => {
	res.redirect("/chart.html")
});

module.exports = router;