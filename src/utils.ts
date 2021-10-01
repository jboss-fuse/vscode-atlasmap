"use strict";

import * as vscode from 'vscode';

export enum BrowserType {
	Internal = "Internal",
	External = "External (Default OS Browser)"
}

export const BROWSERTYPE_PREFERENCE_KEY = "atlasmap.openInBrowser";
export const ATLASMAP_WS_FOLDER_FALLBACK = ".atlasmapdata";

function getViewPreference(): string {
	let config = vscode.workspace.getConfiguration();
	let openUrlPref:string = config.get(BROWSERTYPE_PREFERENCE_KEY);
	return openUrlPref;
}

export function isUsingInternalView(): boolean {	
	return getViewPreference() === BrowserType.Internal;
}