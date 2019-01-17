'use strict';

import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';

const expect = chai.expect;
chai.use(sinonChai);

suite('AtlasMap/Commands', () => {
	let sandbox: sinon.SinonSandbox;
	const errorMessage = 'ERROR MESSAGE';

	setup(() => {
		sandbox = sinon.createSandbox();
	});

	teardown(() => {
		sandbox.restore();
	});

	suite('Open', () => {
		let inputStub: sinon.SinonStub;

		setup(() => {
			inputStub = sandbox.stub(vscode.window, 'showInputBox');
			inputStub.onFirstCall().returns("localhost");
			inputStub.onSecondCall().returns("8585");
		});

		test('works with valid inputs', async () => {
			const result = await vscode.commands.executeCommand('atlasmap.open');
			expect(result).null;
		});
	});

	suite('Start', () => {
		let inputStub: sinon.SinonStub;

		setup(() => {
			inputStub = sandbox.stub(vscode.window, 'showInputBox');
			inputStub.onFirstCall().returns("8585");
		});

		test('works with valid inputs', async () => {
			const result = await vscode.commands.executeCommand('atlasmap.start');
			expect(result).null;
		});
	});
});
