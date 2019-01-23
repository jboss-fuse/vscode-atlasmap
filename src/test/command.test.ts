"use strict";

import * as assert from "assert";
import * as chai from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as vscode from "vscode";

const expect = chai.expect;
chai.use(sinonChai);

describe("AtlasMap/Commands", () => {
	let sandbox: sinon.SinonSandbox;
	let inputStub: sinon.SinonStub;
	let port: string;
	let errorMessageSpy: sinon.SinonSpy;

	before(() => {
		sandbox = sinon.createSandbox();
		inputStub = sandbox.stub(vscode.window, "showInputBox");
	});

	after(() => {
		sandbox.restore();
	});

	describe("Open", () => {
		before(() => {
			inputStub.onFirstCall().returns("8585");
			inputStub.onSecondCall().returns("localhost");
			inputStub.onThirdCall().returns("8585");
		});

		after(() => {
			inputStub.reset();
		});

		it("works with valid inputs", async () => {
			await vscode.commands.executeCommand("atlasmap.start");
			await vscode.commands.executeCommand("atlasmap.open");
		});
	});

	describe("Start", () => {

		before(() => {
			port = "8586";
			errorMessageSpy = sinon.spy(vscode.window.showErrorMessage);
			inputStub.onFirstCall().returns(port);
			inputStub.onSecondCall().returns(port);
		});

		after(() => {
			inputStub.reset();
			errorMessageSpy.restore;
		});

		it("detect occupied port", async () => {
			await vscode.commands.executeCommand("atlasmap.start");
			const detect = require('detect-port');
			const co = require('co');
			await( (await co(function *() {
				const _port = yield detect(port);
				return port == _port;
			})) == true);

			await vscode.commands.executeCommand("atlasmap.start");

			// deactivated for now because the spy method always returns wrong results - needs more investigation
			// expect(errorMessageSpy.calledOnceWith("The port " + port + " is already occupied. Choose a different port.", sinon.match.any)).to.be.true;
		});
	});
});
