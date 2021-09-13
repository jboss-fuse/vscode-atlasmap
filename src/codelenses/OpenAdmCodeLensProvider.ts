/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License", destination); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as extension from './../extension';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export class OpenAdmCodeLensProvider implements vscode.CodeLensProvider {
	
	private static ATLASMAP_SCHEME_PREFIX_CAMEL3 = 'atlasmap:';
	private static ATLASMAP_SCHEME_PREFIX_CAMEL2 = 'atlas:';

	onDidChangeCodeLenses?: vscode.Event<void>;

	async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
		const fulltext = document.getText();
		let codeLenses: vscode.CodeLens[] = [];
		codeLenses = codeLenses.concat(await this.createCodelenses(fulltext, OpenAdmCodeLensProvider.ATLASMAP_SCHEME_PREFIX_CAMEL3, document));
		codeLenses = codeLenses.concat(await this.createCodelenses(fulltext, OpenAdmCodeLensProvider.ATLASMAP_SCHEME_PREFIX_CAMEL2, document));
		return codeLenses;
	}


	private async createCodelenses(fulltext: string, atlasmapSchemePrefix: string, document: vscode.TextDocument) {
		let codeLenses: vscode.CodeLens[] = [];
		if (fulltext.includes(atlasmapSchemePrefix)) {
			const lines: string[] = fulltext.split(/\n/);
			for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
				const line = lines[lineNumber];
				if (line.includes(atlasmapSchemePrefix)) {
					codeLenses = codeLenses.concat(await this.createCodelensesForLine(line, atlasmapSchemePrefix, document, lineNumber));
				}
			}
		}
		return codeLenses;
	}

	private async createCodelensesForLine(line: string, atlasmapSchemePrefix: string, document: vscode.TextDocument, lineNumber: number): Promise<vscode.CodeLens[]> {
		let codeLenses: vscode.CodeLens[] = [];
		const indexOfAtlasMap = line.indexOf(atlasmapSchemePrefix);
		const indexOfEndAtlasMapPrefix = indexOfAtlasMap + atlasmapSchemePrefix.length;
		const indexOfDotAdm = line.indexOf('.adm', indexOfEndAtlasMapPrefix);
		if (indexOfDotAdm !== -1) {
			let resourceUriParameterValue: string = getResourceUriParameterValue(line, indexOfEndAtlasMapPrefix, indexOfDotAdm);
			const siblingAdm = path.resolve(document.uri.fsPath, '..', resourceUriParameterValue);
			if (fs.existsSync(siblingAdm)) {
				const admUri = vscode.Uri.file(siblingAdm);
				const openAtlasMapCodeLens = this.createCodelens(lineNumber, indexOfAtlasMap, resourceUriParameterValue, admUri);
				codeLenses.push(openAtlasMapCodeLens);
			} else {
				const admFilesInWorkspace = await findSiblingAndInSrcMainResources(resourceUriParameterValue);
				if (admFilesInWorkspace.length === 1) {
					const openAtlasMapCodeLens = this.createCodelens(lineNumber, indexOfAtlasMap, resourceUriParameterValue, admFilesInWorkspace[0]);
					codeLenses.push(openAtlasMapCodeLens);
				} else {
					//TODO: if none, provide possibility to create and open, or maybe pick a file in the workspace or improve search algorithm ?
					//TODO: if several, improve search algorithm and/or ask user to pick which of the adm file need to be opened
				}
			}
		}
		return codeLenses;
	}

	private createCodelens(lineNumber: number, indexOfAtlasMap: number, resourceUriParameterValue: string, admUri: vscode.Uri) {
		const positionOfCodelens = new vscode.Range(lineNumber, indexOfAtlasMap, lineNumber, indexOfAtlasMap + resourceUriParameterValue.length);
		const openAtlasMapCommand: vscode.Command = {
			command: extension.COMMAND_ID_START_ATLASMAP,
			title: 'Open in AtlasMap UI',
			arguments: [admUri]
		};
		return new vscode.CodeLens(positionOfCodelens, openAtlasMapCommand);
	}
}

async function findSiblingAndInSrcMainResources(resourceUriParameterValue: string) {
	return vscode.workspace.findFiles(`{src/main/resources/${resourceUriParameterValue},${resourceUriParameterValue}}`, null, 2);
}

function getResourceUriParameterValue(line: string, indexOfEndAtlasMapPrefix: number, indexOfDotAdm: number) {
	let resourceUriParameterValue: string = line.substring(indexOfEndAtlasMapPrefix, indexOfDotAdm + '.adm'.length);
	if (resourceUriParameterValue.startsWith('classpath:')) {
		resourceUriParameterValue = resourceUriParameterValue.substring('classpath:'.length);
	}
	return resourceUriParameterValue;
}
