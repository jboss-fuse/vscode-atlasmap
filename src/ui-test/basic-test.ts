import { VSBrowser, WebDriver, EditorView, until, InputBox } from 'vscode-extension-tester';
import { atlasMapWindowExists } from './common/conditions';
import { notifications, views } from './common/constants';
import { startAtlasMap, stopAtlasMap, atlasMapTabIsAccessible, clearNotifications } from './common/utils';
import { Workbench, NotificationsCenter, NotificationPredicates } from "vscode-uitests-tooling";


export function basicTests() {
	let driver: WebDriver;

	describe('Start/Stop AtlasMap and verify correct notifications', function () {
		this.timeout(30000);
		let notificationCenter: NotificationsCenter;

		beforeEach(async function () {
			driver = VSBrowser.instance.driver;
			await clearNotifications(this.timeout() - 1000);
			notificationCenter = await new Workbench().openNotificationsCenter(this.timeout() - 1000);
		});

		afterEach(async function () {
			await notificationCenter?.close(this.timeout() - 1000);
		});

		it('Start Command should show a notification with the correct text', async function () {
			await startAtlasMap();
			await driver.wait(until.elementIsNotVisible(new InputBox()));

			const notificationStarting = notificationCenter.getNotification(
				NotificationPredicates.containsMessage(notifications.ATLASMAP_STARTING),
				this.timeout() - 1000,
				`Could not find notification with message "${notifications.ATLASMAP_STARTING}".`
			);

			const notificationWaiting = await notificationCenter.getNotification(
				NotificationPredicates.containsMessage(notifications.ATLASMAP_WAITING),
				this.timeout() - 1000,
				`Could not find notification with message "${notifications.ATLASMAP_WAITING}".`
			);

			await driver.wait(until.stalenessOf(notificationWaiting), this.timeout() - 1000);
			await notificationStarting;

			const editor = await atlasMapTabIsAccessible();
			await new EditorView().closeEditor(views.ATLASMAP_TITLE);
			await driver.wait(until.stalenessOf(editor), this.timeout() - 1000);
		});

		it('Second Start Command should open AtlasMap window', async function () {
			await startAtlasMap();
			await driver.wait(atlasMapWindowExists, this.timeout() - 1000);
			await atlasMapTabIsAccessible();
		});

		it('Stop Command should show a notification with the correct text', async function () {
			await stopAtlasMap();

			await notificationCenter.getNotification(
				NotificationPredicates.containsMessage(notifications.ATLASMAP_STOPPED),
				this.timeout() - 1000,
				`Could not find notification with message "${notifications.ATLASMAP_STARTING}".`
			);
		});

		it('Second Stop Command should show a notification with the correct text', async function () {
			await stopAtlasMap();
			await notificationCenter.getNotification(
				NotificationPredicates.containsMessage(notifications.ATLASMAP_UNABLE_LOCATE),
				this.timeout() - 1000,
				`Could not find notification with message "${notifications.ATLASMAP_STARTING}".`
			);
		});
	});

}