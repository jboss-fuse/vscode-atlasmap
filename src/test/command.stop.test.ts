"use strict";

import * as chai from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as vscode from "vscode";
import * as child_process from 'child_process';
import * as testUtils from "./command.test.utils";
import { DEFAULT_ATLASMAP_PORT } from '../utils';

const expect = chai.expect;
chai.use(sinonChai);

describe("Stop AtlasMap Command Tests", function() {

	let sandbox: sinon.SinonSandbox;
	let executeCommandSpy: sinon.SinonSpy;
	let showInformationMessageSpy: sinon.SinonSpy;
	let showWarningMessageSpy: sinon.SinonSpy;
	let createOutputChannelSpy: sinon.SinonSpy;
	let spawnChildProcessSpy: sinon.SinonSpy;
	let port: string;

	beforeEach(function() {
		sandbox = sinon.createSandbox();
		executeCommandSpy = sinon.spy(vscode.commands, "executeCommand");
		showInformationMessageSpy = sinon.spy(vscode.window, "showInformationMessage");
		createOutputChannelSpy = sinon.spy(vscode.window, "createOutputChannel");
		spawnChildProcessSpy = sinon.spy(child_process, "spawn");
	});

	afterEach(function(done) {
		testUtils.stopAtlasMapInstance(port, showInformationMessageSpy)
			.then( () => {
				executeCommandSpy.restore();
				showInformationMessageSpy.restore();
				createOutputChannelSpy.restore();
				spawnChildProcessSpy.restore();
				sandbox.restore();
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
		testUtils.startAtlasMapInstance(showInformationMessageSpy, spawnChildProcessSpy)
			.then( async (_port) => {
				expect(executeCommandSpy.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
				port = _port;
				expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
				expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
				expect(createOutputChannelSpy.calledOnce);

				testUtils.stopAtlasMapInstance(port, showInformationMessageSpy)
					.then( (result) => {
						expect(result, "Unable to shutdown the AtlasMap instance! Was it running?").to.be.true;
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
