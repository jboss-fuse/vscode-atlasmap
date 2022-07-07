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
import { VSBrowser, WebDriver, EditorView, Workbench, InputBox } from 'vscode-extension-tester';
import { expect } from 'chai';
import path = require('path');
import { retrieveWebview, retrieveAtlasMapEditor, handleDirtyEditor, waitForAtlasMapEditorOpening } from './AtlasMapEditorUtils';

export function commandCreationTests() {
	let driver: WebDriver;

	describe('Create new adm file from command tests', () => {

		const workspaceFolder = path.join(__dirname, '../../test Fixture with speci@l chars');

		before(async function () {
			this.timeout(20000);
			driver = VSBrowser.instance.driver;
			await VSBrowser.instance.openResources(workspaceFolder);
		});

		beforeEach(async function () {
			this.timeout(10000);
			console.log('Start of preparing test');
			const editorView = new EditorView();
			await editorView.closeAllEditors();
			console.log('End of preparing test');
		});

		it.only('Create Adm file', async function () {
			this.timeout(180000);
			await new Workbench().executeCommand('AtlasMap: Create AtlasMap file');
			const inputbox = new InputBox();
			console.log('before pick');
			await driver.sleep(1000);
			await inputbox.selectQuickPick(0);
			console.log('after pick');
			await inputbox.setText('admFileCreatedFromCommandInTest');
			console.log('after settext');
			await inputbox.confirm();
			console.log('after confirm');
			await waitForAtlasMapEditorOpening();
			await handleDirtyEditor();

			expect(await new EditorView().getOpenEditorTitles()).to.have.lengthOf(1);

			const atlasMapWebView = await retrieveWebview(driver);
			
			console.log('webview retrieved');
			let atlasMapEditor = await retrieveAtlasMapEditor(driver, atlasMapWebView);
			
			console.log('title'+ await atlasMapEditor.getTitle());
			
			await new EditorView().closeEditor(await atlasMapEditor.getTitle());
		});

	});
}
