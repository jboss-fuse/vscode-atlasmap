import {
	clearNotifications,
	closeEditor,
	startAtlasMap,
	startAtlasMapCommand,
	stopAtlasMap,
	stopAtlasMapCommand
} from './common/utils';
import { atlasMapWindowExists, getNotificationWithMessage } from './common/conditions';
import { EditorView, VSBrowser, WebDriver } from 'vscode-extension-tester';
import { expect } from 'chai';
import { notifications, views } from './common/constants';

interface Timeouts {
	beforeEach: number;
	before: number;
	after: number;
	firstStart: number;
	secondStart: number;
	firstStop: number;
	secondStop: number;
}

const timeouts: Timeouts = {
	beforeEach: 30000,
	before: 30000,
	after: 30000,
	firstStart: 40000,
	secondStart: 40000,
	firstStop: 40000,
	secondStop: 30000,
}

function determineWaitTimeout(context: Mocha.Context): number {
	return context.timeout() - 2000;
}

export function basicTests() {
	let driver: WebDriver;

	// increase timeouts on windows platform
	if (process.platform === 'win32') {
		for (const key of Object.keys(timeouts)) {
			timeouts[key] = timeouts[key] * 10;
		}
	}

	describe('Start/Stop AtlasMap and verify correct notifications', () => {
		beforeEach(async function () {
			this.timeout(timeouts.beforeEach);
			driver = VSBrowser.instance.driver;
			await clearNotifications(determineWaitTimeout(this));
		});

		before(async function () {
			this.timeout(timeouts.before)
			await VSBrowser.instance.waitForWorkbench();
		});

		after(async function () {
			this.timeout(timeouts.after);
			await clearNotifications(determineWaitTimeout(this));
		});

		it('Start Command should show a notification with the correct text', async function () {
			this.timeout(timeouts.firstStart);
			await startAtlasMap(determineWaitTimeout(this)).catch((e) => expect.fail(`Could not start atlas map. Reason: ${e}`));
			await driver.wait(() => atlasMapWindowExists(), determineWaitTimeout(this), 'Atlas map editor does not exist');
			await closeEditor(views.ATLASMAP_TITLE, determineWaitTimeout(this)).catch(expect.fail);
		});

		it('Second Start Command should open AtlasMap window', async function () {
			this.timeout(timeouts.secondStart);
			await startAtlasMapCommand(determineWaitTimeout(this));
			await driver.wait(() => atlasMapWindowExists(), determineWaitTimeout(this), 'Atlas map editor does not exist');
		});

		it('Stop Command should show a notification with the correct text', async function () {
			this.timeout(timeouts.firstStop);
			await stopAtlasMap(determineWaitTimeout(this)).catch(expect.fail);
			await driver.wait(async () => !(await atlasMapWindowExists()), determineWaitTimeout(this), 'Atlas map editor exist');
		});

		it('Second Stop Command should show a notification with the correct text', async function () {
			this.timeout(timeouts.secondStop);
			await stopAtlasMapCommand(determineWaitTimeout(this));
			await driver.wait(() => getNotificationWithMessage(notifications.ATLASMAP_UNABLE_LOCATE).catch(() => undefined), determineWaitTimeout(this)).catch(expect.fail);
		});
	});
}
