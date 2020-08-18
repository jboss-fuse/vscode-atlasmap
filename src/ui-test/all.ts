import { basicTests } from './basic-test';
import { InputBox, VSBrowser, Workbench } from 'vscode-extension-tester';
import { isHidden } from './common/utils';

describe('AtlasMap UI tests', function () {

	before(async function () {
		this.timeout(32000);
		// create input widget in DOM
		await VSBrowser.instance.waitForWorkbench();
		const workbench = new Workbench();
		const input = await workbench.openCommandPrompt() as InputBox;
		await input.cancel();
		await VSBrowser.instance.driver.wait(() => isHidden(input), 16000);
	});

	basicTests();
});
