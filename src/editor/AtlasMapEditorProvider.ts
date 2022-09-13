/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as extension from '../extension';
import fetch from 'node-fetch';
import * as path from 'path';
import * as vscode from 'vscode';
import { AtlasMapDocument } from './AtlasMapDocument';
import * as AtlasMapWebViewUtil from './AtlasMapWebViewUtil';

export class AtlasMapEditorProvider implements vscode.CustomEditorProvider<AtlasMapDocument> {
	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		const provider = new AtlasMapEditorProvider(context);
		return vscode.window.registerCustomEditorProvider(AtlasMapEditorProvider.viewType, provider);
	}
	
	private static readonly viewType = 'atlasmap.editor';
	
	constructor(
		private readonly context: vscode.ExtensionContext
	) { }
	
	public readonly onDidChangeCustomDocumentEventEmitter = new vscode.EventEmitter<vscode.CustomDocumentContentChangeEvent<AtlasMapDocument>>();
	public readonly onDidChangeCustomDocument = this.onDidChangeCustomDocumentEventEmitter.event;
	
	async saveCustomDocument(document: AtlasMapDocument, cancellation: vscode.CancellationToken): Promise<void> {
		await this.saveCustomDocumentAs(document, document.uri, cancellation);
	}
	
	async saveCustomDocumentAs(document: AtlasMapDocument, destination: vscode.Uri, cancellation: vscode.CancellationToken): Promise<void> {
		const externalUrl = await AtlasMapWebViewUtil.getAtlasMapExternalURI(document.associatedPort);
		const response = await fetch(`${externalUrl}v2/atlas/mapping/ZIP`);
		const buffer = await response.arrayBuffer();
		await vscode.workspace.fs.writeFile(destination, new Uint8Array(buffer));
	}
	
	revertCustomDocument(document: AtlasMapDocument, cancellation: vscode.CancellationToken): Thenable<void> {
		throw new Error('Revert on AtlasMap Editor has not been implemented.');
	}
	
	backupCustomDocument(document: AtlasMapDocument, context: vscode.CustomDocumentBackupContext, cancellation: vscode.CancellationToken): Thenable<vscode.CustomDocumentBackup> {
		throw new Error('Backup on AtlasMap Editor has not been implemented.');
	}
	
	openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, token: vscode.CancellationToken): AtlasMapDocument | Thenable<AtlasMapDocument> {
		return new AtlasMapDocument(uri);
	}
	
	async resolveCustomEditor(document: AtlasMapDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): Promise<void> {
		webviewPanel.webview.options = {
			enableScripts: true
		};
		const atlasmapExecutablePath = this.context.asAbsolutePath(path.join('jars','atlasmap-standalone.jar'));
		await extension.launchAtlasMapLocally(
			atlasmapExecutablePath,
			webviewPanel,
			this.onDidChangeCustomDocumentEventEmitter,
			document);
	}
	
}
