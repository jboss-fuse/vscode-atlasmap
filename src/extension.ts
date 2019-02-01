import * as child_process from 'child_process';
import * as co from 'co';
import * as detect from 'detect-port';
import * as opn from 'opn';
import * as path from 'path';
import * as requirements from './requirements';
import * as vscode from 'vscode';
import { TextDecoder } from 'util';

export function activate(context: vscode.ExtensionContext) {

	let atlasmapServerOutputChannel = vscode.window.createOutputChannel("AtlasMap Server");
	let atlasmapExecutablePath = context.asAbsolutePath(path.join('jars','atlasmap-standalone.jar'));
	let atlasMapLaunchPort: string;

	context.subscriptions.push(vscode.commands.registerCommand('atlasmap.start', () => {
		if (atlasMapLaunchPort === undefined) {
			retrieveFreeLocalPort()
				.then( (port) => {
					launchAtlasMapLocally(atlasmapExecutablePath, atlasmapServerOutputChannel, port);
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
			opn(url);
		}
	}));
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

function launchAtlasMapLocally(atlasmapExecutablePath: string, atlasmapServerOutputChannel: vscode.OutputChannel, port: string) {
	process.env.SERVER_PORT = port;

	requirements.resolveRequirements().catch(error => {
		vscode.window.showErrorMessage(error.message, error.label).then((selection) => {
			if (error.label && error.label === selection && error.openUrl) {
				vscode.commands.executeCommand('vscode.open', error.openUrl);
			}
		});
		throw error;
	}).then(requirements => {
		let javaExecutablePath = path.resolve(requirements.java_home + '/bin/java');
		let atlasmapProcess = child_process.spawn(
			javaExecutablePath, ['-jar', atlasmapExecutablePath]
		);
		atlasmapProcess.stdout.on('data', function (data) {
			let dec = new TextDecoder("utf-8");
			let text = dec.decode(data);
			atlasmapServerOutputChannel.append(text);
			if (text.indexOf("### AtlasMap Data Mapper UI started") > 0) {
				const url = "http://localhost:" + port;
				opn(url);
			}
		});
	});
}
