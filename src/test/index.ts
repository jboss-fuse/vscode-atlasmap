"use strict";

import * as testRunner from "vscode/lib/testrunner";

process.on("unhandledRejection", err => {
	console.log("Unhandled rejection:", err);
});

testRunner.configure({
	ui: "bdd",
	useColors: true,
	timeout: 100000,
	slow: 50000
});

module.exports = testRunner;
