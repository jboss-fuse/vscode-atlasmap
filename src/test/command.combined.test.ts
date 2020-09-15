"use strict";

import * as chai from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as testUtils from "./command.test.utils";
import * as vscode from "vscode";
import { fail } from "assert";

const expect = chai.expect;
chai.use(sinonChai);

testUtils.BROWSER_TYPES.forEach(function (browserConfig) {
	describe("Combined Start Stop Commands Tests with browser type: " + browserConfig, function() {

		let sandbox: sinon.SinonSandbox;
		let executeCommandStub: sinon.SinonStub;
		let showInformationMessageSpy: sinon.SinonSpy;
		let createOutputChannelSpy: sinon.SinonSpy;
		let port: string;

		before(async () => {
			sandbox = sinon.createSandbox();
			showInformationMessageSpy = sinon.spy(vscode.window, "showInformationMessage");
			createOutputChannelSpy = sinon.spy(vscode.window, "createOutputChannel");
			executeCommandStub = testUtils.createExecuteCommandStubFakingExternalOpenBrowserCall();
			await testUtils.switchSettingsToType(browserConfig);
		});

		after(async () => {
			showInformationMessageSpy.restore();
			createOutputChannelSpy.restore();
			sandbox.restore();
			executeCommandStub.restore();
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
			} catch (error) {
				console.error(error);
				fail(error);
			}
		});

		it("Test AtlasMap Server Output Channel Reinstantiation", async () => {
			try {
				await testUtils.ensureExtensionActivated();
				expect(port).to.be.undefined;
				port = await testUtils.startAtlasMapInstance(showInformationMessageSpy);
				expect(executeCommandStub.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
				expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
				expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
				expect(createOutputChannelSpy.calledOnce);

				const result: boolean = await testUtils.stopAtlasMapInstance(port, showInformationMessageSpy);
				expect(result, "Unable to shutdown the AtlasMap instance! Was it running?").to.be.true;
				port =  undefined;

				//  now reset some spies so the test can succeed
				showInformationMessageSpy.resetHistory();

				port = await testUtils.startAtlasMapInstance(showInformationMessageSpy);
				expect(executeCommandStub.withArgs("atlasmap.start").calledTwice, "AtlasMap start command was not issued").to.be.true;
				expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
				expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
				expect(createOutputChannelSpy.calledTwice);
			} catch (error) {
				console.error(error);
				fail(error);
			}
		});
	});
});
