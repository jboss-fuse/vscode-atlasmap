"use strict";

import * as atlasMapWebView from './AtlasMapPanel';
import * as AtlasMapWebViewUtil from './AtlasMapWebViewUtil';
import * as child_process from 'child_process';
import { OpenAdmCodeLensProvider } from './codelenses/OpenAdmCodeLensProvider'; 
import * as path from 'path';
import * as requirements from './requirements';
import { TextDecoder } from 'util';
import * as utils from './utils';
import * as vscode from 'vscode';
import { getRedHatService, TelemetryEvent, TelemetryService } from "@redhat-developer/vscode-redhat-telemetry";
import { AtlasMapEditorProvider } from './editor/AtlasMapEditorProvider';
import { AtlasMapDocument } from './editor/AtlasMapDocument';

const chokidar = require('chokidar');
const fs = require('fs');
const md5 = require('md5');

let atlasMapExtensionOutputChannel: vscode.OutputChannel;
let atlasMapServerOutputChannel: vscode.OutputChannel;
/*Export for test purpose*/
export let genericAtlasMapProcess: child_process.ChildProcess;
/*Export for test purpose*/
export let atlasMapGenericLaunchPort: string;
export let atlasMapUIReady: boolean;
let storagePath: string;
export let telemetryService: TelemetryService = null;

const WAIT_STEP: number = 1000;
const MAX_WAIT: number = 30000;
export const WARN_MSG: string = "There is currently a local AtlasMap instance running. We need to restart that instance. Make sure you have saved all your changes in the AtlasMap UI to prevent data loss.";
export const RESTART_CHOICE: string = "Restart";

const COMMAND_ID_START_ATLASMAP = 'atlasmap.start';
const COMMAND_ID_STOP_ATLASMAP = 'atlasmap.stop';

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
	
	let atlasmapExecutablePath = context.asAbsolutePath(path.join('jars','atlasmap-standalone.jar'));

	context.subscriptions.push(vscode.commands.registerCommand(COMMAND_ID_START_ATLASMAP, () => {
		sendCommandEvent(COMMAND_ID_START_ATLASMAP);
		if (isAtlasMapRunning()) {
			// no need to start another atlasmap instance - just open it again
			vscode.window.showInformationMessage("Running AtlasMap instance found at port " + atlasMapGenericLaunchPort);
			openURL(AtlasMapWebViewUtil.getAtlasMapLocalUrl(atlasMapGenericLaunchPort), context);
			return;
		}

		ensureNoOtherAtlasMapInstanceRunning()
			.then((doLaunch) => {
				if (doLaunch) {
					launchAtlasMapLocally(context, atlasmapExecutablePath)
						.then(() => {
							vscode.window.showInformationMessage('Starting AtlasMap instance');
						})
						.catch((err) => {
							vscode.window.showErrorMessage("Unable to start AtlasMap instance");
							log(err);
						});
				}
			});
	}));

	context.subscriptions.push(vscode.commands.registerCommand(COMMAND_ID_STOP_ATLASMAP, () => {
		sendCommandEvent(COMMAND_ID_STOP_ATLASMAP);
		if (!isAtlasMapRunning()) {
			vscode.window.showWarningMessage("Unable to locate running AtlasMap instance");
		} else {
			handleStopAtlasMap();
		}
	}));
	const docSelectorForPhysicalFiles: vscode.DocumentSelector = {
		scheme: 'file'
	};

	context.subscriptions.push(AtlasMapEditorProvider.register(context));
	
	vscode.languages.registerCodeLensProvider(docSelectorForPhysicalFiles, new OpenAdmCodeLensProvider());
}

function sendCommandEvent(commandId: string) {
	const telemetryEvent: TelemetryEvent = {
		type: 'track',
		name: 'command',
		properties: {
			identifier: commandId
		}
	};
	telemetryService.send(telemetryEvent);
}

export function deactivate(context: vscode.ExtensionContext) {
	if (isAtlasMapRunning()) {
		stopLocalAtlasMapInstance();
	}
	if (telemetryService) {
		telemetryService.sendShutdownEvent();
	}
}

function isAtlasMapRunning(): boolean {
	return genericAtlasMapProcess !== undefined && atlasMapGenericLaunchPort !== undefined;
}

function ensureNoOtherAtlasMapInstanceRunning(): Promise<boolean> {
	return new Promise( async (resolve, reject) => {
		if (isAtlasMapRunning()) {
			let choice = await warnUserOfRiskOfRestarting();
			if (RESTART_CHOICE === choice) {
				handleStopAtlasMap();

				let waitTimer:number = 0;
				while (atlasMapGenericLaunchPort !== undefined && waitTimer < MAX_WAIT) {
					await new Promise(res => setTimeout(res, WAIT_STEP));
					waitTimer += WAIT_STEP;
				}
			
				if (atlasMapGenericLaunchPort !== undefined) {
					// seems we are unable to stop the running instance
					// now free the port variable and let atlasmap take another port
					atlasMapGenericLaunchPort = undefined;
					genericAtlasMapProcess = undefined;
				}
			} else {
				resolve(false);
			}
		}
		resolve(true);
	});
}

/**
 * It opens a dialog warning user of potential data loss.
 * To workaround https://github.com/microsoft/vscode/issues/133073 ,
 * avoid using of native dialog by changing preference value the time of warning message dialog display.
*/
async function warnUserOfRiskOfRestarting() {
	const windowConfiguration = vscode.workspace.getConfiguration('window');
	const CONFIGURATION_KEY_DIALOG_STYLE = 'dialogStyle';
	const initialDialogStyle = windowConfiguration.get(CONFIGURATION_KEY_DIALOG_STYLE);
	let choice;
	try {
		await windowConfiguration.update(CONFIGURATION_KEY_DIALOG_STYLE, 'custom', vscode.ConfigurationTarget.Global);
		choice = await vscode.window.showWarningMessage(WARN_MSG, { modal: true }, RESTART_CHOICE);
	} finally {
		await windowConfiguration.update(CONFIGURATION_KEY_DIALOG_STYLE, initialDialogStyle, vscode.ConfigurationTarget.Global);
	}
	return choice;
}

function handleStopAtlasMap() {
	stopLocalAtlasMapInstance()
		.then( (stopped) => {
			if (stopped) {
				vscode.window.showInformationMessage("Stopped AtlasMap instance at port " + atlasMapGenericLaunchPort);
				atlasMapGenericLaunchPort = undefined;
				genericAtlasMapProcess = undefined;
			} else {
				vscode.window.showWarningMessage("Unable to stop the running AtlasMap instance");
			}
		})
		.catch( (err) => {
			vscode.window.showWarningMessage("Unable to stop the running AtlasMap instance");
			log(err);
		});
}

export function launchAtlasMapLocally(
	context: vscode.ExtensionContext,
	atlasmapExecutablePath: string,
	admPath: string = "",
	webviewPanel: vscode.WebviewPanel = undefined,
	eventEmitter: vscode.EventEmitter<vscode.CustomDocumentContentChangeEvent<AtlasMapDocument>> = undefined,
	atlasMapDocument: AtlasMapDocument = undefined): Promise<void>{
	let filename;
	let idFolder;
	if(admPath !== '') {
		const admWorkspaceRelative = vscode.workspace.asRelativePath(admPath);
		idFolder = admWorkspaceRelative.replace(/\//g, '_');
		filename = admPath.substring(admPath.lastIndexOf('/') + 1).replace('.adm', '');
	}
	return new Promise( (resolve, reject) => {
		showProgressInfo(filename);
		process.env.SERVER_PORT = '0';
		let serverOutputChannel;
		if(atlasMapDocument === undefined) {
			atlasMapServerOutputChannel = vscode.window.createOutputChannel('AtlasMap Server for generic AtlasMap');
			serverOutputChannel = atlasMapServerOutputChannel;
		} else {
			serverOutputChannel = vscode.window.createOutputChannel(`AtlasMap Server for ${filename}`);
		}
	
		requirements.resolveRequirements()
			.then(reqs => {
				const atlasMapWSFolder = path.resolve(storagePath, utils.ATLASMAP_WS_FOLDER_FALLBACK + '/' + idFolder);
				const process = launchAtlasMap(reqs, atlasMapWSFolder, admPath, atlasmapExecutablePath);
				if(atlasMapDocument === undefined) {
					genericAtlasMapProcess = process;
				} else {
					atlasMapDocument.setAtlasMapProcess(process);
					atlasMapDocument.setWorkspaceFolder(atlasMapWSFolder);
				}
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
					console.log(text);
					const STARTED_AT_PORT_LOG = 'started at port: ';
					if (text.includes('### AtlasMap Data Mapper UI') && text.includes(STARTED_AT_PORT_LOG)) {
						const withoutPrefix = text.substring(text.indexOf(STARTED_AT_PORT_LOG) + STARTED_AT_PORT_LOG.length);
						const realPort = withoutPrefix.replace(' ###\n', '');
						console.log('real port' + realPort);
						if (atlasMapDocument === undefined) {
							atlasMapGenericLaunchPort = realPort;
						} else {
							atlasMapDocument.setAssociatedPort(realPort);
						}
						if (webviewPanel) {
							AtlasMapWebViewUtil.getAtlasMapExternalURI(realPort)
								.then(externalUrl => {
									AtlasMapWebViewUtil.loadWebContent(webviewPanel.webview, externalUrl);
								});
						} else {
							openURL(AtlasMapWebViewUtil.getAtlasMapLocalUrl(realPort), context);
						}
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
	const folderToWatch = path.resolve(storagePath, utils.ATLASMAP_WS_FOLDER_FALLBACK + '/' + idFolder);
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
	
	if (admPath !== "") {
		return child_process.spawn(javaExecutablePath,
			['-Datlasmap.workspace=' + atlasMapWSFolder,
			 '-Datlasmap.adm.path=' + admPath,
			 '-Datlasmap.disable.frame.options=true',
			 '-jar', atlasmapExecutablePath]);
	} else {
		return child_process.spawn(javaExecutablePath,
			['-Datlasmap.workspace=' + atlasMapWSFolder,
			 '-Datlasmap.disable.frame.options=true',
			 '-jar', atlasmapExecutablePath]);
	}
}

function stopLocalAtlasMapInstance(): Promise<boolean> {
	return new Promise( (resolve, reject) => {
		if (genericAtlasMapProcess) {
			try {
				genericAtlasMapProcess.kill();
			} catch (error) {
				reject(error);
			}
			atlasMapWebView.default.close();
		}
		atlasMapUIReady = genericAtlasMapProcess ? !genericAtlasMapProcess.killed : false;
		resolve(genericAtlasMapProcess ? genericAtlasMapProcess.killed : true);
	});	
}

function openURL(localUrl: string, context: vscode.ExtensionContext) {
	if (utils.isUsingInternalView()) {
		atlasMapWebView.default.createOrShow(localUrl, context);	
	} else {
		vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(localUrl));
	}
}

async function showProgressInfo(filename: string | undefined) {
	let messageSuffix;
	if (filename) {
		messageSuffix = filename;
	} else {
		messageSuffix = 'dangling document';
	}
	vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: "Waiting for " + (utils.isUsingInternalView() ? "internal" : "default system") + " browser to open AtlasMap UI for " + messageSuffix,
			cancellable: false
		}, async (progress, token) => {
			progress.report( {increment: -1} );
			let waitTime: number = 0;
			const timerStep: number = 1000;
			while (!atlasMapUIReady && waitTime < 30000) { // max 30 secs wait
				// wait for web ui to become ready
				await new Promise(resolve => setTimeout(resolve, timerStep));
				waitTime += timerStep;
			}
			progress.report( {increment: 100} );
			if (!atlasMapUIReady) {
				vscode.window.showErrorMessage("Failed to resolve the AtlasMap web UI.");
			}
		});
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
