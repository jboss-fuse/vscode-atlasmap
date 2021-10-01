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
import * as path from 'path';
import * as vscode from 'vscode';
import { AtlasMapDocument } from './AtlasMapDocument';
import * as AtlasMapWebViewUtil from './../AtlasMapWebViewUtil';

import download = require('download');

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
		console.log('saveCustomDocument');
		const externalUrl = await AtlasMapWebViewUtil.getAtlasMapExternalURI(document.associatedPort);
		await vscode.workspace.fs.writeFile(document.uri, await download(`${externalUrl}v2/atlas/mapping/ZIP`));
	}
	
	async saveCustomDocumentAs(document: AtlasMapDocument, destination: vscode.Uri, cancellation: vscode.CancellationToken): Promise<void> {
		throw new Error('Save as on AtlasMap Editor has not been implemented.');
	}
	
	revertCustomDocument(document: AtlasMapDocument, cancellation: vscode.CancellationToken): Thenable<void> {
		throw new Error('Revert on AtlasMap Editor has not been implemented.');
	}
	
	backupCustomDocument(document: AtlasMapDocument, context: vscode.CustomDocumentBackupContext, cancellation: vscode.CancellationToken): Thenable<vscode.CustomDocumentBackup> {
		throw new Error('Backup on AtlasMap Editor has not been implemented.');
	}
	
	openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, token: vscode.CancellationToken): AtlasMapDocument | Thenable<AtlasMapDocument> {
		console.log('Open custom document');
		return new AtlasMapDocument(uri);
	}
	
	async resolveCustomEditor(document: AtlasMapDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): Promise<void> {
		webviewPanel.webview.options = {
			enableScripts: true
		};
		const atlasmapExecutablePath = this.context.asAbsolutePath(path.join('jars','atlasmap-standalone.jar'));
		console.log('will launch atlasmap for the editor');
		await extension.launchAtlasMapLocally(
			this.context,
			atlasmapExecutablePath,
			document.uri.fsPath,
			webviewPanel,
			this.onDidChangeCustomDocumentEventEmitter,
			document);
	}
	
}
