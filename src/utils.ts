"use strict";

import * as detect from 'detect-port';
import * as vscode from 'vscode';

export const DEFAULT_ATLASMAP_PORT = "8585";

export enum BrowserType {
	Internal = "Internal",
	External = "External (Default OS Browser)"
}

export const BROWSERTYPE_PREFERENCE_KEY = "atlasmap.openInBrowser";
export const ATLASMAP_WS_FOLDER_FALLBACK = ".atlasmapdata";

export function retrieveFreeLocalPort(): Promise<string> {
	return new Promise((resolve, reject) => {
		detect(DEFAULT_ATLASMAP_PORT)
			.then(_port => {
				resolve("" + _port);
			})
			.catch(err => {
				reject(err);
			});
	});
}

function getViewPreference(): string {
	let config = vscode.workspace.getConfiguration();
	let openUrlPref:string = config.get(BROWSERTYPE_PREFERENCE_KEY);
	return openUrlPref;
}

export function isUsingInternalView(): boolean {	
	return getViewPreference() === BrowserType.Internal;
}