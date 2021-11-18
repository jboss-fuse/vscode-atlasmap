
"use strict";

import * as chai from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as vscode from "vscode";
import path = require('path');
import { fail } from "assert";

const expect = chai.expect;
chai.use(sinonChai);

describe('Test Command: atlasmap.file.create', function() {

	let sandbox: sinon.SinonSandbox;
	let showErrorMessageStub: sinon.SinonStub;
	let workspaceSelectorStub: sinon.SinonStub;
	let fileNameInputStub: sinon.SinonStub;
	
	let testADMFileName: string = 'test.adm';
	let testADMFile: vscode.Uri;
	let dummyADMFileName: string = 'dummy.adm';
	let dummyADMFile: vscode.Uri;
	let workspaceFolder: vscode.Uri;
	let wspFld: vscode.WorkspaceFolder;

	before( async () => {
		sandbox = sinon.createSandbox();

		workspaceFolder = vscode.Uri.file(path.join(__dirname, '../../../test Fixture with speci@l chars'));
		wspFld = vscode.workspace.getWorkspaceFolder(workspaceFolder);
		
		showErrorMessageStub = sinon.stub(vscode.window, 'showErrorMessage');
		workspaceSelectorStub = sinon.stub(vscode.window, 'showWorkspaceFolderPick');
		workspaceSelectorStub.returns(wspFld);
		fileNameInputStub = sinon.stub(vscode.window, 'showInputBox');
		dummyADMFile = vscode.Uri.file(`${workspaceFolder.path}/${dummyADMFileName}`);
		await vscode.workspace.fs.writeFile(dummyADMFile, Buffer.from(''));
	});

	after( async () => {
		sandbox.restore();
		showErrorMessageStub.restore();
		workspaceSelectorStub.restore();
		fileNameInputStub.restore();

		if (dummyADMFile && await fileExists(dummyADMFile)) {
			await vscode.workspace.fs.delete(dummyADMFile);
		}
		if (testADMFile && await fileExists(testADMFile)) {
			await vscode.workspace.fs.delete(testADMFile);
		}
	});

	afterEach( async () => {
		showErrorMessageStub.resetHistory();
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

	it('Test failure when file already exists', async function() {
		fileNameInputStub.onFirstCall().returns(dummyADMFileName);
		try {
			await vscode.commands.executeCommand('atlasmap.file.create');
			var file: string = `${wspFld.uri.fsPath}/${dummyADMFileName}`;
			expect(workspaceSelectorStub.called, 'Workspace Selector has not been called').to.be.true;
			expect(fileNameInputStub.called, 'File name has not been asked').to.be.true;
			expect(showErrorMessageStub.calledWithExactly(`The file ${file} already exists!`), 'The error message about existing file was not shown').to.be.true;
		} catch (err) {
			fail(err);
		}
	});
});

async function fileExists(file: vscode.Uri): Promise<boolean> {
	try {
		const stat: vscode.FileStat = await vscode.workspace.fs.stat(file);
	} catch (err) {
		// if it fails then there is no file with that name
		return false;
	}
	return true;
}
