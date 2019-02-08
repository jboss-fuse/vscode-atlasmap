"use strict";

import * as chai from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as vscode from "vscode";
import * as child_process from 'child_process';

const request = require("request");
const expect = chai.expect;
chai.use(sinonChai);

const MAX_WAIT = 10000;
const STEP = 1000;
const DEFAULT_PORT = "8585";

describe("AtlasMap/Commands", function() {

	let sandbox: sinon.SinonSandbox;
	let executeCommandSpy: sinon.SinonSpy;
	let showInformationMessageSpy: sinon.SinonSpy;
	let showWarningMessageSpy: sinon.SinonSpy;
	let createOutputChannelSpy: sinon.SinonSpy;
	let spawnChildProcessSpy: sinon.SinonSpy;
	let port: string;
	const keyString: string = "Starting AtlasMap instance at port ";

	beforeEach(function() {
		sandbox = sinon.createSandbox();
		executeCommandSpy = sinon.spy(vscode.commands, "executeCommand");
		showInformationMessageSpy = sinon.spy(vscode.window, "showInformationMessage");
		showWarningMessageSpy = sinon.spy(vscode.window, "showWarningMessage");
		createOutputChannelSpy = sinon.spy(vscode.window, "createOutputChannel");
		spawnChildProcessSpy = sinon.spy(child_process, "spawn");
	});

	afterEach(function(done) {
		stopAtlasMapInstance(port)
			.then( () => {
				executeCommandSpy.restore();
				showInformationMessageSpy.restore();
				showWarningMessageSpy.restore();
				createOutputChannelSpy.restore();
				spawnChildProcessSpy.restore();
				sandbox.restore();
				done();
			})
			.catch( (err) => {
				console.error(err);
				done(err);
			});
	});

	describe("Start AtlasMap Command Tests", function() {
	
		it("test command execution", function(done) {
			expect(port).to.be.undefined;
			startAtlasMapInstance()
				.then( _port => {
					expect(executeCommandSpy.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
					port = _port;
					expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
					expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
					expect(createOutputChannelSpy.calledOnce);
					done();
				})
				.catch( err => {
					console.error(err);
					done(err);
				});
		});

		it("test multiple instances startup prevention", function(done) {
			expect(port).to.be.undefined;
			startAtlasMapInstance()
				.then( async (_port) => {
					expect(executeCommandSpy.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
					port = _port;
					expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
					expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
					expect(createOutputChannelSpy.calledOnce);

					await vscode.commands.executeCommand("atlasmap.start");
					expect(executeCommandSpy.withArgs("atlasmap.start").callCount, "AtlasMap start command was not issued").to.be.greaterThan(1);
					expect(showInformationMessageSpy.getCalls()[showInformationMessageSpy.callCount-1].args[0], "No detection message for running instance found!").to.equal("Running AtlasMap instance found at port " + port);
		
					await vscode.commands.executeCommand("atlasmap.start");
					expect(executeCommandSpy.withArgs("atlasmap.start").callCount, "AtlasMap start command was not issued").to.be.greaterThan(2);
					expect(showInformationMessageSpy.getCalls()[showInformationMessageSpy.callCount-1].args[0], "No detection message for running instance found!").to.equal("Running AtlasMap instance found at port " + port);
		
					// wait a bit for the web ui  to be ready - not nice but works fine
					await new Promise(resolve => setTimeout(resolve, 3000));

					done();
				})
				.catch( err => {
					console.error(err);
					done(err);
				});
		});

		it("test ui availability", function(done) {
			expect(port).to.be.undefined;
			startAtlasMapInstance()
				.then( async (_port) => {
					expect(executeCommandSpy.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
					port = _port;
					expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
					expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
					expect(createOutputChannelSpy.calledOnce);

					let url:string = "http://localhost:" + port;
					await getWebUI(url)
						.then( (body) => {
							expect(body, "Unexpected html response body").to.contain("AtlasMap");
							done();
						})
						.catch( (err) => {
							console.error(err);
							done(err);
						});
				})
				.catch( err => {
					console.error(err);
					done(err);
				});
		});
	});

	describe("Stop AtlasMap Command Tests", function() {
	
		it("test stop command execution", function(done) {
			expect(port).to.be.undefined;
			startAtlasMapInstance()
				.then( async (_port) => {
					expect(executeCommandSpy.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
					port = _port;
					expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
					expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
					expect(createOutputChannelSpy.calledOnce);

					stopAtlasMapInstance(port)
						.then( (result) => {
							expect(result, "Unable to shutdown the AtlasMap instance! Was it running?").to.be.true;
							done();
						})
						.catch( err => {
							console.error(err);
							done(err);
						});	
				})
				.catch( err => {
					console.error(err);
					done(err);
				});
		});

		it("test stopping without AtlasMap running", function(done) {
			expect(port).to.be.undefined;
			stopAtlasMapInstance(DEFAULT_PORT)
				.then( (result) => {
					expect(result, "There is no AtlasMap running, so why does it report back its successfully stopped?").to.be.false;
					done();
				})
				.catch( err => {
					console.error(err);
					done(err);
				});
		});
	});

	describe("Combined Open/Stop/Open tests", function() {
	
		it("test output channel recreation", function(done) {
			expect(port).to.be.undefined;
			startAtlasMapInstance()
				.then( (_port) => {
					expect(executeCommandSpy.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
					port = _port;
					expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
					expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
					expect(createOutputChannelSpy.calledOnce);

					stopAtlasMapInstance(port)
						.then( (result) => {
							expect(result, "Unable to shutdown the AtlasMap instance! Was it running?").to.be.true;

							//  now reset some spies so the test can succeed
							showInformationMessageSpy.resetHistory();
							spawnChildProcessSpy.resetHistory();

							startAtlasMapInstance() 
								.then( (_port) => {
									expect(executeCommandSpy.withArgs("atlasmap.start").calledTwice, "AtlasMap start command was not issued").to.be.true;
									port = _port;
									expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
									expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
									expect(createOutputChannelSpy.calledTwice);

									done();
								})
								.catch( err => {
									console.error(err);
									done(err);
								});	
						})
						.catch( err => {
							console.error(err);
							done(err);
						});
				})
				.catch( err => {
					console.error(err);
					done(err);
				});
		});
	});

	function getWebUI(url: string): Promise<string> {
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
		for (let call of showInformationMessageSpy.getCalls()) {
			for (let arg of call.args) {
				if (!Array.isArray(arg) && arg.startsWith(keyString)) {
					return arg.substring(keyString.length);
				}
			}
		}
		return undefined;
	}

	function startAtlasMapInstance(): Promise<string> {
		return new Promise<string>(async (resolve, reject) => {
			await vscode.commands.executeCommand("atlasmap.start");
			let waitTime = 0;
			while (!showInformationMessageSpy.called && waitTime < MAX_WAIT) {
				await waitForTask("WaitForPortNumber")
				.then( () => {
					waitTime += STEP;
				});				
			}
			let _port = determineUsedPort();

			expect(_port, "Seems we can't determine the used port number").to.not.be.null;
			expect(_port, "Seems we can't determine the used port number").to.not.be.undefined;
			expect(_port, "Seems we can't determine the used port number").to.not.be.NaN;
			
			const url:string = "http://localhost:" + _port;
			let called = hasStringInSpy(url, spawnChildProcessSpy);
			while(!called) {
				await waitForTask("OpenBrowser")
					.then( () => {
						called = hasStringInSpy(url, spawnChildProcessSpy);
					});
			}

			// wait a bit for the web ui  to be ready - not nice but works fine
			await new Promise(resolve => setTimeout(resolve, 3000));

			await getWebUI(url)
				.then( body => {
					expect(body, "Unexpected html response body").to.contain("AtlasMap");
					resolve(_port);
				})
				.catch( err => {
					reject(err);
				});
		});
	}

	function stopAtlasMapInstance(_port: string = DEFAULT_PORT): Promise<boolean> {
		return new Promise<boolean>( async (resolve, reject) => {
			await vscode.commands.executeCommand("atlasmap.stop");
			let waitTime = 0;
			while (!hasStopMessageInInfoMessage() && waitTime < MAX_WAIT) {
				await waitForTask("AtlasMapShutdown")
					.then( () => {
						waitTime += STEP;
					});
			}
			port = undefined;
			// wait a bit for the port to be really free - not nice but works fine
			await new Promise(resolve => setTimeout(resolve, 3000));
			resolve(waitTime < MAX_WAIT);
		});
	}

	async function waitForTask(taskName: string = "<unknownTasK>") {
		console.log("Waiting for task [" + taskName + "] to complete...");
		await new Promise(resolve => setTimeout(resolve, STEP));
	}

	function hasStopMessageInInfoMessage(): boolean {
		return hasStringInSpy("Stopped AtlasMap instance at port ", showInformationMessageSpy);
	}

	function hasStringInSpy(searchString: string, spy: sinon.SinonSpy): boolean {
		for (let call of spy.getCalls()) {
			for (let arg of call.args) {
				if (Array.isArray(arg)) {
					for (let v of arg) {
						if (v.indexOf(searchString) >= 0) {
							return true;
						}
					}
				} else {
					if (arg.indexOf(searchString) >= 0) {
						return true;
					}
				}
			}
		}
		return false;
	}
});
