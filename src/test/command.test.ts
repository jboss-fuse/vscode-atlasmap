"use strict";

import * as chai from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as vscode from "vscode";
import * as detect from 'detect-port';
import * as opn from 'opn';

const request = require("request");
const expect = chai.expect;
chai.use(sinonChai);

describe("AtlasMap/Commands", function() {

	let sandbox: sinon.SinonSandbox;
	let executeCommandSpy: sinon.SinonSpy;
	let showInformationMessageSpy: sinon.SinonSpy;
	let showWarningMessageSpy: sinon.SinonSpy;
	let createOutputChannelSpy: sinon.SinonSpy;
	let port: string;
	const keyString: string = "Starting AtlasMap instance at port ";

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

	describe("Start AtlasMap Command Tests", function() {
	
		it("test command execution", function() {
			// atlasmap has been started in the setup of the test suite already - just check the call count and determine the port
			expect(executeCommandSpy.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
			port = determineUsedPort();
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
			const body = await getWebUI(url);
			expect(body, "Unexpected html response body").to.contain("AtlasMap");
		});
	});

	describe("Stop AtlasMap Command Tests", function() {
	
		it("test stop command execution", async function() {
			executeCommandSpy.resetHistory();
			await vscode.commands.executeCommand("atlasmap.start");
			expect(executeCommandSpy.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;

			port = determineUsedPort();
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

	describe("Combined Open/Stop/Open tests", function() {
	
		it("test output channel recreation", async function() {
			executeCommandSpy.resetHistory();
			createOutputChannelSpy.resetHistory();
			await openCommand();
			await new Promise(resolve => setTimeout(resolve, 15000));
			expect(executeCommandSpy.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;

			port = determineUsedPort();
			expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
			expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
			expect(createOutputChannelSpy.withArgs("AtlasMap Server").calledOnce).to.be.true;

			await vscode.commands.executeCommand("atlasmap.stop");
			expect(executeCommandSpy.withArgs("atlasmap.stop").calledOnce, "AtlasMap stop command was not issued").to.be.true;
			await new Promise(resolve => setTimeout(resolve, 10000));
			await openCommand();
			await new Promise(resolve => setTimeout(resolve, 15000));
			expect(executeCommandSpy.withArgs("atlasmap.start").calledTwice, "AtlasMap start command was not issued").to.be.true;

			port = determineUsedPort();
			expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
			expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
			expect(createOutputChannelSpy.withArgs("AtlasMap Server").calledTwice).to.be.true;

			let url:string = "http://localhost:" + port;
			const body = await getWebUI(url);
			expect(body, "Unexpected html response body").to.contain("AtlasMap");
		});
	});

	function openCommand() {
		vscode.commands.executeCommand("atlasmap.start");
	}

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

	function getWebUI(url: string) {
		return new Promise((resolve, reject) => {
			request(url, (error: any, response: any, body: any) => {
				if (error) reject(error);
				if (!response || response.statusCode != 200) {
					reject('Invalid response');
				} else {
					resolve(body);
				}
			});
		});
	}

	function determineUsedPort(): string {
		let port: string;
		for (var callIdx = 0; callIdx < showInformationMessageSpy.callCount; callIdx++) {
			let cal = showInformationMessageSpy.getCall(callIdx);
			for (var argIdx = 0; argIdx < cal.args.length; argIdx++) {
				var arg = cal.args[argIdx];
				if (arg.startsWith(keyString)) {
					port = arg.substring(keyString.length);
					break;
				}
			}
			if (port !== undefined) {
				break;
			}
		}
		return port;
	}
});
