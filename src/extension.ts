import * as vscode from 'vscode';
import * as opn from 'opn';

export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(vscode.commands.registerCommand('atlasmap.open', () => {
		opn('http://127.0.0.1:8585');
	}));
}
