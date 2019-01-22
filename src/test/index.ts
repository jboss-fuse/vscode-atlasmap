"use strict";

import * as testRunner from "vscode/lib/testrunner";

testRunner.configure({
	slow: 50000,
	timeout: 100000,
	ui: "bdd",
	useColors: true,
});

module.exports = testRunner;
