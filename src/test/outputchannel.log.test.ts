"use strict";

import * as chai from "chai";
import { log, disposeExtensionOutputChannel } from "../extension";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as vscode from "vscode";

const expect = chai.expect;
chai.use(sinonChai);

describe("Test Extension OutputChannel", function() {

	let sandbox: sinon.SinonSandbox;
	let createOutputChannelSpy: sinon.SinonSpy;

	before(function() {
		sandbox = sinon.createSandbox();
		createOutputChannelSpy = sinon.spy(vscode.window, "createOutputChannel");
		disposeExtensionOutputChannel();
	});

	after(function() {
		createOutputChannelSpy.restore();
		sandbox.restore();
	});

	it("Test output channel creation on new log entry", function() {
		expect(createOutputChannelSpy.called).to.be.false;
		log("This is a test!");
		expect(createOutputChannelSpy.called).to.be.true;
	});
});
