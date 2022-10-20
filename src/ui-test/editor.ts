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
import { VSBrowser, WebDriver, EditorView, WebView, By, CustomEditor, until, Workbench, InputBox, TextEditor, NotificationType } from 'vscode-extension-tester';
import { assert, expect } from 'chai';
import path = require('path');
import { defaultWorkspaceFolderUsedInTests } from './all';

export function editorTests() {
	let driver: WebDriver;

	describe('AtlasMap in Editor tests', () => {

		before(async function () {
			this.timeout(20000);
			driver = VSBrowser.instance.driver;
			await VSBrowser.instance.openResources(defaultWorkspaceFolderUsedInTests);
		});

		beforeEach(async function () {
			this.timeout(10000);
			console.log('Start of preparing test');
			const editorView = new EditorView();
			await editorView.closeAllEditors();
			console.log('End of preparing test');
		});
		
		it('Save as', async function () {
			this.timeout(180000);
			await openAdmFile(defaultWorkspaceFolderUsedInTests, 'atlasmap-mapping.adm', driver);
			console.log('Opened editors: '+ (await new EditorView().getOpenEditorTitles()).join(', '));
			await new Workbench().executeCommand('file: save as');
			const inputbox = new InputBox();
			const newName = 'atlasmap-mapping-savedas.adm';
			await inputbox.setText(path.join(defaultWorkspaceFolderUsedInTests, newName));
			await inputbox.confirm();
			await waitForAtlasMapEditorOpening();
			await handleDirtyEditor();

			expect(await new EditorView().getOpenEditorTitles()).to.have.lengthOf(1);

			const atlasMapWebView = await retrieveWebview(driver);
			let atlasMapEditor = await retrieveAtlasMapEditor(driver, atlasMapWebView);
			
			await addConstantInAtlasMap(driver, atlasMapWebView);
			console.log('will switch back');
			await atlasMapWebView.switchBack();
			console.log('switched back');
			await driver.wait(async () => {
					atlasMapEditor = new CustomEditor();
					return await atlasMapEditor.isDirty();
				}, 20000, 'The editor is expected to be dirty but is not.');
			console.log('editor is dirty');
			await atlasMapEditor.save();
			console.log('editor saved');
			await driver.wait(async () => {
					return !await atlasMapEditor.isDirty();
				}, 20000, 'The editor is expected to be no more dirty after save but it is still dirty.');
			await new EditorView().closeEditor(newName);
		});
		
		it('Open and close .adm in AtlasMap Editor', async function () {
			this.timeout(120000);
			const admFileName = 'atlasmap-mapping.adm';
			const atlasMapWebView = await openAdmFile(defaultWorkspaceFolderUsedInTests, admFileName, driver);
			const atlasMapEditor = await retrieveAtlasMapEditor(driver, atlasMapWebView);
			
			await addConstantInAtlasMap(driver, atlasMapWebView);
			await atlasMapWebView.switchBack();
			await driver.wait(async () => {
				return atlasMapEditor.isDirty();
			}, 5000, 'The editor is expected to be dirty but is not.');
			await atlasMapEditor.save();
			await driver.wait(async () => {
				return !await atlasMapEditor.isDirty();
			}, 20000, 'The editor is expected to be no more dirty after save but it is still dirty.');
			await new EditorView().closeEditor(admFileName);
		});
		
		it('Open several .adms in AtlasMap Editor', async function () {
			this.timeout(120000);
			await openAdmFile(defaultWorkspaceFolderUsedInTests, 'atlasmap-mapping.adm', driver);
			await openAdmFile(defaultWorkspaceFolderUsedInTests, 'atlasmap-mapping2.adm', driver);
		});
		
		it('Open editor using codelens', async function () {
			this.timeout(120000);
			const camelRouteFilename = 'basic-case.xml';
			await VSBrowser.instance.openResources(path.join(defaultWorkspaceFolderUsedInTests, 'editor-test', camelRouteFilename));
			await waitForAtlasMapEditorOpening();
			const xmlEditor = await new EditorView().openEditor(camelRouteFilename) as TextEditor;
			const codelens = await xmlEditor.getCodeLens('Open in AtlasMap UI');
			await codelens.click();

			await waitForAtlasMapEditorOpening();
			await handleDirtyEditor();
			await new EditorView().openEditor('atlasmap-mapping.adm');
		});
	});
}

async function handleDirtyEditor(): Promise<void> {
	await new Promise( resolve => setTimeout(resolve, 3000) );
	if(new CustomEditor().isDirty()) {
		console.log('Editor is dirty!... Reverting file...');
		await revertChanges();
		console.log('File changes reverted!');
	}
}

async function revertChanges(): Promise<void> {
	const workbench = new Workbench();
	await workbench.executeCommand('File: Revert File');
}

async function waitForAtlasMapEditorOpening(timeout = 60000) {
	await new Promise( resolve => setTimeout(resolve, 5000) ); // wait for initial notification is displayed
	try {
		console.log('Start checking notifications');
		await VSBrowser.instance.driver.wait(async () => {
			return notificationExists('Waiting for editor to open AtlasMap UI for');
		}, timeout);
		await new Promise( resolve => setTimeout(resolve, 5000) ); // wait for the AtlasMap editor init
		console.log('End checking notifications');
	} catch(error) {
		expect.fail(`Could not find notification: ${error}`);
	}
}

async function notificationExists(text: string): Promise<boolean> {
	try {
		const center = await new Workbench().openNotificationsCenter();
		const notifications = await center.getNotifications(NotificationType.Any);
		for (const notification of notifications) {
			const message = await notification.getMessage();
			if (message.includes(text)) {
				console.log(message);
				return false;
			}
		}
		console.log('AtlasMap notification is gone!');
		return true;
	} catch (err) {
		console.log('AtlasMap notification is gone!');
		return true;
	}
}

async function retrieveAtlasMapEditor(driver: WebDriver, atlasMapWebView: WebView) {
	const atlasMapEditor = new CustomEditor();
	assert.isFalse(await atlasMapEditor.isDirty(), 'The editor is expected to not be dirty on first open but it is dirty.');
	await switchToAtlasmapFrame(driver, atlasMapWebView);
	try {
		await driver.wait(until.elementLocated(By.xpath("//title[text()='AtlasMap Data Mapper UI']")), 10000);
	} catch {
		// sometimes, the switch seems to not have been done as expected, redoing it is solving the problem...
		await switchToAtlasmapFrame(driver, atlasMapWebView);
		await driver.wait(until.elementLocated(By.xpath("//title[text()='AtlasMap Data Mapper UI']")), 10000);
	}
	return atlasMapEditor;
}

async function openAdmFile(workspaceFolder: string, admFileName: string, driver: WebDriver) {
	await VSBrowser.instance.openResources(path.join(workspaceFolder, admFileName));
	await waitForAtlasMapEditorOpening();
	await new EditorView().openEditor(admFileName);
	await handleDirtyEditor();
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
	await driver.wait(until.elementIsEnabled(createConstantButton));
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
			console.log('Switching to AtlasMap frame');
			await atlasMapWebView.switchToFrame();
			return true;
		} catch {
			console.log('Error when trying to switch to AtlasMap frame');
			return false;
		}
	});
}
