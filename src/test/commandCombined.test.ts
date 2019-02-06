"use strict";

import * as chai from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as vscode from "vscode";
import * as pWaitFor from "p-wait-for";
import * as commandUtil from "./command.util";

const request = require("request");
const expect = chai.expect;
chai.use(sinonChai);

describe("AtlasMap/Commands Combined", function() {

	let sandbox: sinon.SinonSandbox;
	let executeCommandSpy: sinon.SinonSpy;
	let showInformationMessageSpy: sinon.SinonSpy;
	let createOutputChannelSpy: sinon.SinonSpy;
	let port: string;
	const keyString: string = "Starting AtlasMap instance at port ";

	before(async function() {
		sandbox = sinon.createSandbox();
		executeCommandSpy = sinon.spy(vscode.commands, "executeCommand");
		showInformationMessageSpy = sinon.spy(vscode.window, "showInformationMessage");
		createOutputChannelSpy = sinon.spy(vscode.window, "createOutputChannel");
	});

	after(function() {
		executeCommandSpy.restore();
		showInformationMessageSpy.restore();
		createOutputChannelSpy.restore();
		sandbox.restore();
	});

	beforeEach(function() {
		createOutputChannelSpy.resetHistory();
	});

	describe("Combined Open/Stop/Open tests", function() {
	
		it("test output channel recreation", async function() {
			executeCommandSpy.resetHistory();
			createOutputChannelSpy.resetHistory();
			await vscode.commands.executeCommand("atlasmap.start");
			await pWaitFor(() => {
				return createOutputChannelSpy.withArgs("AtlasMap Server").calledOnce;
			}, 500, 200);
			await new Promise(resolve => setTimeout(resolve, 15000));
			expect(executeCommandSpy.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;

			port = commandUtil.determineUsedPort(showInformationMessageSpy);
			expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
			expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;

			showInformationMessageSpy.resetHistory;
			await vscode.commands.executeCommand("atlasmap.stop");
			expect(executeCommandSpy.withArgs("atlasmap.stop").calledOnce, "AtlasMap stop command was not issued").to.be.true;
			await pWaitFor(() => {
				return showInformationMessageSpy.withArgs("Stopped AtlasMap instance at port " + port).calledOnce;
			}, 500, 200);
			
			await new Promise(resolve => setTimeout(resolve, 10000));
			await vscode.commands.executeCommand("atlasmap.start");
			await new Promise(resolve => setTimeout(resolve, 15000));
			expect(executeCommandSpy.withArgs("atlasmap.start").calledTwice, "AtlasMap start command was not issued").to.be.true;

			port = commandUtil.determineUsedPort(showInformationMessageSpy);
			expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
			expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
			await pWaitFor(() => {
				return createOutputChannelSpy.withArgs("AtlasMap Server").calledTwice;
			}, 500, 200);
			expect(createOutputChannelSpy.withArgs("AtlasMap Server").calledTwice).to.be.true;

			let url:string = "http://localhost:" + port;
			const body = await commandUtil.getWebUI(url);
			expect(body, "Unexpected html response body").to.contain("AtlasMap");

			//Stop to avoid polluting other tests
			await vscode.commands.executeCommand("atlasmap.stop");
			await pWaitFor(() => {
				return showInformationMessageSpy.withArgs("Stopped AtlasMap instance at port " + port).calledTwice;
			}, 500, 200);
			await new Promise(resolve => setTimeout(resolve, 10000));
		});
	});

});
