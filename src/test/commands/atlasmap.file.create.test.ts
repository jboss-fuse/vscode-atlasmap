
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

describe('Test Command: atlasmap.file.create', function() {

	const WORKSPACE_SELECTOR_ASSERTION_LABEL = 
		"Workspace selection input was shown";
	const ADM_LOCATION_SELECTOR_ASSERTION_LABEL =
		".adm location quick pick was shown";
	const FILE_NAME_INPUT_ASSERTION_LABEL =
		"File name input was shown";
	const SELECT_FOLDER_WINDOW_ASSERTION_LABEL =
		"Folder selection window was shown";
	const INFO_MESSAGE_ASSERTION_LABEL =
		"Information message was shown telling the user about the command cancelling";
	const ERROR_MESSAGE_ASSERTION_LABEL =
		"Error message telling user that the .adm file must be inside workspace was shown";
	const FILE_CREATED_ASSERTION_LABEL =
		location => `The .adm file was created at expected location: ${location}`;

	let sandbox: sinon.SinonSandbox;
	let workspaceSelectorStub: sinon.SinonStub;
	let admLocationStub: sinon.SinonStub;
	let fileNameInputStub: sinon.SinonStub;
	let dirPickerWindow: sinon.SinonStub;
	let infoMessageStub: sinon.SinonStub;
	let errorMessageStub: sinon.SinonStub;

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
		infoMessageStub = sinon.stub(vscode.window, 'showInformationMessage');
		errorMessageStub = sinon.stub(vscode.window, "showErrorMessage");

	});

	after( async () => {
		sandbox.restore();
		workspaceSelectorStub.restore();
		fileNameInputStub.restore();
		admLocationStub.restore();
		dirPickerWindow.restore();
		errorMessageStub.restore();
		infoMessageStub.restore();

		if (testADMFile && await fileExists(testADMFile)) {
			await vscode.workspace.fs.delete(testADMFile);
		}
	});

	afterEach( async () => {
		workspaceSelectorStub.resetHistory();
		fileNameInputStub.resetHistory();
		admLocationStub.resetHistory();
		dirPickerWindow.resetHistory();
		errorMessageStub.resetHistory();
		infoMessageStub.resetHistory();
	});

	it('Test execution of command and creation of file', async function() {
				
		workspaceSelectorStub.returns(workspaceFolder);
		admLocationStub.returns("");
		fileNameInputStub.returns(testADMFileName);

		try {
			await vscode.commands.executeCommand('atlasmap.file.create');
			testADMFile = vscode.Uri.file(`${workspaceFolderUri.path}/${testADMFileName}`);
			expect(workspaceSelectorStub.called, WORKSPACE_SELECTOR_ASSERTION_LABEL).to.be.true;
			expect(admLocationStub.called, ADM_LOCATION_SELECTOR_ASSERTION_LABEL).to.be.true;
			expect(fileNameInputStub.called, FILE_NAME_INPUT_ASSERTION_LABEL).to.be.true;
			expect(await fileExists(testADMFile), FILE_CREATED_ASSERTION_LABEL(testADMFile)).to.be.true;
		} catch (err) {
			fail(err);
		}
	});
	
	it('Test execution of command and creation of file on different directory', async function() {

		const tempFolder = "admTmp";
		const tempFolderUri = path.join(workspaceFolder.uri.path, tempFolder);
		fs.mkdirSync(tempFolderUri);

		workspaceSelectorStub.returns(workspaceFolder);
		admLocationStub.returns("Select a folder inside Workspace");
		dirPickerWindow.returns([vscode.Uri.file(tempFolderUri)] as vscode.Uri[]);
		fileNameInputStub.returns(testADMFileName);

		try {
			await vscode.commands.executeCommand('atlasmap.file.create');
			testADMFile = vscode.Uri.file(`${tempFolderUri}/${testADMFileName}`);
			expect(workspaceSelectorStub.called, WORKSPACE_SELECTOR_ASSERTION_LABEL).to.be.true;
			expect(admLocationStub.called, ADM_LOCATION_SELECTOR_ASSERTION_LABEL).to.be.true;
			expect(dirPickerWindow.called, SELECT_FOLDER_WINDOW_ASSERTION_LABEL).to.be.true;
			expect(fileNameInputStub.called, FILE_NAME_INPUT_ASSERTION_LABEL).to.be.true;
			expect(await fileExists(testADMFile),
				FILE_CREATED_ASSERTION_LABEL(testADMFile)).to.be.true;
		} catch (err) {
			fail(err);
		} finally {
			fs.rmSync(tempFolderUri, {force:true, recursive: true});
		}
	});

	it('Test user cancelling picking up workspace', async function() {

		workspaceSelectorStub.returns("");

		try {
			await vscode.commands.executeCommand('atlasmap.file.create');
			expect(workspaceSelectorStub.called, WORKSPACE_SELECTOR_ASSERTION_LABEL).to.be.true;
			expect(infoMessageStub.called, INFO_MESSAGE_ASSERTION_LABEL).to.be.true;
		} catch (err) {
			fail(err);
		}
	});

	it('Test user cancelling picking up directory', async function() {

		workspaceSelectorStub.returns(workspaceFolder);
		admLocationStub.returns("Select a folder inside Workspace");
		dirPickerWindow.resolves(null);

		try {
			await vscode.commands.executeCommand('atlasmap.file.create');
			expect(workspaceSelectorStub.called, WORKSPACE_SELECTOR_ASSERTION_LABEL).to.be.true;
			expect(admLocationStub.called, ADM_LOCATION_SELECTOR_ASSERTION_LABEL).to.be.true;
			expect(dirPickerWindow.called, SELECT_FOLDER_WINDOW_ASSERTION_LABEL).to.be.true;
			expect(infoMessageStub.called, INFO_MESSAGE_ASSERTION_LABEL).to.be.true;
		} catch (err) {
			fail(err);
		}
	});

	it('Test user choosing directory outside workspace', async function() {

		const uriOutsideWorkspace = path.join(workspaceFolder.uri.path, "..");

		workspaceSelectorStub.returns(workspaceFolder);
		admLocationStub.returns("Select a folder inside Workspace");
		dirPickerWindow
		.onFirstCall().resolves(
			[vscode.Uri.file(uriOutsideWorkspace)] as vscode.Uri[])
		.onSecondCall().resolves(null);

		try {
			await vscode.commands.executeCommand('atlasmap.file.create');
			expect(workspaceSelectorStub.called, WORKSPACE_SELECTOR_ASSERTION_LABEL).to.be.true;
			expect(admLocationStub.called, ADM_LOCATION_SELECTOR_ASSERTION_LABEL).to.be.true;
			expect(dirPickerWindow.calledTwice,
				`Window directory picker was not called or wasn't shown again`).to.be.true;
			expect(errorMessageStub.called, ERROR_MESSAGE_ASSERTION_LABEL).to.be.true;
		} catch (err) {
			fail(err);
		}
	});

	it('Test user cancelling picking up a file name', async function() {

		workspaceSelectorStub.returns(workspaceFolder);
		admLocationStub.returns("");
		fileNameInputStub.returns("");

		try {
			await vscode.commands.executeCommand('atlasmap.file.create');
			testADMFile = vscode.Uri.file(`${workspaceFolderUri.path}/${testADMFileName}`);
			expect(workspaceSelectorStub.called, WORKSPACE_SELECTOR_ASSERTION_LABEL).to.be.true;
			expect(admLocationStub.called, ADM_LOCATION_SELECTOR_ASSERTION_LABEL).to.be.true;
			expect(fileNameInputStub.called, FILE_NAME_INPUT_ASSERTION_LABEL).to.be.true;
			expect(infoMessageStub.called, INFO_MESSAGE_ASSERTION_LABEL).to.be.true;
		} catch (err) {
			fail(err);
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
