"use strict";

import * as chai from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as vscode from "vscode";
import { fail } from "assert";

const expect = chai.expect;
chai.use(sinonChai);

describe("AtlasMap/Commands", () => {

	let sandbox: sinon.SinonSandbox;
	let executeCommandSpy: sinon.SinonSpy;
	let showInformationMessageSpy: sinon.SinonSpy;
	const keyString: string = "Starting AtlasMap instance at port ";

	before(() => {
		sandbox = sinon.createSandbox();
		executeCommandSpy = sinon.spy(vscode.commands, "executeCommand");
		showInformationMessageSpy = sinon.spy(vscode.window, "showInformationMessage");
	});

	after(() => {
		executeCommandSpy.restore();
		showInformationMessageSpy.restore();
		sandbox.restore();
	});

	describe("Start", () => {
		it("test atlasmap launch and ui availability", async () => {
			await vscode.commands.executeCommand("atlasmap.start");
			
			expect(executeCommandSpy.calledOnce, "AtlasMap Start command has not been invoked").to.be.true;
			expect(executeCommandSpy.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;

			let repeatCount = 0;
			while (showInformationMessageSpy.callCount < 1 && repeatCount < 15) {
				await new Promise(resolve => setTimeout(resolve, 1000));
				repeatCount++;
			}

			expect(showInformationMessageSpy.callCount, "Startup Notification not displayed!").to.be.greaterThan(0);
			let port: string = determineUsedPort();

			expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
			expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;

			let url:string = "http://localhost:" + port;
			var request = require("request");
			await request.get(url, function (error: any, response: any, body: any) {
				if (!error && response && "404" !== response.statusCode) {
					// found the url resolvable - call the external browser
					console.log("found atlasmap ui running at port " + url);
				} else {
					// seems the url is not found - inform the user
					fail("AtlasMap UI not available at " + url);
				}
			});			
		});
	});

	function determineUsedPort(): string {
		let port: string;
		for (var callIdx=0; callIdx < showInformationMessageSpy.callCount; callIdx++) {
			let cal = showInformationMessageSpy.getCall(callIdx);
			for (var argIdx=0; argIdx < cal.args.length; argIdx++) {
				var arg = cal.args[argIdx];
				if (arg.startsWith(keyString)) {
					port = arg.substring(keyString.length);
					break;
				}
			}
			if (port !== undefined) {
				break;
			}
		}
		return port;
	}
});
