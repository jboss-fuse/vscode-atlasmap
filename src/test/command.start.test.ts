"use strict";

import * as atlasMapWebView from "../AtlasMapPanel";
import * as chai from "chai";
import * as child_process from 'child_process';
import * as fs from "fs";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as testUtils from "./command.test.utils";
import * as vscode from "vscode";
import { BrowserType } from "../utils";
import { RESTART_CHOICE, WARN_MSG } from '../extension';

const expect = chai.expect;
chai.use(sinonChai);

testUtils.BROWSER_TYPES.forEach(function (browserConfig) {
	describe("Start AtlasMap Command Tests with browser type: " + browserConfig, function() {

		let sandbox: sinon.SinonSandbox;
		let executeCommandStub: sinon.SinonStub;
		let showWarningMessageStub: sinon.SinonStub;
		let showInformationMessageSpy: sinon.SinonSpy;
		let createOutputChannelSpy: sinon.SinonSpy;
		let port: string;
		let testADMFileWorking: string;
		let testADMFileBroken: string;

		before(async function() {
			sandbox = sinon.createSandbox();
			executeCommandStub = testUtils.createExecuteCommandStubFakingExternalOpenBrowserCall();
			showWarningMessageStub = sinon.stub(vscode.window, "showWarningMessage");
			showWarningMessageStub.withArgs(WARN_MSG, sinon.match.any).callsFake((args) => {
				console.log("Restart warning message shown: " + args);
			}).returns(RESTART_CHOICE);
			showWarningMessageStub.callThrough();
			showInformationMessageSpy = sinon.spy(vscode.window, "showInformationMessage");
			createOutputChannelSpy = sinon.spy(vscode.window, "createOutputChannel");
			testUtils.switchSettingsToType(browserConfig);
			testADMFileWorking = await testUtils.downloadTestADM();
			testADMFileBroken = testUtils.createBrokenADM();
		});

		after(function() {
			executeCommandStub.restore();
			showWarningMessageStub.restore();
			showInformationMessageSpy.restore();
			createOutputChannelSpy.restore();
			sandbox.restore();
			testUtils.switchSettingsToType(undefined);
			if (testADMFileWorking) {
				fs.unlink(testADMFileWorking, (err) => {
					if (err) throw err;
				});
			}
			if (testADMFileBroken) {
				fs.unlink(testADMFileBroken, (err) => {
					if (err) throw err;
				});
			}
		});

		afterEach(function(done) {
			testUtils.stopAtlasMapInstance(port, showInformationMessageSpy)
				.then( () => {
					executeCommandStub.resetHistory();
					showWarningMessageStub.resetHistory();
					showInformationMessageSpy.resetHistory();
					createOutputChannelSpy.resetHistory();
					sandbox.resetHistory();
					port =  undefined;
					done();
				})
				.catch( (err) => {
					console.error(err);
					done(err);
				});
		});

		it("Test Start Command invocation without running AtlasMap instance", function(done) {
			expect(port).to.be.undefined;
			testUtils.startAtlasMapInstance(showInformationMessageSpy)
				.then( _port => {
					expect(executeCommandStub.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
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

		it("Test Start Command invocation with running AtlasMap instance (DO NOT SPAWN MORE THAN ONE ATLASMAP)", function(done) {
			expect(port).to.be.undefined;
			testUtils.startAtlasMapInstance(showInformationMessageSpy)
				.then( async (_port) => {
					expect(executeCommandStub.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
					port = _port;
					expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
					expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
					expect(createOutputChannelSpy.calledOnce);

					await vscode.commands.executeCommand("atlasmap.start");
					expect(executeCommandStub.withArgs("atlasmap.start").callCount, "AtlasMap start command was not issued").to.be.greaterThan(1);
					expect(showInformationMessageSpy.getCalls()[showInformationMessageSpy.callCount-1].args[0], "No detection message for running instance found!").to.equal("Running AtlasMap instance found at port " + port);

					await vscode.commands.executeCommand("atlasmap.start");
					expect(executeCommandStub.withArgs("atlasmap.start").callCount, "AtlasMap start command was not issued").to.be.greaterThan(2);
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

		it("Test Web UI availability after startup of server", function(done) {
			expect(port).to.be.undefined;
			testUtils.startAtlasMapInstance(showInformationMessageSpy)
				.then( async (_port) => {
					expect(executeCommandStub.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
					port = _port;
					expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
					expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
					expect(createOutputChannelSpy.calledOnce);

					let url:string = "http://localhost:" + port;
					await testUtils.getWebUI(url)
						.then( (body) => {
							expect(body, "Unexpected html response body").to.contain("AtlasMap");
							if (browserConfig === BrowserType.Internal) {
								checkBorderStyleAvailable();
							}
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

		it("Test import of ADM file with stopped server", function(done) {
			expect(port).to.be.undefined;
			expect(testADMFileWorking, "Unable to download the tagged test adm file from " + testUtils.generateGithubDownloadUrl()).to.not.be.undefined;
			let context = { fsPath: testADMFileWorking };
			testUtils.startAtlasMapInstance(showInformationMessageSpy, context)
				.then( async (_port) => {
					expect(executeCommandStub.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
					port = _port;
					expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
					expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
					expect(createOutputChannelSpy.calledOnce);

					let url:string = "http://localhost:" + port;
					await testUtils.getWebUI(url)
						.then( (body) => {
							expect(body, "Unexpected html response body").to.contain("AtlasMap");
							if (browserConfig === BrowserType.Internal) {
								checkBorderStyleAvailable();
							}
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

		it("Test import of ADM file with running server", function(done) {
			expect(port).to.be.undefined;
			expect(testADMFileWorking, "Unable to download the tagged test adm file from " + testUtils.generateGithubDownloadUrl()).to.not.be.undefined;
			let context = { fsPath: testADMFileWorking };
			testUtils.startAtlasMapInstance(showInformationMessageSpy, context)
				.then( async (_port) => {
					expect(executeCommandStub.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
					port = _port;
					expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
					expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
					expect(createOutputChannelSpy.calledOnce);

					let url:string = "http://localhost:" + port;
					await testUtils.getWebUI(url)
						.then( (body) => {
							expect(body, "Unexpected html response body").to.contain("AtlasMap");
							if (browserConfig === BrowserType.Internal) {
								checkBorderStyleAvailable();
							}


							testUtils.startAtlasMapInstance(showInformationMessageSpy, context)
							.then( async (_port) => {
								expect(showWarningMessageStub.withArgs(WARN_MSG).calledOnce, "There was no warning dialog shown when starting another instance with an ADM import specified.").to.be.true;
								expect(executeCommandStub.withArgs("atlasmap.start").calledTwice, "AtlasMap start command was not issued").to.be.true;
								port = _port;
								expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
								expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
								expect(createOutputChannelSpy.calledTwice);

								let url:string = "http://localhost:" + port;
								await testUtils.getWebUI(url)
									.then( (body) => {
										expect(body, "Unexpected html response body").to.contain("AtlasMap");
										if (browserConfig === BrowserType.Internal) {
											checkBorderStyleAvailable();
										}
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

		it("Test import of corrupted ADM file with stopped server", function(done) {
			expect(port).to.be.undefined;
			expect(testADMFileBroken).to.not.be.undefined;
			let context = { fsPath: testADMFileBroken };
			testUtils.startAtlasMapInstance(showInformationMessageSpy, context)
				.then( async (_port) => {
					expect(executeCommandStub.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
					port = _port;
					expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
					expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
					expect(createOutputChannelSpy.calledOnce);

					let url:string = "http://localhost:" + port;
					await testUtils.getWebUI(url)
						.then( (body) => {
							expect(body, "Unexpected html response body").to.contain("AtlasMap");
							if (browserConfig === BrowserType.Internal) {
								checkBorderStyleAvailable();
							}
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
});


function checkBorderStyleAvailable() {
	expect(atlasMapWebView.default.currentPanel._panel.webview.html, "HTML doesn't contain url the <title>AtlasMap Data Mapper UI</title>").to.contain('<title>AtlasMap Data Mapper UI</title>');
}

