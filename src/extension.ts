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

	context.subscriptions.push(vscode.commands.registerCommand('atlasmap.start', async () => {
		if (atlasMapLaunchPort === undefined) {
			const freeLocalPort = await retrieveFreeLocalPort();
			launchAtlasMapLocally(atlasmapExecutablePath, atlasmapServerOutputChannel, freeLocalPort);
			vscode.window.showInformationMessage("Starting AtlasMap instance at port " + freeLocalPort);
			atlasMapLaunchPort = freeLocalPort;
		} else {
			vscode.window.showInformationMessage("Running AtlasMap instance found at port " + atlasMapLaunchPort);
			const url = "http://localhost:" + atlasMapLaunchPort;
			opn(url);
		}
	}));
}

async function retrieveFreeLocalPort(): Promise<string> {
	const freeLocalPort = await co(function *() {
		const _port = yield detect("8585");
		return _port;
	});
	return freeLocalPort;
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
