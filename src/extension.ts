"use strict";

import * as AtlasMapWebViewUtil from './editor/AtlasMapWebViewUtil';
import * as child_process from 'child_process';
import { OpenAdmCodeLensProvider } from './codelenses/OpenAdmCodeLensProvider'; 
import * as path from 'path';
import * as requirements from './requirements';
import { TextDecoder } from 'util';
import * as vscode from 'vscode';
import { getRedHatService, TelemetryEvent, TelemetryService } from "@redhat-developer/vscode-redhat-telemetry";
import { AtlasMapEditorProvider } from './editor/AtlasMapEditorProvider';
import { AtlasMapDocument } from './editor/AtlasMapDocument';

const validFilename = require('valid-filename');
const chokidar = require('chokidar');
const fs = require('fs');
const md5 = require('md5');

let atlasMapExtensionOutputChannel: vscode.OutputChannel;
let storagePath: string;
export let telemetryService: TelemetryService = null;

const WAIT_STEP: number = 1000;
const MAX_WAIT: number = 30000;
const ATLASMAP_WS_FOLDER_FALLBACK = '.atlasmap';

export async function activate(context: vscode.ExtensionContext) {
	const redhatService = await getRedHatService(context);  
	telemetryService = await redhatService.getTelemetryService();
	telemetryService.sendStartupEvent();
	//Use globalStoragePath instead of storagePath when workspace is not opened
	if (context.storagePath == undefined){
		storagePath = context.globalStoragePath;
	} else {
		storagePath = context.storagePath;
	}
	
	context.subscriptions.push(AtlasMapEditorProvider.register(context));
	
	const docSelectorForPhysicalFiles: vscode.DocumentSelector = {
		scheme: 'file'
	};
	vscode.languages.registerCodeLensProvider(docSelectorForPhysicalFiles, new OpenAdmCodeLensProvider());

	vscode.commands.registerCommand('atlasmap.file.create', () => createAndOpenADM());
}

function sendOpenEvent() {
	const telemetryEvent: TelemetryEvent = {
		type: 'track',
		name: 'atlasmap.open'
	};
	telemetryService.send(telemetryEvent);
}

function sendCreateEvent() {
	const telemetryEvent: TelemetryEvent = {
		type: 'track',
		name: 'atlasmap.file.create'
	};
	telemetryService.send(telemetryEvent);
}

export function deactivate(context: vscode.ExtensionContext) {
	if (telemetryService) {
		telemetryService.sendShutdownEvent();
	}
}

async function createAndOpenADM() {
	const selectedWorkspaceFolder: vscode.WorkspaceFolder | undefined
		= await promptUserForWorkspace();
	
	if (!selectedWorkspaceFolder) {
		return;
	}

	let admFolderPath : string = selectedWorkspaceFolder.uri.fsPath;

	const admFileAtWorkspaceRoot : boolean 
		= await promptIfUserWantsAdmFileAtWorkspaceRoot();

	if (admFileAtWorkspaceRoot === undefined) {
		return;
	}

	if (!admFileAtWorkspaceRoot) {
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

async function promptUserForWorkspace() : Promise<vscode.WorkspaceFolder | undefined> {
	return vscode.window.showWorkspaceFolderPick(
		{placeHolder: 'Please select the workspace folder in which the new file will be created.'});
}

async function promptIfUserWantsAdmFileAtWorkspaceRoot() : Promise<boolean | undefined> {
	const userSelection = await vscode.window.showQuickPick(
		["Workspace root", "Select a folder inside Workspace"], {placeHolder: "Select the location of the .adm file"}
	);

	if (!userSelection) {
		return undefined;
	}

	return userSelection === "Workspace root";
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

function showUserAbortingInfoMessage() {
	vscode.window.showInformationMessage("Cancelled by the user");
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

export function launchAtlasMapLocally(
	atlasmapExecutablePath: string,
	webviewPanel: vscode.WebviewPanel,
	eventEmitter: vscode.EventEmitter<vscode.CustomDocumentContentChangeEvent<AtlasMapDocument>>,
	atlasMapDocument: AtlasMapDocument): Promise<void>{
	const admPath = atlasMapDocument.uri.fsPath;
	const admWorkspaceRelative = vscode.workspace.asRelativePath(admPath);
	const idFolder = admWorkspaceRelative.replace(/\//g, '_');
	const filename = admPath.substring(admPath.lastIndexOf('/') + 1).replace('.adm', '');
	return new Promise( (resolve, reject) => {
		let atlasMapUIReady = false;
		vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: "Waiting for editor to open AtlasMap UI for " + filename,
				cancellable: false
			}, async (progress, token) => {
				progress.report( {increment: -1} );
				let waitTime: number = 0;
				while (!atlasMapUIReady && waitTime < MAX_WAIT) {
					// wait for web ui to become ready
					await new Promise(waiterResolve => setTimeout(waiterResolve, WAIT_STEP));
					waitTime += WAIT_STEP;
				}
				progress.report( {increment: 100} );
				if (!atlasMapUIReady) {
					vscode.window.showErrorMessage("Failed to resolve the AtlasMap web UI.");
				}
			});
		process.env.SERVER_PORT = '0';
		const serverOutputChannel = vscode.window.createOutputChannel(`AtlasMap Server for ${filename}`);
	
		requirements.resolveRequirements()
			.then(reqs => {
				const atlasMapWSFolder = path.resolve(storagePath, ATLASMAP_WS_FOLDER_FALLBACK + '/' + idFolder);
				const process = launchAtlasMap(reqs, atlasMapWSFolder, admPath, atlasmapExecutablePath);
				atlasMapDocument.setAtlasMapProcess(process);
				atlasMapDocument.setWorkspaceFolder(atlasMapWSFolder);
				process.on("close", (code, signal) => {
					if (serverOutputChannel) {
						try {
							serverOutputChannel.dispose();
						} catch (error) {
							reject(error);
						}
					}
				});
				process.stdout.on('data', function (data) {
					const dec = new TextDecoder("utf-8");
					const text = dec.decode(data);
					serverOutputChannel.append(text);
					const STARTED_AT_PORT_LOG = 'started at port: ';
					if (text.includes('### AtlasMap Data Mapper UI') && text.includes(STARTED_AT_PORT_LOG)) {
						const withoutPrefix = text.substring(text.indexOf(STARTED_AT_PORT_LOG) + STARTED_AT_PORT_LOG.length);
						const realPort = withoutPrefix.substring(0, withoutPrefix.indexOf(' ###'));
						atlasMapDocument.setAssociatedPort(realPort);
						AtlasMapWebViewUtil.getAtlasMapExternalURI(realPort)
							.then(externalUrl => {
								AtlasMapWebViewUtil.loadWebContent(webviewPanel.webview, externalUrl);
								sendOpenEvent();
							});
						atlasMapUIReady = true;
					}
					if (webviewPanel && text.includes('Completed initialization')) {			
						listenForChange(idFolder, eventEmitter, atlasMapDocument, webviewPanel);
					}
				});
				resolve();
			})
			.catch(error => {
				vscode.window.showErrorMessage(error.message, error.label).then((selection) => {
					if (error.label && error.label === selection && error.openUrl) {
						vscode.commands.executeCommand('vscode.open', error.openUrl);
					}
				});
				reject(error);
			});
	});
}

function listenForChange(idFolder: any, eventEmitter: vscode.EventEmitter<vscode.CustomDocumentContentChangeEvent<AtlasMapDocument>>, atlasMapDocument: AtlasMapDocument, webviewPanel: vscode.WebviewPanel) {
	const folderToWatch = path.resolve(storagePath, ATLASMAP_WS_FOLDER_FALLBACK + '/' + idFolder);
	const watcher = chokidar.watch(folderToWatch, { awaitWriteFinish: true, });
	const md5OfWatchedFiles = new Map();
	watcher.on('add', (pathOfAddedFile) => {
		md5OfWatchedFiles.set(pathOfAddedFile, md5(fs.readFileSync(pathOfAddedFile)));
	}).on('change', (pathOfChangedFile) => {
		const previousmd5 = md5OfWatchedFiles.get(pathOfChangedFile);
		if (previousmd5 !== undefined) {
			const newmd5 = md5(fs.readFileSync(pathOfChangedFile));
			if (previousmd5 !== newmd5) {
				eventEmitter.fire({ document: atlasMapDocument });
				md5OfWatchedFiles.set(pathOfChangedFile, newmd5);
			}
		} else {
			md5OfWatchedFiles.set(pathOfChangedFile, md5(fs.readFileSync(pathOfChangedFile)));
		}
	}).on('unlink', (pathOfUnlinkedFile) => {
		md5OfWatchedFiles.delete(pathOfUnlinkedFile);
		eventEmitter.fire({ document: atlasMapDocument });
	});
	webviewPanel.onDidDispose(() => {
		watcher.close();
		md5OfWatchedFiles.clear();
	});
}

function launchAtlasMap(reqs: requirements.RequirementsData, atlasMapWSFolder: string, admPath: string, atlasmapExecutablePath: string) {
	let javaExecutablePath = path.resolve(reqs.java_home + '/bin/java');
	return child_process.spawn(javaExecutablePath,
		[
			'-Datlasmap.workspace=' + atlasMapWSFolder,
			'-Datlasmap.adm.path=' + admPath,
			'-Datlasmap.disable.frame.options=true',
			'-jar', atlasmapExecutablePath]);
}

export function log(text) {
	if (!atlasMapExtensionOutputChannel) {
		atlasMapExtensionOutputChannel = vscode.window.createOutputChannel("AtlasMap Extension");
	}
	atlasMapExtensionOutputChannel.append(text.toString());
}

/* Used for testing purpose only*/
export function disposeExtensionOutputChannel() {
	if (atlasMapExtensionOutputChannel) {
		atlasMapExtensionOutputChannel.dispose();
		atlasMapExtensionOutputChannel = undefined;
	}
}
