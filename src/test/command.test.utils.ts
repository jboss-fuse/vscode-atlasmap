"use strict";

import * as chai from "chai";
import * as download from "download";
import * as fileUrl from "file-url";
import * as fs from "fs";
import { DEFAULT_ATLASMAP_PORT, BrowserType, BROWSERTYPE_PREFERENCE_KEY } from '../utils';
import { isString } from "util";
import * as request from "request";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as vscode from "vscode";
import AtlasMapPanel from '../atlasMapWebView';
import * as extension from '../extension';

const uri2path = require('file-uri-to-path');

const expect = chai.expect;
chai.use(sinonChai);

const MAX_WAIT = 10000;
const STEP = 1000;
const KEYSTRING: string = "Starting AtlasMap instance at port ";

export const BROWSER_TYPES = [BrowserType.Internal, BrowserType.External];

export function getWebUI(url: string): Promise<string> {
	return new Promise((resolve, reject) => {
		request(url, (error: any, response: any, body: any) => {
			if (error) reject(error);
			if (!response || response.statusCode != 200) {
				reject('Invalid response');
			} else {
				resolve(body);
			}
		});
	});
}

export function determineUsedPort(spy: sinon.SinonSpy): string {
	if (spy && spy.getCalls()) {
		for (let call of spy.getCalls()) {
			if (!call || !call.args) continue;
			for (let arg of call.args) {
				if (arg && isString(arg) && arg.startsWith(KEYSTRING)) {
					return arg.substring(KEYSTRING.length);
				}
			}
		}
	}
	return undefined;
}

export function startAtlasMapInstance(infoSpy: sinon.SinonSpy, spawnSpy: sinon.SinonSpy, context: any = undefined): Promise<string> {
	return new Promise<string>(async (resolve, reject) => {
		
		await vscode.commands.executeCommand("atlasmap.start", context);
		
		let waitTime = 0;
		let _port = determineUsedPort(infoSpy);
		while (_port === undefined && waitTime < MAX_WAIT) {
			await waitForTask("WaitForPortNumber")
			.then( () => {
				_port = determineUsedPort(infoSpy);
				waitTime += STEP;
			});				
		}		
		
		expect(_port, "Seems we can't determine the used port number").to.not.be.null;
		expect(_port, "Seems we can't determine the used port number").to.not.be.undefined;
		expect(_port, "Seems we can't determine the used port number").to.not.be.NaN;
		
		const url:string = "http://localhost:" + _port;
		let called = hasStringInSpy(url, spawnSpy);
		waitTime = 0;
		while(!called && waitTime < MAX_WAIT) {
			await waitForTask("OpenBrowser")
				.then( () => {
					called = hasStringInSpy(url, spawnSpy);
					waitTime += STEP;
				});
		}
		// wait a bit for the web ui  to be ready - not nice but works fine
		await new Promise(res => setTimeout(res, 3000));

		await getWebUI(url)
			.then( body => {
				expect(body, "Unexpected html response body").to.contain("AtlasMap");
				resolve(_port);
			})
			.catch( err => {
				reject(err);
			});
	});
}

export function stopAtlasMapInstance(_port: string = DEFAULT_ATLASMAP_PORT, infoSpy: sinon.SinonSpy): Promise<boolean> {
	return new Promise<boolean>( async (resolve, reject) => {
		//await all requests sent by AtlasMap are received by the server how to do it in a smarter way??
		await new Promise(res => setTimeout(res, 3000));

		await vscode.commands.executeCommand("atlasmap.stop");
		let waitTime = 0;
		while (!hasStopMessageInInfoMessage(infoSpy) && waitTime < MAX_WAIT) {
			await waitForTask("AtlasMapShutdown")
				.then( () => {
					waitTime += STEP;
				});
		}
		if(waitTime >= MAX_WAIT) {
			Promise.reject(new Error('AtlasMap instance not shutdowned in '+ MAX_WAIT + 'ms'));
		}
		// wait a bit for the port to be really free - not nice but works fine
		await new Promise(res => setTimeout(res, 3000));
		resolve(waitTime < MAX_WAIT);
	});
}

export async function waitForTask(taskName: string = "<unknownTasK>") {
	// console.log("Waiting for task [" + taskName + "] to complete...");
	await new Promise(resolve => setTimeout(resolve, STEP));
}

export function hasStopMessageInInfoMessage(infoSpy: sinon.SinonSpy): boolean {
	return hasStringInSpy("Stopped AtlasMap instance at port ", infoSpy);
}

export function hasStringInSpy(searchString: string, spy: sinon.SinonSpy): boolean {
	if (searchString && spy && spy.getCalls()) {
		for (let call of spy.getCalls()) {
			if (!call || !call.args) continue;
			for (let arg of call.args) {
				if (arg) {
					if (Array.isArray(arg)) {
						for (let v of arg) {
							if (v && v.indexOf(searchString) >= 0) {
								return true;
							}
						}
					} else if (isString(arg)) {
						if (arg.indexOf(searchString) >= 0) {
							return true;
						}
					}
				}				
			}
		}
	}	
	return false;
}

export function switchSettingsToType(browserConfig: string) {
	let config = vscode.workspace.getConfiguration();
	const setAsGlobal = config.inspect(BROWSERTYPE_PREFERENCE_KEY).workspaceValue == undefined;
	config.update(BROWSERTYPE_PREFERENCE_KEY, browserConfig, setAsGlobal);
}

export function isInternalWebViewClosed(): boolean {
	return AtlasMapPanel.currentPanel === undefined;
}

export function createExecuteCommandStubFakingExternalOpenBrowserCall() {
	let executeCommandStub: sinon.SinonStub = sinon.stub(vscode.commands, "executeCommand");
	executeCommandStub
		.withArgs('vscode.open', sinon.match.has('authority', sinon.match('localhost:')))
		.callsFake((arg0, arg1) => {
			console.log("vscode.open called, it is stubbed with a no-op to avoid frozen Travis. It was called with arguments: " + arg0 + " " + arg1);
		});
	executeCommandStub.callThrough();
	return executeCommandStub;
}

export async function downloadTestADM() {
	let f = "./mockdocfhir.adm";
	return await download(generateGithubDownloadUrl())
		.then( data => {
			fs.writeFileSync(f, data);
			return uri2path(fileUrl(f));
		})
		.catch( err => {
			return undefined;
		});
}

export function generateGithubDownloadUrl(): string {
	let tagName: string = generateGitHubTagName();
	let url: string = "https://github.com/atlasmap/atlasmap/raw/" + tagName + "/ui/test-resources/adm/mockdocfhir.adm";
	return url;
}

function generateGitHubTagName(): string {
	return "atlasmap-" + determineAtlasMapVersion();
}

function determineAtlasMapVersion(): string {
	let atlasmapVersion: string = process.env.npm_package_config_atlasmapversion;
	if (!atlasmapVersion) {
		let pjson = require('../../package.json');
		atlasmapVersion = pjson.config.atlasmapversion;
	}
	return atlasmapVersion;
}

export function createBrokenADM() {
	let f = "./mockdoccorrupted.adm";
	try {
		fs.writeFileSync(f, "someBrokenADMContent");
	} catch ( err ) {
		return undefined;	
	}
	return uri2path(fileUrl(f));
}
