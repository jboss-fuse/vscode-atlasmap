import * as atlasMapWebView from './atlasMapWebView';
import * as child_process from 'child_process';
import * as detect from 'detect-port';
import * as path from 'path';
import * as requirements from './requirements';
import * as vscode from 'vscode';
import { TextDecoder } from 'util';

let atlasmapServerOutputChannel: vscode.OutputChannel;
let atlasmapProcess: child_process.ChildProcess;
let atlasMapLaunchPort: string;

export function activate(context: vscode.ExtensionContext) {

	let atlasmapExecutablePath = context.asAbsolutePath(path.join('jars','atlasmap-standalone.jar'));

	context.subscriptions.push(vscode.commands.registerCommand('atlasmap.start', () => {
		if (atlasMapLaunchPort === undefined) {
			retrieveFreeLocalPort()
				.then( (port) => {
					launchAtlasMapLocally(atlasmapExecutablePath, port, context.extensionPath);
					vscode.window.showInformationMessage("Starting AtlasMap instance at port " + port);
					atlasMapLaunchPort = port;
				})
				.catch( (err) => {
					vscode.window.showErrorMessage("Unable to start AtlasMap instance");
					console.error(err);
				});
			
		} else {
			vscode.window.showInformationMessage("Running AtlasMap instance found at port " + atlasMapLaunchPort);
			const url = "http://localhost:" + atlasMapLaunchPort;
			atlasMapWebView.default.createOrShow(context.extensionPath, url);
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('atlasmap.stop', () => {
		if (atlasmapProcess === undefined) {
			vscode.window.showWarningMessage("Unable to locate running AtlasMap instance");
		} else {
			stopLocalAtlasMapInstance()
			.then( (stopped) => {
				if (stopped) {
					vscode.window.showInformationMessage("Stopped AtlasMap instance at port " + atlasMapLaunchPort);
					atlasMapLaunchPort = undefined;
					atlasmapProcess = undefined;
				} else {
					vscode.window.showWarningMessage("Unable to stop the running AtlasMap instance");
				}
			})
			.catch( (err) => {
				vscode.window.showWarningMessage("Unable to stop the running AtlasMap instance");
				console.error(err);
			});
		}
	}));
}

function stopLocalAtlasMapInstance(): Promise<boolean> {
	return new Promise( (resolve, reject) => {
		if (atlasmapProcess) {
			try {
				atlasmapProcess.kill();
			} catch (error) {
				reject(error);
			}
		}
		if (atlasmapServerOutputChannel) {
			try {
				atlasmapServerOutputChannel.dispose();
			} catch (error) {
				reject(error);
			}
		}
		resolve(atlasmapProcess ? atlasmapProcess.killed : true);
	});	
}

function retrieveFreeLocalPort(): Promise<string> {
	return new Promise((resolve, reject) => {
		const defaultPort = "8585";
		detect(defaultPort)
			.then(_port => {
				resolve(_port);
			})
			.catch(err => {
				reject(err);
			});
	});
}

function launchAtlasMapLocally(atlasmapExecutablePath: string, port: string, extensionPath: string) {
	process.env.SERVER_PORT = port;
	
	atlasmapServerOutputChannel = vscode.window.createOutputChannel("AtlasMap Server");

	requirements.resolveRequirements().catch(error => {
		vscode.window.showErrorMessage(error.message, error.label).then((selection) => {
			if (error.label && error.label === selection && error.openUrl) {
				vscode.commands.executeCommand('vscode.open', error.openUrl);
			}
		});
		throw error;
	}).then(requirements => {
		let javaExecutablePath = path.resolve(requirements.java_home + '/bin/java');
		atlasmapProcess = child_process.spawn(javaExecutablePath, ['-jar', atlasmapExecutablePath]);
		atlasmapProcess.stdout.on('data', function (data) {
			let dec = new TextDecoder("utf-8");
			let text = dec.decode(data);
			atlasmapServerOutputChannel.append(text);
			if (text.indexOf("### AtlasMap Data Mapper UI started") > 0) {
				const url = "http://localhost:" + port;
				atlasMapWebView.default.createOrShow(extensionPath, url);
			}
		});
	});
}
