import * as vscode from 'vscode';
import { log } from './extension';

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
			enableScripts: true,
			retainContextWhenHidden: true
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

	private async loadWebContent(localUrl: string) {
		const fullWebServerUri = await vscode.env.asExternalUri(vscode.Uri.parse(localUrl));
		if (AtlasMapPanel.currentPanel) {
			const webview = AtlasMapPanel.currentPanel._panel.webview;
			const cspSource = webview.cspSource;
			webview.html =
`<!DOCTYPE html>
	<head>
		<meta
   		     http-equiv="Content-Security-Policy"
			content="default-src 'self' ${fullWebServerUri} *;
			frame-src ${fullWebServerUri} ${cspSource} https:;
			img-src ${fullWebServerUri} ${cspSource} https:;
			script-src ${fullWebServerUri} ${cspSource};
			style-src ${fullWebServerUri} ${cspSource};"
    	/>
	</head>
	<body>
		<!-- All content from the web server must be in an iframe -->
		<iframe src="${fullWebServerUri}" width="100%" height="900" sandbox="allow-scripts allow-same-origin" Content-Security-Policy: frame-ancestors ${fullWebServerUri} ${cspSource};>
	</body>
</html>`;
		}
	}
}
