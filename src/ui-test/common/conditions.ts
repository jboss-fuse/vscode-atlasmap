import { Workbench, NotificationType } from 'vscode-extension-tester';
import { views } from './constants';

export async function getNotificationWithMessage(message: string) {
	try {
		const center = await new Workbench().openNotificationsCenter();
		const notifications = await center.getNotifications(NotificationType.Any);
		for (const item of notifications) {
			const text = await item.getMessage();
			if (text.indexOf(message) > -1) {
				return item;
			}
		}
		return null;
	} catch (err) {
		//do not print err
		return null;
	}
}

export async function whilegetNotificationWithMessage(message: string) {
	return !(await getNotificationWithMessage(message));
}

export async function notificationCenterIsOpened(): Promise<boolean | undefined> {
	try {
		const center = await new Workbench().openNotificationsCenter();
		return await center.isDisplayed();
	} catch (err) {
		//do not print err
		return false;
	}
}

export async function atlasMapWindowExists(): Promise<boolean | undefined> {
	try {
		const titles = await new Workbench().getEditorView().getOpenEditorTitles();
		for (const title of titles) {
			if (title.indexOf(views.ATLASMAP_TITLE) > -1) {
				return true;
			}
		}
		return false;
	} catch (err) {
		//do not print err
		return false;
	}
}