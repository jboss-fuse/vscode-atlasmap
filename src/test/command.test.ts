"use strict";

import * as vscode from "vscode";
import * as chai from "chai";
import * as sinonChai from "sinon-chai";
import * as sinon from "sinon";

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

	describe("Open", () => {
		before(() => {
			inputStub.onFirstCall().returns("8585");
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
			inputStub.onFirstCall().returns("localhost");
			inputStub.onSecondCall().returns("8585");
		});

		after(() => {
			inputStub.reset();
		});

		it("works with valid inputs", async () => {
			await vscode.commands.executeCommand("atlasmap.start");
		});
	});
});
