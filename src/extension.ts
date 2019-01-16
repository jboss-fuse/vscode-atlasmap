import * as child_process from 'child_process';
import * as opn from 'opn';
import * as vscode from 'vscode';
import { TextDecoder } from 'util';

export function activate(context: vscode.ExtensionContext) {

	var atlasmapServerOutputChannel = vscode.window.createOutputChannel("Atlasmap server");

	var path = require('path');
	var atlasmapExecutablePath = context.asAbsolutePath(path.join('jars','atlasmap-standalone.jar'));

	context.subscriptions.push(vscode.commands.registerCommand('atlasmap.open', () => {
		opn('http://127.0.0.1:8585');
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
