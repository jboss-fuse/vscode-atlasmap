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

	before(() => {
		sandbox = sinon.createSandbox();
		inputStub = sandbox.stub(vscode.window, "showInputBox");
	});

	after(() => {
		sandbox.restore();
	});

	describe("Start", () => {

		let port = "8586";
		let errorMessageSpy = sandbox.spy(vscode.window, "showErrorMessage");

		before(() => {
			inputStub.onFirstCall().returns(port);
			inputStub.onSecondCall().returns(port);
		});

		after(() => {
			inputStub.reset();
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
			assert.ok(errorMessageSpy.calledOnceWithExactly("The port " + port + " is already occupied. Choose a different port.", sinon.match.any));

		});
	});
});
