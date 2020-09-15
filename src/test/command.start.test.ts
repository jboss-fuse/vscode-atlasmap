"use strict";

import * as atlasMapWebView from "../AtlasMapPanel";
import * as chai from "chai";
import * as fs from "fs";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as testUtils from "./command.test.utils";
import * as vscode from "vscode";
import { BrowserType } from "../utils";
import { RESTART_CHOICE, WARN_MSG } from '../extension';
import { fail } from "assert";

const expect = chai.expect;
chai.use(sinonChai);
const waitUntil = require('async-wait-until');

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

		before(async () => {
			sandbox = sinon.createSandbox();
			executeCommandStub = testUtils.createExecuteCommandStubFakingExternalOpenBrowserCall();
			showWarningMessageStub = sinon.stub(vscode.window, "showWarningMessage");
			showWarningMessageStub.withArgs(WARN_MSG, sinon.match.any).callsFake((args) => {
				console.log("Restart warning message shown: " + args);
			}).returns(RESTART_CHOICE);
			showWarningMessageStub.callThrough();
			showInformationMessageSpy = sinon.spy(vscode.window, "showInformationMessage");
			createOutputChannelSpy = sinon.spy(vscode.window, "createOutputChannel");
			await testUtils.switchSettingsToType(browserConfig);
			testADMFileWorking = await testUtils.downloadTestADM();
			testADMFileBroken = testUtils.createBrokenADM();
		});

		after(async () => {
			executeCommandStub.restore();
			showWarningMessageStub.restore();
			showInformationMessageSpy.restore();
			createOutputChannelSpy.restore();
			sandbox.restore();
			await testUtils.switchSettingsToType(undefined);
			if (testADMFileWorking) {
				fs.unlinkSync(testADMFileWorking);
			}
			if (testADMFileBroken) {
				fs.unlinkSync(testADMFileBroken);
			}
		});

		afterEach(async () => {
			try {
				await testUtils.stopAtlasMapInstance(port, showInformationMessageSpy);
				executeCommandStub.resetHistory();
				showWarningMessageStub.resetHistory();
				showInformationMessageSpy.resetHistory();
				createOutputChannelSpy.resetHistory();
				sandbox.resetHistory();
				port =  undefined;
			} catch(err) {
				console.error(err);
				fail(err);
			}
		});

		it("Test Start Command invocation without running AtlasMap instance", async () => {
			await testUtils.ensureExtensionActivated();
			expect(port).to.be.undefined;
			try {
				port = await testUtils.startAtlasMapInstance(showInformationMessageSpy);
				expect(executeCommandStub.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
				expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
				expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
				expect(createOutputChannelSpy.calledOnce);
			} catch (error) {
				console.error(error);
				fail(error);
			}
		});

		it("Test Start Command invocation with running AtlasMap instance (DO NOT SPAWN MORE THAN ONE ATLASMAP)", async () => {
			await testUtils.ensureExtensionActivated();
			expect(port).to.be.undefined;
			try {
				port = await testUtils.startAtlasMapInstance(showInformationMessageSpy);
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
			} catch (error) {
				console.error(error);
				fail(error);
			}
		});

		it("Test Web UI availability after startup of server", async () => {
			await testUtils.ensureExtensionActivated();
			expect(port).to.be.undefined;
			try {
				port = await testUtils.startAtlasMapInstance(showInformationMessageSpy);
				expect(executeCommandStub.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
				expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
				expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
				expect(createOutputChannelSpy.calledOnce);

				let url:string = "http://localhost:" + port;
				const body: string = await testUtils.getWebUI(url);
				expect(body, "Unexpected html response body").to.contain("AtlasMap");
				if (browserConfig === BrowserType.Internal) {
					checkContainsAtlasMapTitle();
				}
			} catch(error) {
				console.error(error);
				fail(error);
			}
		});

		it("Test import of ADM file with stopped server", async () => {
			await testUtils.ensureExtensionActivated();
			expect(port).to.be.undefined;
			expect(testADMFileWorking, "Unable to download the tagged test adm file from " + testUtils.generateGithubDownloadUrl()).to.not.be.undefined;
			const context = { fsPath: testADMFileWorking };
			port = await testUtils.startAtlasMapInstance(showInformationMessageSpy, context);
			expect(executeCommandStub.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
			expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
			expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
			expect(createOutputChannelSpy.calledOnce);

			const url:string = "http://localhost:" + port;
			const body: string = await testUtils.getWebUI(url);
			expect(body, "Unexpected html response body").to.contain("AtlasMap");
			if (browserConfig === BrowserType.Internal) {
				checkContainsAtlasMapTitle();
			}
		});

		it("Test import of ADM file with running server", async () => {
			await testUtils.ensureExtensionActivated();
			expect(port).to.be.undefined;
			expect(testADMFileWorking, "Unable to download the tagged test adm file from " + testUtils.generateGithubDownloadUrl()).to.not.be.undefined;
			let context = { fsPath: testADMFileWorking };
			try {
				port = await testUtils.startAtlasMapInstance(showInformationMessageSpy, context);
				expect(executeCommandStub.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
				expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
				expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
				expect(createOutputChannelSpy.calledOnce);
	
				let url:string = "http://localhost:" + port;
				let body: string = await testUtils.getWebUI(url);
				expect(body, "Unexpected html response body").to.contain("AtlasMap");
				if (browserConfig === BrowserType.Internal) {
					checkContainsAtlasMapTitle();
				}

				port = await testUtils.startAtlasMapInstance(showInformationMessageSpy, context);
				expect(showWarningMessageStub.withArgs(WARN_MSG).calledOnce, "There was no warning dialog shown when starting another instance with an ADM import specified.").to.be.true;
				expect(executeCommandStub.withArgs("atlasmap.start").calledTwice, "AtlasMap start command was not issued").to.be.true;
				expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
				expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
				expect(createOutputChannelSpy.calledTwice);
	
				url = "http://localhost:" + port;
				body = await testUtils.getWebUI(url);
				expect(body, "Unexpected html response body").to.contain("AtlasMap");
				if (browserConfig === BrowserType.Internal) {
					checkContainsAtlasMapTitle();
				}
			} catch (error) {
				console.error(error);
				fail(error);
			}
		});

		it("Test import of corrupted ADM file with stopped server", async () => {
			await testUtils.ensureExtensionActivated();
			expect(port).to.be.undefined;
			expect(testADMFileBroken).to.not.be.undefined;
			let context = { fsPath: testADMFileBroken };
			try {
				port = await testUtils.startAtlasMapInstance(showInformationMessageSpy, context);
				expect(executeCommandStub.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
				expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
				expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
				expect(createOutputChannelSpy.calledOnce);
	
				let url:string = "http://localhost:" + port;
				const body: string = await testUtils.getWebUI(url);
				expect(body, "Unexpected html response body").to.contain("AtlasMap");
				if (browserConfig === BrowserType.Internal) {
					checkContainsAtlasMapTitle();
				}
			} catch (error) {
				console.error(error);
				fail(error);
			}
		});

	});
});

function checkContainsAtlasMapTitle() {
	const expectedAtlasMapTitle = '<title>AtlasMap Data Mapper UI</title>';
	waitUntil( () => atlasMapWebView.default?.currentPanel?._panel.webview?.html !== undefined, 5000) ;
	expect(
		atlasMapWebView.default?.currentPanel?._panel?.webview?.html,
		`HTML doesn't contain url the ${expectedAtlasMapTitle}`).to.contain(expectedAtlasMapTitle);
}
