import * as vscode from 'vscode';

/**
 * Manages atlas mapper webview panels
 */
export default class AtlasMapPanel {

	/**
     * Track the currently panel. Only allow a single panel to exist at a time.
     */
	public static currentPanel: AtlasMapPanel | undefined;
	public static readonly viewType = 'atlasmap';

	public readonly _panel: vscode.WebviewPanel;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(url: string) {
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

		AtlasMapPanel.currentPanel = new AtlasMapPanel(panel, url);
	}

	public static close() {
		if (AtlasMapPanel.currentPanel) {
			AtlasMapPanel.currentPanel.dispose();
		}
	}

	public static revive(panel: vscode.WebviewPanel, url: string) {
		AtlasMapPanel.currentPanel = new AtlasMapPanel(panel, url);
	}

	private constructor(panel: vscode.WebviewPanel, url: string) {
		this._panel = panel;

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
				console.error(err);
			}
		});
	}
}
