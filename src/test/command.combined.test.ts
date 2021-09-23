"use strict";

import * as chai from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as testUtils from "./command.test.utils";
import * as vscode from "vscode";

const expect = chai.expect;
chai.use(sinonChai);

testUtils.BROWSER_TYPES.forEach(function (browserConfig) {
	describe("Combined Start Stop Commands Tests with browser type: " + browserConfig, function() {

		let sandbox: sinon.SinonSandbox;
		let executeCommandStub: sinon.SinonStub;
		let showInformationMessageSpy: sinon.SinonSpy;
		let createOutputChannelSpy: sinon.SinonSpy;
		let port: string;

		before(function() {
			sandbox = sinon.createSandbox();
			showInformationMessageSpy = sinon.spy(vscode.window, "showInformationMessage");
			createOutputChannelSpy = sinon.spy(vscode.window, "createOutputChannel");
			executeCommandStub = testUtils.createExecuteCommandStubFakingExternalOpenBrowserCall();
			testUtils.switchSettingsToType(browserConfig);
		});

		after(function() {
			showInformationMessageSpy.restore();
			createOutputChannelSpy.restore();
			sandbox.restore();
			executeCommandStub.restore();
			port = undefined;
			testUtils.switchSettingsToType(undefined);
		});

		afterEach(async () => {
			console.log(`afterEach: will stop Atlasmap instance on port: ${port}`);
			if (port !== undefined) {
				await testUtils.stopAtlasMapInstance(port, showInformationMessageSpy);
			}
			executeCommandStub.resetHistory();
			showInformationMessageSpy.resetHistory();
			createOutputChannelSpy.resetHistory();
			sandbox.resetHistory();
			port = undefined;
		});

		it("Test AtlasMap Server Output Channel Reinstantiation", async () => {
			expect(port).to.be.undefined;
			port = await testUtils.startAtlasMapInstance(showInformationMessageSpy, browserConfig);
			expect(executeCommandStub.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
			expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
			expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
			expect(createOutputChannelSpy.calledOnce);
			const isStopped = await testUtils.stopAtlasMapInstance(port, showInformationMessageSpy);
			expect(isStopped, "Unable to shutdown the AtlasMap instance! Was it running?").to.be.true;
			port = undefined;

			//  now reset some spies so the test can succeed
			showInformationMessageSpy.resetHistory();

			port = await testUtils.startAtlasMapInstance(showInformationMessageSpy, browserConfig);
			expect(executeCommandStub.withArgs("atlasmap.start").calledTwice, "AtlasMap start command was not issued").to.be.true;
			expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
			expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
			expect(createOutputChannelSpy.calledTwice);
			console.log(`End of test: port of runnign atlasmap instance is ${port}`);
		});
	});
});
