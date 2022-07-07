import { WebDriver, WebView, By, CustomEditor, until, Workbench, VSBrowser, NotificationType } from 'vscode-extension-tester';
import { assert, expect } from 'chai';

export async function handleDirtyEditor(): Promise<void> {
	await new Promise(resolve => setTimeout(resolve, 3000));
	if (new CustomEditor().isDirty()) {
		console.log('Editor is dirty!... Reverting file...');
		await revertChanges();
		console.log('File changes reverted!');
	}
}

async function revertChanges(): Promise<void> {
	const workbench = new Workbench();
	await workbench.executeCommand('File: Revert File');
}

export async function waitForAtlasMapEditorOpening(timeout = 60000) {
	await new Promise(resolve => setTimeout(resolve, 5000)); // wait for initial notification is displayed
	try {
		console.log('Start checking notifications');
		await VSBrowser.instance.driver.wait(async () => {
			return notificationExists('Waiting for editor to open AtlasMap UI for');
		}, timeout);
		await new Promise(resolve => setTimeout(resolve, 5000)); // wait for the AtlasMap editor init
		console.log('End checking notifications');
	} catch (error) {
		expect.fail(`Could not find notification: ${error}`);
	}
}

export async function notificationExists(text: string): Promise<boolean> {
	try {
		const center = await new Workbench().openNotificationsCenter();
		const notifications = await center.getNotifications(NotificationType.Any);
		for (const notification of notifications) {
			const message = await notification.getMessage();
			if (message.includes(text)) {
				console.log(message);
				return false;
			}
		}
		console.log('AtlasMap notification is gone!');
		return true;
	} catch (err) {
		console.log('AtlasMap notification is gone!');
		return true;
	}
}

export async function retrieveAtlasMapEditor(driver: WebDriver, atlasMapWebView: WebView) {
	const atlasMapEditor = new CustomEditor();
	assert.isFalse(await atlasMapEditor.isDirty(), 'The editor is expected to not be dirty on first open but it is dirty.');
	await switchToAtlasmapFrame(driver, atlasMapWebView);
	try {
		console.log('wait for AtlasMap Data Mapper UI');
		await driver.wait(until.elementLocated(By.xpath("//title[text()='AtlasMap Data Mapper UI']")), 10000);
	} catch {
		// sometimes, the switch seems to not have been done as expected, redoing it is solving the problem...
		await switchToAtlasmapFrame(driver, atlasMapWebView);
		await driver.wait(until.elementLocated(By.xpath("//title[text()='AtlasMap Data Mapper UI']")), 10000);
	}
	return atlasMapEditor;
}
export async function retrieveWebview(driver: WebDriver) {
	const atlasMapWebView = new WebView();
	await switchToAtlasmapFrame(driver, atlasMapWebView);
	await atlasMapWebView.switchBack();
	return atlasMapWebView;
}

async function switchToAtlasmapFrame(driver: WebDriver, atlasMapWebView: WebView) {
	await driver.wait(async () => {
		try {
			console.log('Switching to AtlasMap frame');
			await atlasMapWebView.switchToFrame();
			console.log('switched frame');
			return true;
		} catch {
			console.log('Error when trying to switch to AtlasMap frame');
			return false;
		}
	});
}
