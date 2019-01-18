'use strict';

import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';

const expect = chai.expect;
chai.use(sinonChai);

describe('AtlasMap/Commands', () => {
	let sandbox: sinon.SinonSandbox;
	const errorMessage = 'ERROR MESSAGE';

	before(() => {
		sandbox = sinon.createSandbox();
	});

	after(() => {
		sandbox.restore();
	});

	describe('Open', () => {
		let inputStub: sinon.SinonStub;

		before(() => {
			inputStub = sandbox.stub(vscode.window, 'showInputBox');
			inputStub.onFirstCall().returns("localhost");
			inputStub.onSecondCall().returns("8585");
		});

		it('works with valid inputs', async () => {
			const result = await vscode.commands.executeCommand('atlasmap.open');
			expect(result).null;
		});
	});

	describe('Start', () => {
		let inputStub: sinon.SinonStub;

		before(() => {
			inputStub = sandbox.stub(vscode.window, 'showInputBox');
			inputStub.onFirstCall().returns("8585");
		});

		it('works with valid inputs', async () => {
			const result = await vscode.commands.executeCommand('atlasmap.start');
			expect(result).null;
		});
	});
});
