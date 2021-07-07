import { ExTester, ReleaseQuality } from "vscode-extension-tester";
import * as path from "path";

const storageFolder = undefined;
const releaseQuality = ReleaseQuality.Stable;
const extensionsDir = path.resolve('.', 'test-extensions'); 
const codeVersion = undefined;
const testsGlob = 'out/ui-test/all.js';
const interval = 2000;

let devToolsActivePortAttemptsCount = 5;

async function runTests(tester: ExTester, resolve: Function, reject: Function): Promise<void> {
	try {
		process.exitCode = await tester.runTests(testsGlob);
		resolve(process.exitCode);
	} catch (error) {
		if (error.name === 'WebDriverError' && error.message.includes('unknown error: DevToolsActivePort file')) {
			if (devToolsActivePortAttemptsCount > 0) {
				setTimeout(runTests, interval, tester, resolve, reject);
				devToolsActivePortAttemptsCount--;
			}
			else {
				reject(error);
			}
		}
	}
}

async function main() {
	const tester = new ExTester(storageFolder, releaseQuality, extensionsDir);
	await tester.downloadCode(codeVersion);
	await tester.downloadChromeDriver(codeVersion);
	
	return await new Promise(async (resolve, reject) => {
		setImmediate(runTests, tester, resolve, reject);
	});
}

main();