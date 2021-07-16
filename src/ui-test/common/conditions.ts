import { Workbench } from 'vscode-extension-tester';
import { views } from './constants';

export async function atlasMapWindowExists(): Promise<boolean | undefined> {
	try {
		const titles = await new Workbench().getEditorView().getOpenEditorTitles();
		for (const title of titles) {
			if (title.indexOf(views.ATLASMAP_TITLE) > -1) {
				return true;
			}
		}
		return false;
	} catch (err) {
		//do not print err
		return false;
	}
}