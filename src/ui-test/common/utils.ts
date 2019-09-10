import { Workbench, EditorView } from 'vscode-extension-tester';
import { commands, views } from './constants';

export async function startAtlasMap() {
	await new Workbench().executeCommand(commands.START_ATLASMAP);
}

export async function stopAtlasMap() {
	await new Workbench().executeCommand(commands.STOP_ATLASMAP);
}

export async function atlasMapTabIsAccessible() {
	await new EditorView().openEditor(views.ATLASMAP_TITLE);
}

export async function clearNotifications() {
	try {
		const center = await new Workbench().openNotificationsCenter();
		await center.clearAllNotifications();
	} catch (err) {
		console.log(err);
		return null;
	}
}