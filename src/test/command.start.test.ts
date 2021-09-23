"use strict";

import * as atlasMapWebView from "../AtlasMapPanel";
import * as chai from "chai";
import * as fs from "fs";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as testUtils from "./command.test.utils";
import * as vscode from "vscode";
import { BrowserType } from "../utils";
import { RESTART_CHOICE, WARN_MSG, telemetryService } from '../extension';
import { waitUntil } from 'async-wait-until';
import { TelemetryEvent } from "@redhat-developer/vscode-redhat-telemetry/lib";
import { fail } from "assert";

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
		let telemetrySpy: sinon.SinonSpy;

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
			telemetrySpy = sinon.spy(telemetryService, 'send');
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
			telemetrySpy.restore();
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

		it("Test Start Command invocation without running AtlasMap instance", async() => {
			expect(port).to.be.undefined;
			port = await testUtils.startAtlasMapInstance(showInformationMessageSpy, browserConfig);
			expect(executeCommandStub.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
			expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
			expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
			expect(createOutputChannelSpy.calledOnce);
			checkTelemetry(telemetrySpy);
		});

		it("Test Start Command invocation with running AtlasMap instance (DO NOT SPAWN MORE THAN ONE ATLASMAP)", async() => {
			expect(port).to.be.undefined;
			port = await testUtils.startAtlasMapInstance(showInformationMessageSpy, browserConfig);
			expect(executeCommandStub.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
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
		});

		it("Test Web UI availability after startup of server", async() => {
			expect(port).to.be.undefined;
			port = await testUtils.startAtlasMapInstance(showInformationMessageSpy, browserConfig);
			expect(executeCommandStub.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
			expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
			expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
			expect(createOutputChannelSpy.calledOnce);

			const url: string = "http://localhost:" + port;
			const body: string = await testUtils.getWebUI(url);
			expect(body, "Unexpected html response body").to.contain("AtlasMap");
			if (browserConfig === BrowserType.Internal) {
				await checkContainsAtlasMapTitle();
			}
		});

		it("Test import of ADM file with stopped server", async() => {
			expect(port).to.be.undefined;
			expect(testADMFileWorking, "Unable to download the tagged test adm file from " + testUtils.generateGithubDownloadUrl()).to.not.be.undefined;
			const context = { fsPath: testADMFileWorking };
			port = await testUtils.startAtlasMapInstance(showInformationMessageSpy, browserConfig, context);
			expect(executeCommandStub.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
			expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
			expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
			expect(createOutputChannelSpy.calledOnce);

			const url:string = "http://localhost:" + port;
			const body: string = await testUtils.getWebUI(url);
			expect(body, "Unexpected html response body").to.contain("AtlasMap");
			if (browserConfig === BrowserType.Internal) {
				await checkContainsAtlasMapTitle();
			}
		});

		it("Test import of ADM file with running server", async() => {
			expect(port).to.be.undefined;
			expect(testADMFileWorking, "Unable to download the tagged test adm file from " + testUtils.generateGithubDownloadUrl()).to.not.be.undefined;
			const context = { fsPath: testADMFileWorking };
			port = await testUtils.startAtlasMapInstance(showInformationMessageSpy, browserConfig, context);
			expect(executeCommandStub.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
			expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
			expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
			expect(createOutputChannelSpy.calledOnce);

			let url:string = "http://localhost:" + port;
			const body: string = await testUtils.getWebUI(url);
			expect(body, "Unexpected html response body").to.contain("AtlasMap");
			if (browserConfig === BrowserType.Internal) {
				await checkContainsAtlasMapTitle();
			}

			port = await testUtils.startAtlasMapInstance(showInformationMessageSpy, browserConfig, context);
			try {
				await waitUntil(() => {
					return showWarningMessageStub.withArgs(WARN_MSG).callCount === 1;
				}, 10000);
			} catch {
				fail(`A warning dialog was expected when starting another instance with an ADM import specified. It has been displayed ${showWarningMessageStub.withArgs(WARN_MSG).callCount} time(s).`)
			}
			expect(executeCommandStub.withArgs("atlasmap.start").calledTwice, "AtlasMap start command was not issued").to.be.true;
			expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
			expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
			expect(createOutputChannelSpy.calledTwice);

			url = "http://localhost:" + port;
			const bodyOnSecondCall = await testUtils.getWebUI(url);
			expect(bodyOnSecondCall, "Unexpected html response body").to.contain("AtlasMap");
			if (browserConfig === BrowserType.Internal) {
				await checkContainsAtlasMapTitle();
			}
		});

		it("Test import of corrupted ADM file with stopped server", async() => {
			expect(port).to.be.undefined;
			expect(testADMFileBroken).to.not.be.undefined;
			const context = { fsPath: testADMFileBroken };
			port = await testUtils.startAtlasMapInstance(showInformationMessageSpy, browserConfig, context);
			expect(executeCommandStub.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
			expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
			expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
			expect(createOutputChannelSpy.calledOnce);

			const url :string = "http://localhost:" + port;
			const body :string = await testUtils.getWebUI(url);
			expect(body, "Unexpected html response body").to.contain("AtlasMap");
			if (browserConfig === BrowserType.Internal) {
				await checkContainsAtlasMapTitle();
			}
		});

	});
});

function checkTelemetry(telemetrySpy: sinon.SinonSpy<any[], any>) {
	expect(telemetrySpy.calledOnce).true;
	const actualEvent: TelemetryEvent = telemetrySpy.getCall(0).args[0];
	expect(actualEvent.name).to.be.equal('command');
}

async function checkContainsAtlasMapTitle() {
	const expectedAtlasMapTitle = '<title>AtlasMap Data Mapper UI</title>';
	await waitUntil(() => atlasMapWebView.default?.currentPanel?._panel.webview?.html?.includes(expectedAtlasMapTitle));
	expect(
		atlasMapWebView.default?.currentPanel?._panel?.webview?.html,
		`HTML doesn't contain ${expectedAtlasMapTitle}`).to.contain(expectedAtlasMapTitle);
}
