"use strict";

import * as chai from "chai";
import { DEFAULT_ATLASMAP_PORT, BrowserType } from '../utils';
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as testUtils from "./command.test.utils";
import * as vscode from "vscode";
import { isInternalWebViewClosed } from './command.test.utils';
import { fail } from "assert";

const expect = chai.expect;
chai.use(sinonChai);

testUtils.BROWSER_TYPES.forEach(function (browserConfig) {
	describe("Stop AtlasMap Command Tests with browser type: " + browserConfig, function() {

		let sandbox: sinon.SinonSandbox;
		let executeCommandStub: sinon.SinonStub;
		let showInformationMessageSpy: sinon.SinonSpy;
		let createOutputChannelSpy: sinon.SinonSpy;
		let port: string;

		before(async () => {
			sandbox = sinon.createSandbox();
			executeCommandStub = testUtils.createExecuteCommandStubFakingExternalOpenBrowserCall();
			showInformationMessageSpy = sinon.spy(vscode.window, "showInformationMessage");
			createOutputChannelSpy = sinon.spy(vscode.window, "createOutputChannel");
			await testUtils.switchSettingsToType(browserConfig);
		});

		after(async () => {
			executeCommandStub.restore();
			showInformationMessageSpy.restore();
			createOutputChannelSpy.restore();
			sandbox.restore();
			port =  undefined;
			await testUtils.switchSettingsToType(undefined);
		});

		afterEach(async () => {
			try { 
				await testUtils.stopAtlasMapInstance(port, showInformationMessageSpy);
				executeCommandStub.resetHistory();
				showInformationMessageSpy.resetHistory();
				createOutputChannelSpy.resetHistory();
				sandbox.resetHistory();
				port =  undefined;
			} catch(err) {
				console.error(err);
				fail(err);
			}
		});

		it("Test Stop Command invocation with running AtlasMap instance", async () => {
			await testUtils.ensureExtensionActivated();
			expect(port).to.be.undefined;
			try {
				port = await testUtils.startAtlasMapInstance(showInformationMessageSpy);
				expect(executeCommandStub.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
				expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
				expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
				expect(createOutputChannelSpy.calledOnce);

				const result: boolean = await testUtils.stopAtlasMapInstance(port, showInformationMessageSpy);
				expect(result, "Unable to shutdown the AtlasMap instance! Was it running?").to.be.true;
				if (BrowserType.Internal === browserConfig) {
					expect(isInternalWebViewClosed(), "It seems the internal web view ui is still not closed.").to.be.true;
				}
				port =  undefined;
			} catch (err) {
				console.error(err);
				fail(err);
			}
		});

		it("Test Stop Command invocation without running AtlasMap instance", async () => {
			await testUtils.ensureExtensionActivated();
			expect(port).to.be.undefined;
			try {
				const result: boolean = await testUtils.stopAtlasMapInstance(DEFAULT_ATLASMAP_PORT, showInformationMessageSpy);
				expect(result, "There is no AtlasMap running, so why does it report back its successfully stopped?").to.be.false;
				port =  undefined;
			} catch(err) {
				console.error(err);
				fail(err);
			}
		});
	});
});
