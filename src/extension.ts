import * as child_process from 'child_process';
import * as opn from 'opn';
import * as path from 'path';
import * as requirements from './requirements';
import * as vscode from 'vscode';
import { TextDecoder } from 'util';
import * as request from 'request';

export function activate(context: vscode.ExtensionContext) {

	let atlasmapServerOutputChannel = vscode.window.createOutputChannel("Atlasmap server");
	let atlasmapExecutablePath = context.asAbsolutePath(path.join('jars','atlasmap-standalone.jar'));

	context.subscriptions.push(vscode.commands.registerCommand('atlasmap.open', async () => {
		const url = await retrieveAtlasMapUrl();
		if (url !== undefined) {
			request.get(url, function (error: any, response: any, body: any) {
				if (!error && response && "404" !== response.statusCode) {
					// found the url resolvable - call the external browser
					opn(url);
				} else {
					// seems the url is not found - inform the user
					vscode.window.showErrorMessage("We can't find a running AtlasMap UI instance at " + url);
				}
			});
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('atlasmap.start', () => {

		requirements.resolveRequirements().catch(error => {
			vscode.window.showErrorMessage(error.message, error.label).then((selection) => {
				if (error.label && error.label === selection && error.openUrl) {
					vscode.commands.executeCommand('vscode.open', error.openUrl);
				}
			});
			throw error;
		}).then(requirements => {
			var javaExecutablePath = path.resolve(requirements.java_home + '/bin/java');
			var atlasmapProcess = child_process.spawn(
				javaExecutablePath, ['-jar', atlasmapExecutablePath]
			);
			atlasmapProcess.stdout.on('data', function (data) {
				var dec = new TextDecoder("utf-8");
				atlasmapServerOutputChannel.append(dec.decode(data));
			});
		});
	}));

}

/**
 * asks for inputs (url and port) by also providing the stored default configuration
 * values for those input fields. Whenever one of the inputs differ from the stored
 * configuration value then we issue an update on the saved value
 */
async function retrieveAtlasMapUrl(): Promise<string> {
		const urlConfigKey = "atlasmap.url";
		const portConfigKey = "atlasmap.port";
		const config = vscode.workspace.getConfiguration();
		const urlFromSettings:string = config.get(urlConfigKey);
		const portFromSettings:string = config.get(portConfigKey);

		let url = await vscode.window.showInputBox(
			{ 
				prompt: 'Enter the url of your AtlasMap instance (without port).',
				value: urlFromSettings
			}
		);

		if (url == undefined) {
			return undefined;
		}

		let port = await vscode.window.showInputBox(
			{ 
				prompt: 'Enter the port number of your AtlasMap instance.',
				value: portFromSettings,
				validateInput: (value: string): string | undefined => {
					let numPort:number = parseInt(value);
					if (isNaN(numPort) || numPort < 1 || numPort > 65535) {
						return "Enter a valid port number (1 - 65535).";
					} else {
						return "";
					}
				}
			}
		);

		if (port === undefined) {
			return undefined;
		}

		updateConfigValueIfNeeded(config, urlConfigKey, urlFromSettings, url);
		updateConfigValueIfNeeded(config, portConfigKey, portFromSettings,port);
		
		if (!url.startsWith("http://") && !url.startsWith("https://")) {
			url = "http://" + url;
		}

		if (url.lastIndexOf(":") > 4) {
			url = url.substring(0, url.lastIndexOf(":"));
		}

		return url + ":" + port;
}

/**
 * updates the configuration settings of the given key with the given value
 * 
 * @param config 	the vscode configuration object
 * @param key 		the key to update
 * @param oldValue	the old value
 * @param newValue	the value to use as new value
 */
function updateConfigValueIfNeeded(config: vscode.WorkspaceConfiguration, key: string, oldValue: string, newValue: string): void {
	if (newValue !== oldValue) {
		const setAsGlobal = config.inspect(key).workspaceValue == undefined;
		config.update(key, newValue, setAsGlobal);
	}
}
