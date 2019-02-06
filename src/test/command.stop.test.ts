"use strict";

import * as chai from "chai";
import * as commandUtil from "./command.util";
import * as detect from 'detect-port';
import * as pWaitFor from "p-wait-for";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as vscode from "vscode";

const expect = chai.expect;
chai.use(sinonChai);

describe("AtlasMap/Commands/Stop", function() {

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

	describe("Stop AtlasMap Command Tests", function() {
	
		it("test stop command execution", async function() {
			executeCommandSpy.resetHistory();
			await vscode.commands.executeCommand("atlasmap.start");
			expect(executeCommandSpy.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;

			await pWaitFor(() => {
				return createOutputChannelSpy.withArgs("AtlasMap Server").calledOnce;
			}, 500, 200);
			await new Promise(resolve => setTimeout(resolve, 15000));

			port = commandUtil.determineUsedPort(showInformationMessageSpy);
			expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
			expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
			expect(createOutputChannelSpy.calledOnce);

			await vscode.commands.executeCommand("atlasmap.stop");
			expect(executeCommandSpy.withArgs("atlasmap.stop").calledOnce, "AtlasMap stop command was not issued").to.be.true;

			await new Promise(resolve => setTimeout(resolve, 10000));

			await retrieveFreeLocalPort(port)
				.then( (_port) => {
					expect("" + _port, "The port used to run AtlasMap seems to be still occupied. Stop command failed?").to.equal(port);
				})
				.catch( (err) => {
					expect(err).to.be.null;
				});
		});

		it("test stopping without AtlasMap running", async function() {
			// make sure no atlasmap is running
			await vscode.commands.executeCommand("atlasmap.stop");
			await new Promise(resolve => setTimeout(resolve, 10000));
			showWarningMessageSpy.resetHistory();

			// try to stop the not running atlasmap
			await vscode.commands.executeCommand("atlasmap.stop");
			expect(showWarningMessageSpy.getCalls()[showWarningMessageSpy.callCount-1].args[0], "No warning message found that no AtlasMap has been detected!").to.equal("Unable to locate running AtlasMap instance");
		});
	});


	function retrieveFreeLocalPort(testport: string): Promise<string> {
		return new Promise((resolve, reject) => {
			detect(testport)
				.then(_port => {
					resolve(_port);
				})
				.catch(err => {
					reject(err);
				});
		});
	}
});
