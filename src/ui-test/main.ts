import { ExTester, ReleaseQuality } from "vscode-extension-tester";
import * as path from "path";

const storageFolder = path.resolve('..', 'test-resources');
const releaseQuality = ReleaseQuality.Stable;
const extensionsDir = path.resolve('.', 'test-extensions'); 
const codeVersion = undefined;
const testsGlob = 'out/ui-test/all.js';

let devToolsActivePortAttemptsCount = 5;

async function runTests(tester: ExTester): Promise<void> {
	process.exitCode = await tester.runTests(testsGlob);
}

async function main() {
	const tester = new ExTester(storageFolder, releaseQuality, extensionsDir);
	await tester.downloadCode(codeVersion);
	await tester.downloadChromeDriver(codeVersion);
	return await runTests(tester);
}

main();