import { EditorView, VSBrowser } from 'vscode-extension-tester';
import { commands, views } from './constants';
import { Workbench } from "vscode-uitests-tooling";

export async function startAtlasMap() {
	await new Workbench().executeCommand(commands.START_ATLASMAP);
}

export async function stopAtlasMap() {
	await new Workbench().executeCommand(commands.STOP_ATLASMAP);
}

export async function atlasMapTabIsAccessible() {
	return await new EditorView().openEditor(views.ATLASMAP_TITLE);
}

export async function clearNotifications(timeout: number = 30000): Promise<void> {
	const waitTimeout = timeout;
	timeout -= 2000;

	await VSBrowser.instance.driver.wait(async () => {
		let center = await new Workbench().openNotificationsCenter(timeout);
		await center.clearAllNotifications(timeout);
		center = await new Workbench().openNotificationsCenter(timeout);
		return (await center.getNotifications()).length === 0;
	}, waitTimeout, "Could not clear notifications");
}