"use strict";

import { TelemetryEvent } from '@redhat-developer/vscode-redhat-telemetry/lib';
import path = require('path');
import validFilename = require('valid-filename');
import * as vscode from 'vscode';
import { telemetryService } from '../../extension';

export async function createAndOpenADM() {
	const selectedWorkspaceFolder: vscode.WorkspaceFolder | undefined
		= await promptUserForWorkspace();
	
	if (selectedWorkspaceFolder) {
		let admFolderPath : string = selectedWorkspaceFolder.uri.fsPath;

		const admFileAtDifferentPlaceThanRoot : boolean 
			= await promptUserIfHeWantsAdmFileAtCustomLocationInWorkspace();

		if (admFileAtDifferentPlaceThanRoot === undefined) {
			return;
		} else if (admFileAtDifferentPlaceThanRoot) {
			const admFolderUri : vscode.Uri | undefined 
				= await promptUserForAdmFileLocationInWorkspace(selectedWorkspaceFolder);

			if (!admFolderUri) {
				return;
			}

			admFolderPath = admFolderUri.fsPath;
		}

		const fileName: string | undefined 
			= await promptForAdmFileName(selectedWorkspaceFolder);

		if (fileName) {
			await createAdmFile(admFolderPath, fileName);
		}
	}
}

async function promptUserForWorkspace() : Promise<vscode.WorkspaceFolder | undefined> {
	return vscode.window.showWorkspaceFolderPick(
		{placeHolder: 'Please select the workspace folder in which the new file will be created.'});
}

async function promptUserIfHeWantsAdmFileAtCustomLocationInWorkspace() : Promise<boolean | undefined> {
	const userSelection = await vscode.window.showQuickPick(
		["Workspace root", "Select a folder inside Workspace"], {placeHolder: "Select the location of the .adm file"}
	);

	if (!userSelection) {
		return undefined;
	}

	return userSelection === "Select a folder inside Workspace";
}

async function promptUserForAdmFileLocationInWorkspace(workspaceRoot: vscode.WorkspaceFolder) 
	: Promise<vscode.Uri | undefined> {

	let admFolderUri = await promptUserForDirectoryForAdmFile(workspaceRoot);

	if (!admFolderUri) {
		return undefined;
	}

	while(!folderIsInside(workspaceRoot.uri.fsPath, admFolderUri.fsPath)) {
		showFolderOutsideWorkspaceErrorMessage();

		admFolderUri = await promptUserForDirectoryForAdmFile(workspaceRoot);

		if (!admFolderUri) {
			return undefined;
		}
	}

	return admFolderUri;
}

async function promptForAdmFileName(workspaceFolder : vscode.WorkspaceFolder)
	: Promise<string | undefined> {
	return vscode.window.showInputBox(
		{placeHolder: "Enter the name of the new AtlasMap file",
		validateInput: async (name: string) => {
			return validateFileName(workspaceFolder, name);
	}});
}

async function createAdmFile(admFolderPath : string, fileName : string) {
	const file = `${admFolderPath}/${getValidFileNameWithExtension(fileName)}`;
	await vscode.workspace.fs.writeFile(vscode.Uri.file(file), Buffer.from(''));
	await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(file));
	sendCreateEvent();
}

function showFolderOutsideWorkspaceErrorMessage() {
	vscode.window.showErrorMessage(
		"The chosen folder was outside of the workspace. You need to select a folder inside the workspace to create the AtlasMap Data transformation file.");
}

async function promptUserForDirectoryForAdmFile(workspaceRoot: vscode.WorkspaceFolder)
	: Promise<vscode.Uri | undefined> {

	const options: vscode.OpenDialogOptions = {
		defaultUri: workspaceRoot.uri,
		canSelectMany: false,
		openLabel: 'Select',
		canSelectFiles: false,
		canSelectFolders: true,
		title: "Select the location of the .adm file in the Workspace."
	};

	let admFolderUriArray = await vscode.window.showOpenDialog(options);
	
	if (!admFolderUriArray) {
		return undefined;
	}

	return admFolderUriArray[0];
}

function folderIsInside(parentFolder: string, subFolder: string) : boolean {
	const rel = path.relative(parentFolder, subFolder);
	return !rel.startsWith('../') && rel !== '..';
}

export async function validateFileName(selectedWorkspaceFolder: vscode.WorkspaceFolder, fileName): Promise<string> {
	const file: string = `${selectedWorkspaceFolder.uri.fsPath}/${getValidFileNameWithExtension(fileName)}`;
		if (!validFilename(fileName)) {
			return 'The filename is invalid.';
		}
		if (await fileExists(vscode.Uri.file(file))) {
			return `A file with that name already exists.`;
		}
		return undefined;
}

function getValidFileNameWithExtension(name: string): string {
	if (name && !name.toLowerCase().endsWith('.adm')) {
		return `${name}.adm`;
	}
	return name;
}

export async function fileExists(file: vscode.Uri): Promise<boolean> {
	try {
		await vscode.workspace.fs.stat(file);
	} catch {
		return false;
	}
	return true;
}

function sendCreateEvent() {
	const telemetryEvent: TelemetryEvent = {
		type: 'track',
		name: 'atlasmap.file.create'
	};
	telemetryService.send(telemetryEvent);
}
