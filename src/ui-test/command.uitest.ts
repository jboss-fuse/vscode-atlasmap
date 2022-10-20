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
import { TitleBar, VSBrowser, Workbench } from 'vscode-extension-tester';
import { expect } from 'chai';
import { defaultWorkspaceFolderUsedInTests } from './all';

export function createFileCommandTests() {

	describe('AtlasMap Create file command', () => {

		it('Not available in palette when no folder', async function () {
			this.timeout(20000);
			await closeOpenedFolder();
			
			const quickpicks = await openCommandPromptFilteredWithAtlasMap();
			
			expect(quickpicks).to.have.lengthOf(1);
			expect(await quickpicks[0].getLabel()).to.be.equal('No matching commands');
		});

		it('Available in palette with folder opened', async function () {
			this.timeout(20000);
			await VSBrowser.instance.openResources(defaultWorkspaceFolderUsedInTests);
			
			const quickpicks = await openCommandPromptFilteredWithAtlasMap();
			
			expect(quickpicks).to.have.lengthOf(1);
			expect(await quickpicks[0].getLabel()).to.includes('AtlasMap');
		});
	});

	async function closeOpenedFolder() {
		await new Workbench().executeCommand('Workspaces: Close Workspace');
		await VSBrowser.instance.waitForWorkbench();
	}

	async function openCommandPromptFilteredWithAtlasMap() {
		const commandPrompt = await (new Workbench().openCommandPrompt());
		await commandPrompt.setText('> AtlasMap');
		const quickpicks = await commandPrompt.getQuickPicks();
		return quickpicks;
	}
}

