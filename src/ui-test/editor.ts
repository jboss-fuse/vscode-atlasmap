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
import { VSBrowser, WebDriver, EditorView, WebView, By, CustomEditor, until, Workbench, InputBox } from 'vscode-extension-tester';
import { assert, expect } from 'chai';
import path = require('path');


export function editorTests() {
	let driver: WebDriver;

	describe('AtlasMap in Editor tests', () => {
		
		beforeEach(async () => {
			const editorView = new EditorView();
			await editorView.closeAllEditors();
			driver = VSBrowser.instance.driver;
		});

		it('Save as', async function () {
			this.timeout(90000);
			const workspaceFolder = path.join(__dirname, '../../test Fixture with speci@l chars');
			await VSBrowser.instance.openResources(workspaceFolder);
			await new EditorView().closeAllEditors();
			await openAdmFile(workspaceFolder, 'atlasmap-mapping.adm', driver);
			await new Workbench().executeCommand('file: save as');
			const inputbox = new InputBox();
			const newName = 'atlasmap-mapping-savedas.adm';
			await inputbox.setText(path.join(workspaceFolder, newName));
			await inputbox.confirm();
			
			await new EditorView().openEditor(newName);
			expect(await new EditorView().getOpenEditorTitles()).to.have.lengthOf(1);
			
			const atlasMapWebView = await retrieveWebview(driver);
			const atlasMapEditor = await retrieveAtlasMapEditor(driver, atlasMapWebView);
			
			await addConstantInAtlasMap(driver, atlasMapWebView);
			
			await atlasMapWebView.switchBack();
			await driver.wait(async () => {
			 	return atlasMapEditor.isDirty();
			}, 5000, 'The editor is expected to be dirty but is not.');
			console.log('will call save - currently not working because the events are swallowed by AtlasMap, see https://github.com/atlasmap/atlasmap/issues/3404');
			await atlasMapEditor.save();
			console.log('save called');
			assert.isFalse(await atlasMapEditor.isDirty(), 'The editor is expected to be no more dirty after save but it is still dirty.');
			await new EditorView().closeEditor(newName);
		});
		
		it('Open and close .adm in AtlasMap Editor', async function () {
			this.timeout(90000);
			const workspaceFolder = path.join(__dirname, '../../test Fixture with speci@l chars');
			await VSBrowser.instance.openResources(workspaceFolder);
			const admFileName = 'atlasmap-mapping.adm';
			const atlasMapWebView = await openAdmFile(workspaceFolder, admFileName, driver);
			const atlasMapEditor = await retrieveAtlasMapEditor(driver, atlasMapWebView);
			
			await addConstantInAtlasMap(driver, atlasMapWebView);
			
			await atlasMapWebView.switchBack();
			await driver.wait(async () => {
			 	return atlasMapEditor.isDirty();
			}, 5000, 'The editor is expected to be dirty but is not.');
			console.log('will call save - currently not working because the events are swallowed by AtlasMap, see https://github.com/atlasmap/atlasmap/issues/3404');
			await atlasMapEditor.save();
			console.log('save called');
			assert.isFalse(await atlasMapEditor.isDirty(), 'The editor is expected to be no more dirty after save but it is still dirty.');
			await new EditorView().closeEditor(admFileName);
			// TODO: would be nice to check that the AtlasMap server has been stopped
		});
		
		it('Open several .adms in AtlasMap Editor', async function () {
			this.timeout(90000);
			const workspaceFolder = path.join(__dirname, '../../test Fixture with speci@l chars');
			await VSBrowser.instance.openResources(workspaceFolder);
			await openAdmFile(workspaceFolder, 'atlasmap-mapping.adm', driver);
			await openAdmFile(workspaceFolder, 'atlasmap-mapping2.adm', driver);
		});
		
		it('Open editor using codelens', async function () {
			this.timeout(90000);
			const workspaceFolder = path.join(__dirname, '../../test Fixture with speci@l chars');
			await VSBrowser.instance.openResources(workspaceFolder);
			const camelRouteFilename = 'basic-case.xml';
			await VSBrowser.instance.openResources(path.join(workspaceFolder, 'editor-test', camelRouteFilename));
			const xmlEditor = await new EditorView().openEditor(camelRouteFilename);
			// TODO: use a page object to click on Codelens https://github.com/redhat-developer/vscode-extension-tester/issues/365
			const codelens = await xmlEditor.findElement(By.xpath("//a[text()='Open in AtlasMap UI']"));
			await codelens.click();
			
			await new EditorView().openEditor('atlasmap-mapping.adm');
		});
	});
}

async function retrieveAtlasMapEditor(driver: WebDriver, atlasMapWebView: WebView) {
	const atlasMapEditor = new CustomEditor();
	assert.isFalse(await atlasMapEditor.isDirty(), 'The editor is expected to not be dirty on first open but it is dirty.');
	await switchToAtlasmapFrame(driver, atlasMapWebView);
	await driver.wait(until.elementLocated(By.xpath("//title[text()='AtlasMap Data Mapper UI']")));
	return atlasMapEditor;
}

async function openAdmFile(workspaceFolder: string, admFileName: string, driver: WebDriver) {
	await VSBrowser.instance.openResources(path.join(workspaceFolder, admFileName));
	await new EditorView().openEditor(admFileName);
	return retrieveWebview(driver);
}

async function retrieveWebview(driver: WebDriver) {
	const atlasMapWebView = new WebView();
	await switchToAtlasmapFrame(driver, atlasMapWebView);
	await atlasMapWebView.switchBack();
	return atlasMapWebView;
}

async function addConstantInAtlasMap(driver: WebDriver, atlasMapWebView: WebView) {
	const createConstantButton = await driver.wait(until.elementLocated(By.xpath("//button[@data-testid='create-constant-button']")), 10000);
	await createConstantButton.click();
	const inputConstantName = await atlasMapWebView.findWebElement(By.xpath("//input[@data-testid='constant-name-text-input']"));
	await inputConstantName.sendKeys('name-test');
	const inputConstantValue = await atlasMapWebView.findWebElement(By.xpath("//input[@data-testid='constant-value-text-input']"));
	await inputConstantValue.sendKeys('name-value');
	const confirmConstantButton = await atlasMapWebView.findWebElement(By.xpath("//button[@data-testid='confirmation-dialog-confirm-button']"));
	await driver.wait(until.elementIsEnabled(confirmConstantButton));
	await confirmConstantButton.click();
}

async function switchToAtlasmapFrame(driver: WebDriver, atlasMapWebView: WebView) {
	await driver.wait(async () => {
		try {
			await atlasMapWebView.switchToFrame();
			return true;
		} catch {
			return false;
		}
	});
}
