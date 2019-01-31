"use strict";

import * as chai from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as vscode from "vscode";
import { fail } from "assert";

const request = require("request");
const expect = chai.expect;
chai.use(sinonChai);

describe("AtlasMap/Commands", function() {

	let sandbox: sinon.SinonSandbox;
	let executeCommandSpy: sinon.SinonSpy;
	let showInformationMessageSpy: sinon.SinonSpy;
	let port: string;
	const keyString: string = "Starting AtlasMap instance at port ";

	before(async function() {
		sandbox = sinon.createSandbox();
		executeCommandSpy = sinon.spy(vscode.commands, "executeCommand");
		showInformationMessageSpy = sinon.spy(vscode.window, "showInformationMessage");
		await vscode.commands.executeCommand("atlasmap.start");
		await new Promise(resolve => setTimeout(resolve, 15000));
	});

	after(function() {
		executeCommandSpy.restore();
		showInformationMessageSpy.restore();
		sandbox.restore();
	});

	describe("Start AtlasMap Command Tests", function() {
	
		it("test command execution", function() {
			// atlasmap has been started in the setup of the test suite already - just check the call count and determine the port
			expect(executeCommandSpy.withArgs("atlasmap.start").calledOnce, "AtlasMap start command was not issued").to.be.true;
			port = determineUsedPort();
			expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
			expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;
		});

		it("test multiple instances startup prevention", async function() {
			expect(port, "Port is not set by previously running test").to.not.be.undefined;
			expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;

			await vscode.commands.executeCommand("atlasmap.start");

			expect(executeCommandSpy.withArgs("atlasmap.start").callCount, "AtlasMap start command was not issued").to.be.greaterThan(1);
			expect(showInformationMessageSpy.getCalls()[showInformationMessageSpy.callCount-1].args[0], "No detection message for running instance found!").to.equal("Running AtlasMap instance found at port " + port);

			await vscode.commands.executeCommand("atlasmap.start");

			expect(executeCommandSpy.withArgs("atlasmap.start").callCount, "AtlasMap start command was not issued").to.be.greaterThan(2);
			expect(showInformationMessageSpy.getCalls()[showInformationMessageSpy.callCount-1].args[0], "No detection message for running instance found!").to.equal("Running AtlasMap instance found at port " + port);
		});

		it("test ui availability", function() {
			expect(port, "Unable to determine used port for AtlasMap server").to.not.be.undefined;
			expect(port, "Port for AtlasMap server seems to be NaN").to.not.be.NaN;

			let url:string = "http://localhost:" + port;
			getWebUI(url)
				.then( (body) => {
					expect(body, "Undefined html response body").to.not.be.undefined;
					expect(body, "Null html response body").to.not.be.null;
				})
				.catch( (err) => {
					fail("Unable to access the web UI due to " + err);
				});
		});

		function getWebUI(url: string) {
			return new Promise((resolve, reject) => {
				request(url, (error: any, response: any, body: any) => {
					if (error) reject(error);
					if (response.statusCode != 200) {
						reject('Invalid status code <' + response.statusCode + '>');
					}
					resolve(body);
				});
			});
		}

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
});
