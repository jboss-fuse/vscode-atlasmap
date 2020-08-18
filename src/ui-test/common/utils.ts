import { atlasMapWindowExists, editorExists, getNotificationWithMessage } from './conditions';
import { commands, notifications, views } from './constants';
import { DefaultWait } from 'vscode-uitests-tooling';
import {
	EditorView,
	Input,
	InputBox,
	Notification,
	TitleBar,
	until,
	VSBrowser,
	WebElement,
	Workbench,
	NotificationType
} from 'vscode-extension-tester';
import { TimeoutPromise } from './TimeoutPromise';

export function debug(message: string, section: string) {
	console.warn(`DEBUG(${section}) - ${message}`);
}

async function confirm(input: Input): Promise<void> {
	await input.confirm();
	await input.getDriver().wait(async () => isHidden(input));
}

async function openCommandPaletteHelper(): Promise<void> {
	const titleBar = new TitleBar();
	await titleBar.select("View", "Command Palette...");
}

async function openCommandPalette(timeout: number = 6000, inputTimeout: number = 6000): Promise<Input> {
	const driver = VSBrowser.instance.driver;

	return driver.wait(async () => {
		try {
			const input = await getInput(inputTimeout).catch(() => undefined);

			if (input && await isInteractive(input)) {
				return input;
			}
			else {
				await openCommandPaletteHelper();
				await DefaultWait.sleep(1000);
				return undefined;
			}
		}
		catch (e) {
			debug(e, 'openCommandPalette');
			return undefined;
		}
	}, timeout, 'Input is not interactive.');
}

async function getInput(timeout: number = 16000): Promise<InputBox> {
	return VSBrowser.instance.driver.wait(async () => {
		try {
			return new InputBox().wait(timeout / 4);
		}
		catch {
			return undefined;
		}
	}, timeout, 'Could not locate input box.')
}

export async function isHidden(element: WebElement): Promise<boolean> {
	return !(await element.isDisplayed().catch(() => false));
}

async function isInteractive(element: WebElement): Promise<boolean> {
	try {
		return await element.isDisplayed() && await element.isEnabled();
	}
	catch {
		return false;
	}
}

export async function executeCommand(command: string, timeout: number = 6000): Promise<void> {
	if (command.trim().length === 0) {
		throw new Error('Command must not be blank.');
	}

	if (!command.startsWith('>')) {
		command = `>${command}`;
	}

	try {
		const cmd = await openCommandPalette(timeout);
		await cmd.setText(command);
		await confirm(cmd);
	}
	catch (e) {
		throw new Error(`Could not execute command "${command}". Reason: ${e}`);
	}
}

export async function startAtlasMapCommand(timeout: number): Promise<void> {
	return executeCommand(commands.START_ATLASMAP, timeout);
}

export async function stopAtlasMapCommand(timeout: number): Promise<void> {
	return executeCommand(commands.STOP_ATLASMAP, timeout);
}

export async function startAtlasMap(timeout: number): Promise<void> {
	const waitingNotification = driverGetNotificationWithMessage(notifications.ATLASMAP_WAITING, timeout);
	const startingNotification = driverGetNotificationWithMessage(notifications.ATLASMAP_STARTING, timeout);
	await startAtlasMapCommand(timeout);
	try {
		const notification = await waitingNotification;
		await waitUntilStale(notification, timeout);
	}
	catch (e) {
		throw new Error(`Waiting notification timed out. Reason: ${e}`);
	}
	try {
		await startingNotification;
	}
	catch (e) {
		throw new Error(`Starting notification timed out. Reason: ${e}`);
	}
	await VSBrowser.instance.driver.wait(() => atlasMapWindowExists(), timeout, 'Could not start atlas map');
}

async function driverGetNotificationWithMessage(message: string, timeout: number = 15000): Promise<Notification> {
	let run = true;

	async function doWork(message: string, resolve: (notification: Notification) => void) {
		try {
			const notification = await getNotificationWithMessage(message);
			resolve(notification);
		} catch (e) {
			debug(`Could not get notification with message: ${message}. Reason: ${e}.`, 'driverGetNotificationWithMessage');
			if (run) {
				setImmediate(doWork, message, resolve);		
			}
		}
	}

	return new TimeoutPromise<Notification>((resolve) => {
		setImmediate(doWork, message, resolve);
	}, timeout).catch((e) => {
		run = false;
		throw e;
	});
}

function waitUntilStale(element: WebElement, timeout: number): Promise<void> {
	let run = true;

	function doWork(resolve: () => void): void {
		if (until.stalenessOf(element).fn(VSBrowser.instance.driver)) {
			resolve();
		}
		else if (run) {
			setImmediate(doWork, resolve);
		}
	}

	return new TimeoutPromise<void>((resolve) => setImmediate(doWork, resolve), timeout).catch((e: Error) => {
		run = false;
		throw e;
	});
}

export async function closeEditor(title: string, timeout: number): Promise<void> {
	await VSBrowser.instance.driver.wait(async () => {
		let editor: EditorView;
		try {
			editor = new EditorView();
			await editor.closeEditor(title);
			return !(await editorExists(title, editor));
		}
		catch (e) {
			if (editor && !(await editorExists(title, editor))) {
				return true;
			}

			debug(`Could not close editor "${title}". Reason: ${e}.`, 'closeEditor');
			return false;
		}
	}, timeout);
}

export async function stopAtlasMap(timeout: number = 10000): Promise<void> {
	await stopAtlasMapCommand(timeout);
	await driverGetNotificationWithMessage(notifications.ATLASMAP_STOPPED, timeout);
}

export async function atlasMapTabIsAccessible() {
	return new EditorView().openEditor(views.ATLASMAP_TITLE);
}

export async function clearNotifications(timeout: number): Promise<void> {
	await VSBrowser.instance.driver.wait(async () => {
		try {
			const center = await new Workbench().openNotificationsCenter();

			if ((await center.getNotifications(NotificationType.Any)).length === 0) {
				return true;
			}
			else {
				await executeCommand(commands.CLEAR_NOTIFICATIONS, timeout);
				await DefaultWait.sleep(1000);
				return false;
			}
		}
		catch (e) {
			debug(e, 'clearNotifications');
			return false;
		}
	}, timeout, 'Could not clear notifications');
}

export async function promiseToBoolean<T>(promise: Promise<T>): Promise<boolean> {
	return promise.then(() => true).catch(() => false);
}
