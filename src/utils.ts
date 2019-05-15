"use strict";

import * as detect from 'detect-port';
import * as vscode from 'vscode';

export const DEFAULT_ATLASMAP_PORT = "8585";

export enum BrowserType {
	Internal = "Internal",
	External = "External (Default OS Browser)"
}

export const BROWSERTYPE_PREFERENCE_KEY = "atlasmap.openInBrowser";
export const ATLASMAP_WS_FOLDER_PREFERENCE_KEY = "atlasmap.defaultWorkspace";
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

export function getAtlasMapWorkingFolder(): string {
	let config = vscode.workspace.getConfiguration();
	let atlasMapWSFolderName:string = config.get(ATLASMAP_WS_FOLDER_PREFERENCE_KEY);
	if (!atlasMapWSFolderName) {
		atlasMapWSFolderName = ATLASMAP_WS_FOLDER_FALLBACK;
	}
	return vscode.workspace.rootPath + "/" + atlasMapWSFolderName;
}

export function isUsingInternalView(): boolean {	
	return getViewPreference() === BrowserType.Internal;
}