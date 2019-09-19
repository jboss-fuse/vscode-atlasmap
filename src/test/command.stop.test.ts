"use strict";

import * as chai from "chai";
import * as child_process from 'child_process';
import { DEFAULT_ATLASMAP_PORT, BrowserType } from '../utils';
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as testUtils from "./command.test.utils";
import * as vscode from "vscode";
import { isInternalWebViewClosed } from './command.test.utils';

const expect = chai.expect;
chai.use(sinonChai);

testUtils.BROWSER_TYPES.forEach(function (browserConfig) {
	describe("Stop AtlasMap Command Tests with browser type: " + browserConfig, function() {

		let sandbox: sinon.SinonSandbox;
		let executeCommandStub: sinon.SinonStub;
		let showInformationMessageSpy: sinon.SinonSpy;
		let createOutputChannelSpy: sinon.SinonSpy;
		let port: string;

		before(function() {
			sandbox = sinon.createSandbox();
			executeCommandStub = testUtils.createExecuteCommandStubFakingExternalOpenBrowserCall();
			showInformationMessageSpy = sinon.spy(vscode.window, "showInformationMessage");
			createOutputChannelSpy = sinon.spy(vscode.window, "createOutputChannel");
			testUtils.switchSettingsToType(browserConfig);
		});

		after(function() {
			executeCommandStub.restore();
			showInformationMessageSpy.restore();
			createOutputChannelSpy.restore();
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
					sandbox.resetHistory();
					port =  undefined;
					done();
				})
				.catch( (err) => {
					console.error(err);
					done(err);
				});
		});

		it("Test Stop Command invocation with running AtlasMap instance", function(done) {
			expect(port).to.be.undefined;
			testUtils.startAtlasMapInstance(showInformationMessageSpy)
				.then( async (_port) => {
					expect(executeCommandStub.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
					port = _port;
					expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
					expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
					expect(createOutputChannelSpy.calledOnce);

					testUtils.stopAtlasMapInstance(port, showInformationMessageSpy)
						.then( (result) => {
							expect(result, "Unable to shutdown the AtlasMap instance! Was it running?").to.be.true;
							if (BrowserType.Internal === browserConfig) {
								expect(isInternalWebViewClosed(), "It seems the internal web view ui is still not closed.").to.be.true;
							}
							port =  undefined;
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

		it("Test Stop Command invocation without running AtlasMap instance", function(done) {
			expect(port).to.be.undefined;
			testUtils.stopAtlasMapInstance(DEFAULT_ATLASMAP_PORT, showInformationMessageSpy)
				.then( (result) => {
					expect(result, "There is no AtlasMap running, so why does it report back its successfully stopped?").to.be.false;
					port =  undefined;
					done();
				})
				.catch( err => {
					console.error(err);
					done(err);
				});
		});
	});
});
