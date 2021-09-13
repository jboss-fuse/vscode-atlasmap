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
'use strict';

import { assert, expect } from "chai";
import * as extension from '../../extension';
import * as vscode from 'vscode';
import path = require("path");

describe("Open AtlasMap in UI CodeLenses Test", function () {

	it("Codelens provider returns correct CodeLens for basic case", async () => {
		const doc = getDocUri('basic-case.xml');
		await vscode.workspace.openTextDocument(doc);

		await checkCodelensForOpenedDocument(doc, getDocUri('fake-basic-case.adm'));
	});

	it("Codelens provider returns correct CodeLens with 'classpath' prefix", async () => {
		const doc = getDocUri('classpath-prefix.xml');
		await vscode.workspace.openTextDocument(doc);

		await checkCodelensForOpenedDocument(doc, getDocUri('fake-classpath-prefix.adm'));
	});

	it("No codelenses for unknown adm file", async () => {
		const docUriJava = getDocUri('unknown-adm.xml');
		await vscode.window.showTextDocument(docUriJava);

		const codeLenses = await retrieveCodeLensOnOpenedDocument(docUriJava);

		assert.isNotNull(codeLenses);
		expect(codeLenses).has.length(0);
	});

	it("Codelens provider returns correct CodeLens with 'src/main/resources' implied", async () => {
		const docUriJava = getDocUri('src/main/java/MyRouteBuilder.java');
		await vscode.window.showTextDocument(docUriJava);

		await checkCodelensForOpenedDocument(docUriJava, getDocUri('src/main/resources/fake-in-src-main-resources.adm'));
	});
	
	it("Codelens provider returns several Codelenses for multiple atlasmap component mentioned", async () => {
		const docUri = getDocUri('multiple.xml');
		await vscode.window.showTextDocument(docUri);

		const codeLenses: vscode.CodeLens[] | undefined = await retrieveCodeLensOnOpenedDocument(docUri);
		expect(codeLenses).has.length(2);
	});
	
	it("Codelens provider returns Codelens for Camel 2.x notation", async () => {
		const docUriJava = getDocUri('atlasmap-2.x.xml');
		await vscode.window.showTextDocument(docUriJava);

		await checkCodelensForOpenedDocument(docUriJava, getDocUri('fake-camel-2.x.adm'));
	});

});

export async function checkCodelensForOpenedDocument(uri: vscode.Uri, expectedAdmUri: vscode.Uri) {
	const codeLenses: vscode.CodeLens[] | undefined = await retrieveCodeLensOnOpenedDocument(uri);
	checkCodeLens(codeLenses, expectedAdmUri);
}

async function retrieveCodeLensOnOpenedDocument(uri: vscode.Uri): Promise<vscode.CodeLens[] | undefined> {
	return vscode.commands.executeCommand('vscode.executeCodeLensProvider', uri);
}

function checkCodeLens(codeLenses: vscode.CodeLens[], expectedAdmUri: vscode.Uri) {
	const startIntegrationCodeLenses = codeLenses.filter(codelens => {
		return codelens.command?.command === extension.COMMAND_ID_START_ATLASMAP;
	});
	expect(startIntegrationCodeLenses).has.length(1);
	const codeLens: vscode.CodeLens = startIntegrationCodeLenses[0];
	expect(codeLens.isResolved).to.be.true;
	expect((codeLens.command?.arguments[0] as vscode.Uri).fsPath).equal(expectedAdmUri.fsPath);
}

function getDocPath(p: string): string {
	return path.resolve(__dirname, '../../../test Fixture with speci@l chars', p);
}

function getDocUri(p: string): vscode.Uri {
	return vscode.Uri.file(getDocPath(p));
}
