import { commandCreationTests } from './command';
import { editorTests } from './editor';

describe('AtlasMap UI tests', () => {
	commandCreationTests();
	editorTests();
});