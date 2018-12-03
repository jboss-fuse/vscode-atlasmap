import * as path from 'path';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(vscode.commands.registerCommand('atlasmap.start', () => {
		AtlasMapPanel.createOrShow(context.extensionPath);
	}));

	if (vscode.window.registerWebviewPanelSerializer) {
		// Make sure we register a serializer in activation event
		vscode.window.registerWebviewPanelSerializer(AtlasMapPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				console.log(`Got state: ${state}`);
				AtlasMapPanel.revive(webviewPanel, context.extensionPath);
			}
		});
	}
}

/**
 * Manages atlas mapper webview panels
 */
class AtlasMapPanel {
	// the URL of the local atlasmap ui
	private static readonly ATLAS_MAP_URL = "https://syndesis-staging.b6ff.rh-idev.openshiftapps.com/";

	/**
     * Track the currently panel. Only allow a single panel to exist at a time.
     */
	public static currentPanel: AtlasMapPanel | undefined;
	public static readonly viewType = 'atlasmap';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionPath: string) {
		const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

		// If we already have a panel, show it.
		if (AtlasMapPanel.currentPanel) {
			AtlasMapPanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(AtlasMapPanel.viewType, "Atlas Map", column || vscode.ViewColumn.One, {
			enableScripts: true
		});

		AtlasMapPanel.currentPanel = new AtlasMapPanel(panel, extensionPath);
	}

	public static revive(panel: vscode.WebviewPanel, extensionPath: string) {
		AtlasMapPanel.currentPanel = new AtlasMapPanel(panel, extensionPath);
	}

	private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
		this._panel = panel;
		this._extensionPath = extensionPath;

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(e => {
			if (this._panel.visible) {
				this._update();
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
		this._update();
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

	private _update() {
		this._panel.title = "Atlas Map";
		this.loadWebContent();
	}

	private loadWebContent() {
		var fetchUrl = require("fetch").fetchUrl;
		fetchUrl(AtlasMapPanel.ATLAS_MAP_URL, function(error, meta, body) {
			try {
				AtlasMapPanel.currentPanel._panel.webview.html = body.toString();
			} catch (err) {
				console.log(err.toString());
			}
		});
	}
}
