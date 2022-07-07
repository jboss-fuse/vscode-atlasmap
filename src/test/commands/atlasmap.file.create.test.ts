
"use strict";

import * as chai from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as vscode from "vscode";
import path = require('path');
import { fail } from "assert";
import { fileExists, validateFileName } from "../../extension";

const expect = chai.expect;
chai.use(sinonChai);

describe('Test Command: atlasmap.file.create', function() {

	let sandbox: sinon.SinonSandbox;
	let workspaceSelectorStub: sinon.SinonStub;
	let fileNameInputStub: sinon.SinonStub;
	
	const testADMFileName: string = 'test.adm';
	let testADMFile: vscode.Uri;
	let workspaceFolder: vscode.Uri;
	let wspFld: vscode.WorkspaceFolder;

	before( async () => {
		sandbox = sinon.createSandbox();

		workspaceFolder = vscode.Uri.file(path.join(__dirname, '../../../test Fixture with speci@l chars'));
		wspFld = vscode.workspace.getWorkspaceFolder(workspaceFolder);
		
		workspaceSelectorStub = sinon.stub(vscode.window, 'showWorkspaceFolderPick');
		workspaceSelectorStub.returns(wspFld);
		fileNameInputStub = sinon.stub(vscode.window, 'showInputBox');
	});

	after( async () => {
		sandbox.restore();
		workspaceSelectorStub.restore();
		fileNameInputStub.restore();

		if (testADMFile && await fileExists(testADMFile)) {
			await vscode.workspace.fs.delete(testADMFile);
		}
	});

	afterEach( async () => {
		workspaceSelectorStub.resetHistory();
		fileNameInputStub.resetHistory();
	});

	it('Test execution of command and creation of file', async function() {
		fileNameInputStub.onFirstCall().returns(testADMFileName);
		try {
			await vscode.commands.executeCommand('atlasmap.file.create');
			testADMFile = vscode.Uri.file(`${workspaceFolder.path}/${testADMFileName}`);
			expect(workspaceSelectorStub.called, 'Workspace Selector has not been called').to.be.true;
			expect(fileNameInputStub.called, 'File name has not been asked').to.be.true;
			expect(await fileExists(testADMFile), 'The created file does not exist').to.be.true;
		} catch (err) {
			fail(err);
		}
	});
	
	describe('Check validator for file name', () => {
		
		it('Check validator of input for valid file name', async function () {
			expect(await validateFileName(wspFld, 'good name')).to.be.undefined;
		});
		
		it('Check validator of input for invalid file name', async function () {
			expect(await validateFileName(wspFld, 'wrong/name')).to.not.be.undefined;
		});
		
		it('Check validator of input for invalid empty file name', async function () {
			expect(await validateFileName(wspFld, '')).to.not.be.undefined;
		});
		
	});
});
