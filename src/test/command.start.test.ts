"use strict";

import * as atlasMapWebView from "../atlasMapWebView";
import * as chai from "chai";
import * as child_process from 'child_process';
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as testUtils from "./command.test.utils";
import * as vscode from "vscode";
import { BrowserType } from "../utils";

const expect = chai.expect;
chai.use(sinonChai);

testUtils.BROWSER_TYPES.forEach(function (browserConfig) {
	describe("Start AtlasMap Command Tests with browser type: " + browserConfig, function() {

		let sandbox: sinon.SinonSandbox;
		let executeCommandStub: sinon.SinonStub;
		let showInformationMessageSpy: sinon.SinonSpy;
		let createOutputChannelSpy: sinon.SinonSpy;
		let spawnChildProcessSpy: sinon.SinonSpy;
		let port: string;

		before(function() {
			sandbox = sinon.createSandbox();
			executeCommandStub = testUtils.createExecuteCommandStubFakingExternalOpenBrowserCall();
			showInformationMessageSpy = sinon.spy(vscode.window, "showInformationMessage");
			createOutputChannelSpy = sinon.spy(vscode.window, "createOutputChannel");
			spawnChildProcessSpy = sinon.spy(child_process, "spawn");
			testUtils.switchSettingsToType(browserConfig);
		});

		after(function() {
			executeCommandStub.restore();
			showInformationMessageSpy.restore();
			createOutputChannelSpy.restore();
			spawnChildProcessSpy.restore();
			sandbox.restore();
			port =  undefined;
			testUtils.switchSettingsToType(undefined);
		});

		afterEach(function(done) {
			testUtils.stopAtlasMapInstance(port, showInformationMessageSpy)
				.then( () => {
					executeCommandStub.resetHistory();
					showInformationMessageSpy.resetHistory();
					createOutputChannelSpy.resetHistory();
					spawnChildProcessSpy.resetHistory();
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
			testUtils.startAtlasMapInstance(showInformationMessageSpy, spawnChildProcessSpy)
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

		it("Test Web UI availability after startup of server", function(done) {
			expect(port).to.be.undefined;
			testUtils.startAtlasMapInstance(showInformationMessageSpy, spawnChildProcessSpy)
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
								expect(atlasMapWebView.default.currentPanel._panel.webview.html).to.contain(url).and.to.contain('<body style="padding: 0">');
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


