import * as child_process from 'child_process';
import * as opn from 'opn';
import * as vscode from 'vscode';
import { TextDecoder } from 'util';

export function activate(context: vscode.ExtensionContext) {

	var atlasmapServerOutputChannel = vscode.window.createOutputChannel("Atlasmap server");

	var path = require('path');
	var atlasmapExecutablePath = context.asAbsolutePath(path.join('jars','atlasmap-standalone.jar'));

	context.subscriptions.push(vscode.commands.registerCommand('atlasmap.open', async () => {

		// obtain the stored configuration settings for url and port
		const urlFromSettings = vscode.workspace.getConfiguration().get("atlasmap.url");
		const portFromSettings = vscode.workspace.getConfiguration().get("atlasmap.port");

		// obtain the atlasmap url
		var url = await vscode.window.showInputBox(
			{ 
				prompt: 'Enter the url of your AtlasMap instance (without port).',
				value: '' + urlFromSettings
			}
		);

		// obtain the atlasmap port
		var port = await vscode.window.showInputBox(
			{ 
				prompt: 'Provide glob pattern of files to have empty last line.',
				value: '' + portFromSettings
			}
		);

		var setUrlAsGlobal = vscode.workspace.getConfiguration().inspect("atlasmap.url").workspaceValue == undefined;
		var setPortAsGlobal = vscode.workspace.getConfiguration().inspect("atlasmap.port").workspaceValue == undefined;

		if (url !== urlFromSettings) {
			// url changed - update the configuration to remember the url
			vscode.workspace.getConfiguration().update("atlasmap.url", url, setUrlAsGlobal);
		}

		if (port !== portFromSettings) {
			// port changed - update the configuration to remember the port
			vscode.workspace.getConfiguration().update("atlasmap.port", port, setPortAsGlobal);
		}

		if (!url.startsWith("http://") && !url.startsWith("https://")) {
			url = "http://" + url;
		}

		if (url.lastIndexOf(":") > 4) {
			// url contains a port ? cut it off
			url = url.substring(0, url.lastIndexOf(":"));
		}

		opn(url + ':' + port);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('atlasmap.start', () => {
		var atlasmapProcess = child_process.spawn(
			'java', ['-jar', atlasmapExecutablePath]
		);
		atlasmapProcess.stdout.on('data', function(data){
			var dec = new TextDecoder("utf-8");
			atlasmapServerOutputChannel.append(dec.decode(data));
		});
	}));

}
