"use strict";

import * as request from "request";

const keyString: string = "Starting AtlasMap instance at port ";

export function getWebUI(url: string) {
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

export function determineUsedPort(showInformationMessageSpy: sinon.SinonSpy): string {
	let port: string;
	for (var callIdx = 0; callIdx < showInformationMessageSpy.callCount; callIdx++) {
		let cal = showInformationMessageSpy.getCall(callIdx);
		for (var argIdx = 0; argIdx < cal.args.length; argIdx++) {
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