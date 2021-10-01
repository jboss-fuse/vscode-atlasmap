import * as AtlasMapWebViewUtil from './AtlasMapWebViewUtil';
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
	private previouslyVisible: boolean = true;

	public static createOrShow(localUrl: string, context: vscode.ExtensionContext) {
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

		AtlasMapPanel.currentPanel = new AtlasMapPanel(panel, localUrl, context);
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
			// Checking for previous visibility because in Theia, the event is thrown also when taking focus which is causing too many reloads
			if (this._panel.visible && !this.previouslyVisible) {
				this._update(url);
			}
			this.previouslyVisible = this._panel.visible;
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

	private async _update(localUrl: string) {
		this._panel.title = "AtlasMap";
		const fullWebServerUri = await vscode.env.asExternalUri(vscode.Uri.parse(localUrl));
		if (AtlasMapPanel.currentPanel) {
			const webview = AtlasMapPanel.currentPanel._panel.webview;
			await AtlasMapWebViewUtil.loadWebContent(webview, fullWebServerUri);
		}
	}
}
