import * as vscode from 'vscode';

describe('Test command present', () => {

	it("Start AtlasMap command executing without throwing error", async() => {
		await vscode.commands.executeCommand('atlasmap.start');
	});

	it("Open AtlasMap command executing without throwing error", async() => {
		await vscode.commands.executeCommand('atlasmap.start');
		await vscode.commands.executeCommand('atlasmap.open');
	});
});