import { Notification, VSBrowser, WebDriver, EditorView } from 'vscode-extension-tester';
import { expect } from 'chai';
import { getNotificationWithMessage, whilegetNotificationWithMessage, atlasMapWindowExists } from './common/conditions';
import { notifications, views } from './common/constants';
import { startAtlasMap, stopAtlasMap, atlasMapTabIsAccessible, clearNotifications } from './common/utils';


export function basicTests() {
	let driver: WebDriver;

	describe('Start/Stop AtlasMap and verify correct notifications', () => {
		beforeEach(async () => {
			driver = VSBrowser.instance.driver;
			await clearNotifications();
		});

		it('Start Command should show a notification with the correct text', async function () {
			this.timeout(30000);
			await startAtlasMap();
			driver.sleep(1000);
			const notificationStarting = await driver.wait(() => { return getNotificationWithMessage(notifications.ATLASMAP_STARTING); }, 20000) as Notification;
			expect(await notificationStarting.getMessage()).contains(notifications.ATLASMAP_STARTING);
			await driver.wait(() => { return whilegetNotificationWithMessage(notifications.ATLASMAP_WAITING); }, 20000);
			await atlasMapTabIsAccessible();
			await new EditorView().closeEditor(views.ATLASMAP_TITLE);
		});

		it('Second Start Command should open AtlasMap window', async function () {
			this.timeout(20000);
			await startAtlasMap();
			await driver.wait(() => { return atlasMapWindowExists(); }, 10000);
			await atlasMapTabIsAccessible();
		});

		it('Stop Command should show a notification with the correct text', async function () {
			this.timeout(30000);
			driver.sleep(1000);
			await new EditorView().openEditor('Welcome'); // workaround focus issue
			await stopAtlasMap();
			driver.sleep(1000);
			const notification = await driver.wait(() => { return getNotificationWithMessage(notifications.ATLASMAP_STOPPED); }, 20000);
			expect(await notification.getMessage()).contains(notifications.ATLASMAP_STOPPED);
		});

		it('Second Stop Command should show a notification with the correct text', async function () {
			this.timeout(30000);
			await stopAtlasMap();
			const notification = await driver.wait(() => { return getNotificationWithMessage(notifications.ATLASMAP_UNABLE_LOCATE); }, 10000) as Notification;
			expect(await notification.getMessage()).contains(notifications.ATLASMAP_UNABLE_LOCATE);
		});

		afterEach(async () => {
			await clearNotifications();
		});
	});

}