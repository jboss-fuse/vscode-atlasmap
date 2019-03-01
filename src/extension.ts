"use strict";

import * as atlasMapWebView from './atlasMapWebView';
import * as child_process from 'child_process';
import * as path from 'path';
import * as requirements from './requirements';
import { TextDecoder } from 'util';
import * as utils from './utils';
import * as vscode from 'vscode';

let atlasMapServerOutputChannel: vscode.OutputChannel;
let atlasMapProcess: child_process.ChildProcess;
let atlasMapLaunchPort: string;
let atlasMapUIReady: boolean;
let admFilePath: string;

const WAIT_STEP: number = 1000;
const MAX_WAIT: number = 30000;

export function activate(context: vscode.ExtensionContext) {

	let atlasmapExecutablePath = context.asAbsolutePath(path.join('jars','atlasmap-standalone.jar'));

	context.subscriptions.push(vscode.commands.registerCommand('atlasmap.start', (ctx) => {

		// in case user has not specified a ADM file and just uses the 
		// main palette action for opening AtlasMap, we will not open
		// another AtlasMap instance if there is already one running.
		if (isAtlasMapRunning() && admFilePath === undefined && (ctx === undefined || ctx.fsPath === undefined)) {
			// no need to start another atlasmap instance - just open it again
			vscode.window.showInformationMessage("Running AtlasMap instance found at port " + atlasMapLaunchPort);
			openURL(generateUrl(atlasMapLaunchPort));
			return;
		}

		let localAdmFile: string;
		if (ctx && ctx.fsPath) {
			localAdmFile = ctx.fsPath;
		} else {
			localAdmFile = undefined;
		}

		
		ensureNoOtherAtlasMapInstanceRunning()
			.then( (doLaunch) => {
				if (doLaunch) {
					utils.retrieveFreeLocalPort()
					.then( (port) => {
						launchAtlasMapLocally(atlasmapExecutablePath, port, localAdmFile)
							.then( () => {
								vscode.window.showInformationMessage("Starting AtlasMap instance at port " + port);
								atlasMapLaunchPort = port;
								admFilePath = localAdmFile;
							})					
							.catch( (err) => {
								vscode.window.showErrorMessage("Unable to start AtlasMap instance");
								console.error(err);
							});
					})
					.catch( (err) => {
						vscode.window.showErrorMessage("Unable to start AtlasMap instance");
						console.error(err);
					});
				}				
			});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('atlasmap.stop', () => {
		if (!isAtlasMapRunning()) {
			vscode.window.showWarningMessage("Unable to locate running AtlasMap instance");
		} else {
			handleStopAtlasMap();
		}
	}));
}

function isAtlasMapRunning(): boolean {
	return atlasMapProcess !== undefined && atlasMapLaunchPort !== undefined;
}

function ensureNoOtherAtlasMapInstanceRunning(): Promise<boolean> {
	return new Promise( async (resolve, reject) => {
		if (isAtlasMapRunning()) {
			// we need to stop a running atlasmap to make the next import work
			let choice = await vscode.window.showWarningMessage("There is currently a local AtlasMap instance running. We need to restart that instance. Make sure you have saved all your changes in the AtlasMap UI to prevent data loss.", { modal: true }, "Restart");
			if ("Restart" === choice) {
				handleStopAtlasMap();

				let waitTimer:number = 0;
				while (atlasMapLaunchPort !== undefined && waitTimer < MAX_WAIT) {
					await new Promise(resolve => setTimeout(resolve, WAIT_STEP));
					waitTimer += WAIT_STEP;
				}
			
				if (atlasMapLaunchPort !== undefined) {
					// seems we are unable to stop the running instance
					// now free the port variable and let atlasmap take another port
					atlasMapLaunchPort = undefined;
					atlasMapProcess = undefined;
				}
			} else {
				resolve(false);
			}
		}
		resolve(true);
	});
}

function handleStopAtlasMap() {
	stopLocalAtlasMapInstance()
		.then( (stopped) => {
			if (stopped) {
				vscode.window.showInformationMessage("Stopped AtlasMap instance at port " + atlasMapLaunchPort);
				atlasMapLaunchPort = undefined;
				atlasMapProcess = undefined;
				admFilePath = undefined;
			} else {
				vscode.window.showWarningMessage("Unable to stop the running AtlasMap instance");
			}
		})
		.catch( (err) => {
			vscode.window.showWarningMessage("Unable to stop the running AtlasMap instance");
			console.error(err);
		});
}

function launchAtlasMapLocally(atlasmapExecutablePath: string, port: string, admFilePath: string = ""): Promise<any> {
	return new Promise( (resolve, reject) => {
		showProgressInfo(port);
		process.env.SERVER_PORT = port;
		atlasMapServerOutputChannel = vscode.window.createOutputChannel("AtlasMap Server");
	
		requirements.resolveRequirements()
			.then(requirements => {
				let javaExecutablePath = path.resolve(requirements.java_home + '/bin/java');

				if (admFilePath !== "") {
					atlasMapProcess = child_process.spawn(javaExecutablePath, ['-Datlasmap.adm.path=' + admFilePath, '-jar', atlasmapExecutablePath]);
				} else {
					atlasMapProcess = child_process.spawn(javaExecutablePath, ['-jar', atlasmapExecutablePath]);
				}
				atlasMapProcess.on("close", (code, signal) => {
					if (atlasMapServerOutputChannel) {
						try {
							atlasMapServerOutputChannel.dispose();
						} catch (error) {
							reject(error);
						}
					}
				});
				atlasMapProcess.stdout.on('data', function (data) {
					let dec = new TextDecoder("utf-8");
					let text = dec.decode(data);
					atlasMapServerOutputChannel.append(text);
					if (text.indexOf("### AtlasMap Data Mapper UI started") > 0) {
						const url = generateUrl(port);
						openURL(url);
						atlasMapUIReady = true;
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

function generateUrl(port: string): string {
	return "http://localhost:" + port;
}

function stopLocalAtlasMapInstance(): Promise<boolean> {
	return new Promise( (resolve, reject) => {
		if (atlasMapProcess) {
			try {
				atlasMapProcess.kill();
			} catch (error) {
				reject(error);
			}
			atlasMapWebView.default.close();
		}
		atlasMapUIReady = atlasMapProcess ? !atlasMapProcess.killed : false;
		resolve(atlasMapProcess ? atlasMapProcess.killed : true);
	});	
}

function openURL(url: string) {
	if (utils.isUsingInternalView()) {
		atlasMapWebView.default.createOrShow(url);		
	} else {
		vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url));
	}	
}

function showProgressInfo(port: string) {
	const url = "http://localhost:" + port;
	vscode.window.setStatusBarMessage(url, 5000);
	vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: "Waiting for " + (utils.isUsingInternalView() ? "internal" : "default system") + " browser to open AtlasMap UI at " + url,
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