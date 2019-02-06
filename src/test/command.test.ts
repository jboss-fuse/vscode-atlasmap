"use strict";

import * as chai from "chai";
import * as commandUtil from "./command.util";
import * as pWaitFor from "p-wait-for";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as vscode from "vscode";

const expect = chai.expect;
chai.use(sinonChai);

describe("AtlasMap/Commands", function() {

	let sandbox: sinon.SinonSandbox;
	let executeCommandSpy: sinon.SinonSpy;
	let showInformationMessageSpy: sinon.SinonSpy;
	let showWarningMessageSpy: sinon.SinonSpy;
	let createOutputChannelSpy: sinon.SinonSpy;
	let port: string;

	before(async function() {
		sandbox = sinon.createSandbox();
		executeCommandSpy = sinon.spy(vscode.commands, "executeCommand");
		showInformationMessageSpy = sinon.spy(vscode.window, "showInformationMessage");
		showWarningMessageSpy = sinon.spy(vscode.window, "showWarningMessage");
		createOutputChannelSpy = sinon.spy(vscode.window, "createOutputChannel");
		await vscode.commands.executeCommand("atlasmap.start");
		await new Promise(resolve => setTimeout(resolve, 15000));
	});

	after(function() {
		executeCommandSpy.restore();
		showInformationMessageSpy.restore();
		showWarningMessageSpy.restore();
		createOutputChannelSpy.restore();
		sandbox.restore();
	});

	beforeEach(function() {
		createOutputChannelSpy.resetHistory();
	});

	describe("Start AtlasMap Command Tests", function() {
	
		it("test command execution", function() {
			// atlasmap has been started in the setup of the test suite already - just check the call count and determine the port
			expect(executeCommandSpy.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
			port = commandUtil.determineUsedPort(showInformationMessageSpy);
			expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
			expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
			expect(createOutputChannelSpy.calledOnce);
		});

		it("test multiple instances startup prevention", async function() {
			expect(port, "Port is not set by previously running test").to.not.be.undefined;
			expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;

			await vscode.commands.executeCommand("atlasmap.start");

			expect(executeCommandSpy.withArgs("atlasmap.start").callCount, "AtlasMap start command was not issued").to.be.greaterThan(1);
			expect(showInformationMessageSpy.getCalls()[showInformationMessageSpy.callCount-1].args[0], "No detection message for running instance found!").to.equal("Running AtlasMap instance found at port " + port);

			await vscode.commands.executeCommand("atlasmap.start");

			expect(executeCommandSpy.withArgs("atlasmap.start").callCount, "AtlasMap start command was not issued").to.be.greaterThan(2);
			expect(showInformationMessageSpy.getCalls()[showInformationMessageSpy.callCount-1].args[0], "No detection message for running instance found!").to.equal("Running AtlasMap instance found at port " + port);
		});

		it("test ui availability", async function() {
			expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
			expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;

			let url:string = "http://localhost:" + port;
			const body = await commandUtil.getWebUI(url);
			expect(body, "Unexpected html response body").to.contain("AtlasMap");

			//Stop to avoid polluting other tests
			await vscode.commands.executeCommand("atlasmap.stop");
			await pWaitFor(() => {
				return showInformationMessageSpy.withArgs("Stopped AtlasMap instance at port " + port).calledOnce;
			}, 500, 200);
			expect(executeCommandSpy.withArgs("atlasmap.stop").calledOnce, "AtlasMap stop command was not issued").to.be.true;
			await new Promise(resolve => setTimeout(resolve, 10000));
		});
	});
});
