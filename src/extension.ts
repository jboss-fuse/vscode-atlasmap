import * as child_process from 'child_process';
import * as opn from 'opn';
import * as vscode from 'vscode';
import { TextDecoder } from 'util';
import * as request from 'request';

export function activate(context: vscode.ExtensionContext) {

	var atlasmapServerOutputChannel = vscode.window.createOutputChannel("Atlasmap server");

	var path = require('path');
	var atlasmapExecutablePath = context.asAbsolutePath(path.join('jars','atlasmap-standalone.jar'));

	context.subscriptions.push(vscode.commands.registerCommand('atlasmap.open', async () => {
		const url = await retrieveAtlasMapUrl();
		request.get(url, function (error, response, body) {
			if (!error && response && "404" !== response.statusCode) {
				// found the url resolvable - call the external browser
				opn(url);
			} else {
				// seems the url is not found - inform the user
				vscode.window.showErrorMessage("We can't find a running AtlasMap UI instance at " + url);
			}
		});
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

/**
 * asks for inputs (url and port) by also providing the stored default configuration
 * values for those input fields. Whenever one of the inputs differ from the stored
 * configuration value then we issue an update on the saved value
 */
async function retrieveAtlasMapUrl(): Promise<string> {
		// obtain the stored configuration settings for url and port
		const urlConfigKey = "atlasmap.url";
		const portConfigKey = "atlasmap.port";
		const urlFromSettings = vscode.workspace.getConfiguration().get(urlConfigKey);
		const portFromSettings = vscode.workspace.getConfiguration().get(portConfigKey);

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

		if (url !== urlFromSettings) {
			// url changed - update the configuration to remember the url
			updateConfigValue(urlConfigKey, url);
		}

		if (port !== portFromSettings) {
			// port changed - update the configuration to remember the port
			updateConfigValue(portConfigKey, port);
		}

		if (!url.startsWith("http://") && !url.startsWith("https://")) {
			url = "http://" + url;
		}

		if (url.lastIndexOf(":") > 4) {
			// url contains a port ? cut it off
			url = url.substring(0, url.lastIndexOf(":"));
		}

		return url + ":" + port;
}

/**
 * updates the configuration settings of the given key with the given value
 * 
 * @param key 	the key to update
 * @param value the value to use as new value
 */
function updateConfigValue(key: string, value: string): void {
	const setAsGlobal = vscode.workspace.getConfiguration().inspect(key).workspaceValue == undefined;
	vscode.workspace.getConfiguration().update(key, value, setAsGlobal);
}
