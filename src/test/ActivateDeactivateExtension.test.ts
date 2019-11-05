import * as chai from "chai";
import * as extension from "../extension";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as testUtils from "./command.test.utils";
import * as vscode from "vscode";

const expect = chai.expect;
chai.use(sinonChai);

describe("Ensure Atlasmap shutdowned on extension deactivation", function () {

	let sandbox: sinon.SinonSandbox;
	let showInformationMessageSpy: sinon.SinonSpy;

	beforeEach(function () {
		sandbox = sinon.createSandbox();
		showInformationMessageSpy = sinon.spy(vscode.window, "showInformationMessage");
	});

	afterEach(function () {
		showInformationMessageSpy.restore();
		sandbox.restore();
		vscode.extensions.getExtension('redhat.atlasmap-viewer').activate();
	});

	it("Test started instance stopped on deactivation", function (done) {
		testUtils.startAtlasMapInstance(showInformationMessageSpy).then(() => {
			let atlasMapProcess = extension.atlasMapProcess;
			expect(atlasMapProcess.killed).to.be.false;
			extension.deactivate(null);
			expect(atlasMapProcess.killed).to.be.true;
			done();
		}).catch((error) => {
			done(error);
		}).finally(() => {
			testUtils.stopAtlasMapInstance(extension.atlasMapLaunchPort, showInformationMessageSpy);
		});
	});

	it("Test deactivate doesn't cause trouble when no AtlasMap instance launched", function (done) {
		extension.deactivate(null);
		done();
	});
});