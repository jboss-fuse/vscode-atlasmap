import * as chai from "chai";
import * as extension from "../extension";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as testUtils from "./command.test.utils";
import * as vscode from "vscode";
import { fail } from "assert";

const expect = chai.expect;
chai.use(sinonChai);

describe("Ensure Atlasmap is shut down upon extension deactivation", function () {

	let sandbox: sinon.SinonSandbox;
	let showInformationMessageSpy: sinon.SinonSpy;

	beforeEach(function () {
		sandbox = sinon.createSandbox();
		showInformationMessageSpy = sinon.spy(vscode.window, "showInformationMessage");
	});

	afterEach( async () => {
		showInformationMessageSpy.restore();
		sandbox.restore();
		await vscode.extensions.getExtension('redhat.atlasmap-viewer').activate();
	});

	it("Test that the running instance is stopped on deactivation", async () => {
		try {
			await testUtils.startAtlasMapInstance(showInformationMessageSpy);
			const atlasMapProcess = extension.atlasMapProcess;
			expect(atlasMapProcess.killed).to.be.false;
			await extension.deactivate(null);
			expect(atlasMapProcess.killed).to.be.true;
		} catch (error) {
			fail(error);
		} finally {
			testUtils.stopAtlasMapInstance(extension.atlasMapLaunchPort, showInformationMessageSpy);
		}
	});

	it("Test deactivate doesn't cause trouble when no AtlasMap instance launched", async () => {
		await extension.deactivate(null);
	});
});