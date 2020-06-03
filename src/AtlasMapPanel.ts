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
	public readonly _context: vscode.ExtensionContext;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(url: string, context: vscode.ExtensionContext) {
		const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

		// If we already have a panel, show it.
		if (AtlasMapPanel.currentPanel) {
			AtlasMapPanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			AtlasMapPanel.viewType, 
			"AtlasMap", 
			{
				preserveFocus: true,
				viewColumn: column || vscode.ViewColumn.One
			}, 
			{
				enableScripts: true,
				retainContextWhenHidden: true,
			}
		);

		AtlasMapPanel.currentPanel = new AtlasMapPanel(panel, url, context);
	}

	public static close() {
		if (AtlasMapPanel.currentPanel) {
			AtlasMapPanel.currentPanel.dispose();
		}
	}

	public static revive(panel: vscode.WebviewPanel, url: string, context: vscode.ExtensionContext) {
		AtlasMapPanel.currentPanel = new AtlasMapPanel(panel, url, context);
	}

	private constructor(panel: vscode.WebviewPanel, url: string, context: vscode.ExtensionContext) {
		this._panel = panel;
		this._context = context;

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
			const onScriptsCommand = "atlasmapScripts";
			/** CSP required for Atlasmap scripts to run. We need the unsafe scripts 
			 * because of how webpack packages Atlasmap.
			 * Also set the base href for all requests. Since by default Atlasmap 
			 * standalone fetches resources against localhost, setting this we make 
			 * all AJAX requests go against our embedded Atlasmap server.
			*/
			const commonHead = `
				<base href="${fullWebServerUri}">
				<meta
					http-equiv="Content-Security-Policy"
					content="
						default-src 'self' 'unsafe-inline' 'unsafe-hashes' 'unsafe-eval' ${fullWebServerUri} ${cspSource};
						img-src 'self' ${fullWebServerUri} ${cspSource} data:;
					" />
			`;

			/** We first need to retrieve Atlasmap's index.html, that contains all the
			 * assets and html structure required to bootstrap the application. Since 
			 * VSC doesn't provide a way to make AJAX requests inside the extension 
			 * itself, we use the webview to do that. When the content of the file has
			 * been retrieve, a `onScriptsCommand` message is sent back to VSC.
			*/
			webview.html =`<!DOCTYPE html>
				<head>
					${commonHead}
				</head>
				<body>
					<div id="root"></div>
					<div id="modals"></div>
					<script>
						(async function injectAtlasmap() {
							const request = await fetch("${fullWebServerUri}index.html");
							const body = await request.text();
							const vscode = acquireVsCodeApi();
							vscode.postMessage({
								command: '${onScriptsCommand}',
								html: body,
							})
						})();
					</script>
				</body>
				</html>
			`;

			/** This handles the `onScriptsCommand` message from the webview. We take 
			 * the index.html content as is, augmenting it with the CSP we need to run
			 * Atlasmap. After this the application is ready.
			 */
			AtlasMapPanel.currentPanel._panel.webview.onDidReceiveMessage(
				message => {
					switch (message.command) {
						case onScriptsCommand:
							webview.html = (message.html as string).replace("<head>", "<head>" + commonHead);
							break;
					}
				},
				undefined,
				this._context.subscriptions
			);
		}
	}
}
