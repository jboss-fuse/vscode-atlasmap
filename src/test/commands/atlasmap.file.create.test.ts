
"use strict";

import * as chai from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as vscode from "vscode";
import path = require('path');
import { fail } from "assert";
import { fileExists, validateFileName } from "../../extension";
import * as fs from "fs";

const expect = chai.expect;
chai.use(sinonChai);

describe.only('Test Command: atlasmap.file.create', function() {

	let sandbox: sinon.SinonSandbox;
	let workspaceSelectorStub: sinon.SinonStub;
	let admLocationStub: sinon.SinonStub;
	let fileNameInputStub: sinon.SinonStub;
	let dirPickerWindow: sinon.SinonStub;

	let testADMFileName: string = 'test.adm';
	let testADMFile: vscode.Uri;
	let workspaceFolderUri: vscode.Uri;
	let workspaceFolder: vscode.WorkspaceFolder;

	before( async () => {
		sandbox = sinon.createSandbox();

		workspaceFolderUri = vscode.Uri.file(path.join(__dirname, '../../../test Fixture with speci@l chars'));
		workspaceFolder = vscode.workspace.getWorkspaceFolder(workspaceFolderUri);

		workspaceSelectorStub = sinon.stub(vscode.window, 'showWorkspaceFolderPick');
		admLocationStub = sinon.stub(vscode.window, 'showQuickPick');
		fileNameInputStub = sinon.stub(vscode.window, 'showInputBox');
		dirPickerWindow = sinon.stub(vscode.window, 'showOpenDialog');

	});

	after( async () => {
		sandbox.restore();
		workspaceSelectorStub.restore();
		fileNameInputStub.restore();
		admLocationStub.restore();
		dirPickerWindow.restore();

		if (testADMFile && await fileExists(testADMFile)) {
			await vscode.workspace.fs.delete(testADMFile);
		}
	});

	afterEach( async () => {
		workspaceSelectorStub.resetHistory();
		fileNameInputStub.resetHistory();
		admLocationStub.resetHistory();
	});

	it('Test execution of command and creation of file', async function() {
				
		workspaceSelectorStub.returns(workspaceFolder);
		admLocationStub.returns("");
		fileNameInputStub.onFirstCall().returns(testADMFileName);

		try {
			await vscode.commands.executeCommand('atlasmap.file.create');
			testADMFile = vscode.Uri.file(`${workspaceFolderUri.path}/${testADMFileName}`);
			expect(workspaceSelectorStub.called, 'Workspace Selector has not been called').to.be.true;
			expect(admLocationStub.called, 'Adm location selection has not been called').to.be.true;
			expect(fileNameInputStub.called, 'File name has not been asked').to.be.true;
			expect(await fileExists(testADMFile), 'The created file does not exist').to.be.true;
		} catch (err) {
			fail(err);
		}
	});
	
	it('Test execution of command and creation of file on different directory', async function() {

		const tempFolder = "admTmp";
		const tempFolderUri = path.join(workspaceFolder.uri.path, tempFolder);
		fs.mkdirSync(tempFolderUri);

		workspaceSelectorStub.returns(workspaceFolder);
		admLocationStub.returns("Select a folder inside workspace");
		dirPickerWindow.resolves([vscode.Uri.file(tempFolderUri)] as vscode.Uri[]);
		fileNameInputStub.onFirstCall().returns(testADMFileName);

		try {
			await vscode.commands.executeCommand('atlasmap.file.create');
			testADMFile = vscode.Uri.file(`${tempFolderUri}/${testADMFileName}`);
			expect(workspaceSelectorStub.called, 'Workspace Selector has not been called').to.be.true;
			expect(admLocationStub.called, 'Adm location selection has not been called').to.be.true;
			expect(dirPickerWindow.called, 'Window directory picker was not called').to.be.true;
			expect(fileNameInputStub.called, 'File name has not been asked').to.be.true;
			expect(await fileExists(testADMFile),
				'The created file does not exist').to.be.true;
		} catch (err) {
			fail(err);
		} finally {
			fs.rmSync(tempFolderUri, {force:true, recursive: true});
		}
	});

	describe('Check validator for file name', () => {
		
		it('Check validator of input for valid file name', async function () {
			expect(await validateFileName(workspaceFolder, 'good name')).to.be.undefined;
		});
		
		it('Check validator of input for invalid file name', async function () {
			expect(await validateFileName(workspaceFolder, 'wrong/name')).to.not.be.undefined;
		});
		
		it('Check validator of input for invalid empty file name', async function () {
			expect(await validateFileName(workspaceFolder, '')).to.not.be.undefined;
		});
		
	});
});
