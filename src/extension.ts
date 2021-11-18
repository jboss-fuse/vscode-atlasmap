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
	sendCreateEvent();
	const selectedWorkspaceFolder: vscode.WorkspaceFolder | undefined = await vscode.window.showWorkspaceFolderPick( {placeHolder: 'Please select the workspace folder in which the new file will be created.'} );
	if (selectedWorkspaceFolder) {
		const fileName: string = await vscode.window.showInputBox( {placeHolder: "Enter the name of the new AtlasMap file"});
		var file: string = `${selectedWorkspaceFolder.uri.fsPath}/${fileName}`;
		if (!file.toLowerCase().endsWith('.adm')) {
			file += '.adm';
		}
		try {
			const stat: vscode.FileStat = await vscode.workspace.fs.stat(vscode.Uri.file(file));
			if (stat && stat.type === vscode.FileType.File) {
				vscode.window.showErrorMessage(`The file ${file} already exists!`);
				Promise.reject(new Error(`The file ${file} already exists!`));
				return;
			}	
		} catch (error) {
			// file doesn't exist - that's good
		}		
		await vscode.workspace.fs.writeFile(vscode.Uri.file(file), Buffer.from(''));
		await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(file));
	}
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
						const realPort = withoutPrefix.replace(' ###\n', '');
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
		['-Datlasmap.workspace=' + atlasMapWSFolder,
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
