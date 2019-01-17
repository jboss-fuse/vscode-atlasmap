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
			AtlasMapPanel.createOrShow(context.extensionPath, url);
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
				AtlasMapPanel.createOrShow(extensionPath, url);
			}
		});
	});
}

/**
 * Manages atlas mapper webview panels
 */
export class AtlasMapPanel {

	/**
     * Track the currently panel. Only allow a single panel to exist at a time.
     */
	public static currentPanel: AtlasMapPanel | undefined;
	public static readonly viewType = 'atlasmap';

	public readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionPath: string, url: string) {
		const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

		// If we already have a panel, show it.
		if (AtlasMapPanel.currentPanel) {
			AtlasMapPanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(AtlasMapPanel.viewType, "AtlasMap", column || vscode.ViewColumn.One, {
			enableScripts: true
		});

		AtlasMapPanel.currentPanel = new AtlasMapPanel(panel, extensionPath, url);
	}

	public static revive(panel: vscode.WebviewPanel, extensionPath: string, url: string) {
		AtlasMapPanel.currentPanel = new AtlasMapPanel(panel, extensionPath, url);
	}

	private constructor(panel: vscode.WebviewPanel, extensionPath: string, url: string) {
		this._panel = panel;
		this._extensionPath = extensionPath;

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(e => {
			if (this._panel.visible) {
				this._update(url);
			}
		}, null, this._disposables);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(message => {
			if (message.command == 'alert') {
				vscode.window.showErrorMessage(message.text);
				return;
			}
		}, null, this._disposables);

		// Set the webview's initial html content 
		this._update(url);
	}

	public dispose() {
		AtlasMapPanel.currentPanel = undefined;

		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _update(url: string) {
		this._panel.title = "AtlasMap";
		this.loadWebContent(url);
	}

	private loadWebContent(url: string) {
		var fetchUrl = require("fetch").fetchUrl;
		fetchUrl(url, function(error, meta, body) {
			try {
				var content =  body.toString();
				content = body.toString().replace('href="/"', 'href="'+url+'/"');
				AtlasMapPanel.currentPanel._panel.webview.html = content;
			} catch (err) {
				console.log(err.toString());
			}
		});
	}
}
