"use strict";

import * as chai from "chai";
import * as child_process from 'child_process';
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as testUtils from "./command.test.utils";
import * as vscode from "vscode";

const expect = chai.expect;
chai.use(sinonChai);

testUtils.BROWSER_TYPES.forEach(function (browserConfig) {
	describe("Start AtlasMap Command Tests with browser type: " + browserConfig, function() {

		let sandbox: sinon.SinonSandbox;
		let executeCommandSpy: sinon.SinonSpy;
		let showInformationMessageSpy: sinon.SinonSpy;
		let createOutputChannelSpy: sinon.SinonSpy;
		let spawnChildProcessSpy: sinon.SinonSpy;
		let port: string;

		before(function() {
			sandbox = sinon.createSandbox();
			executeCommandSpy = sinon.spy(vscode.commands, "executeCommand");
			showInformationMessageSpy = sinon.spy(vscode.window, "showInformationMessage");
			createOutputChannelSpy = sinon.spy(vscode.window, "createOutputChannel");
			spawnChildProcessSpy = sinon.spy(child_process, "spawn");
			testUtils.switchSettingsToType(browserConfig);
		});

		after(function() {
			executeCommandSpy.restore();
			showInformationMessageSpy.restore();
			createOutputChannelSpy.restore();
			spawnChildProcessSpy.restore();
			sandbox.restore();
			port =  undefined;
		});

		afterEach(function(done) {
			testUtils.stopAtlasMapInstance(port, showInformationMessageSpy)
				.then( () => {
					executeCommandSpy.resetHistory();
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

		it("Test Start Command invocation with running AtlasMap instance (DO NOT SPAWN MORE THAN ONE ATLASMAP)", function(done) {
			expect(port).to.be.undefined;
			testUtils.startAtlasMapInstance(showInformationMessageSpy, spawnChildProcessSpy)
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

		it("Test Web UI availability after startup of server", function(done) {
			expect(port).to.be.undefined;
			testUtils.startAtlasMapInstance(showInformationMessageSpy, spawnChildProcessSpy)
				.then( async (_port) => {
					expect(executeCommandSpy.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
					port = _port;
					expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
					expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
					expect(createOutputChannelSpy.calledOnce);

					let url:string = "http://localhost:" + port;
					await testUtils.getWebUI(url)
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
});
