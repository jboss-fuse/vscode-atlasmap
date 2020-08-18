import { Workbench, NotificationType, Notification, EditorView, VSBrowser } from 'vscode-extension-tester';
import { views } from './constants';
import { debug } from './utils';

export async function getNotificationWithMessage(message: string): Promise<Notification> {
	try {
		const center = await new Workbench().openNotificationsCenter();
		await VSBrowser.instance.driver.wait(async () => center && await center.isDisplayed().catch(() => false), 6000);
		const notifications = await center.getNotifications(NotificationType.Any);
		for (const item of notifications) {
			const text = await item.getMessage();
			if (text.includes(message)) {
				return item;
			}
		}
	}
	catch (e) {
		debug(e, 'getNotificationWithMessage');
		throw e;
	}
	throw new Error(`Could not find notification with message: ${message}`);
}

export async function editorExists(title: string, editor?: EditorView): Promise<boolean> {
	editor = editor || new Workbench().getEditorView();

	const titles = await editor.getOpenEditorTitles().catch(() => [] as string[]);
	debug(`Editor titles: ${titles.join(', ')}`, 'editorExists');
	for (const t of titles) {
		if (t.includes(title)) {
			return true;
		}
	}
	return false;
}


export async function atlasMapWindowExists(): Promise<boolean> {
	return editorExists(views.ATLASMAP_TITLE);
}
