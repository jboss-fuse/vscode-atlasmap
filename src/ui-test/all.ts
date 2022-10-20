import path = require('path');
import { createFileCommandTests } from './command.uitest';
import { editorTests } from './editor';

export const defaultWorkspaceFolderUsedInTests = path.join(__dirname, '../../test Fixture with speci@l chars');

describe('AtlasMap UI tests', () => {
	editorTests();
	createFileCommandTests();
});