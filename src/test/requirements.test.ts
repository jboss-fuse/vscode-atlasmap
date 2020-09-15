"use strict";

import * as assert from 'assert';
import * as requirements from '../requirements';

//test copied from vscode-java

describe('Java requirements', () => {

	it('should parse Java version', function () {
		//Test boundaries
		assert.strictEqual(requirements.parseMajorVersion(null), 0);
		assert.strictEqual(requirements.parseMajorVersion(''), 0);
		assert.strictEqual(requirements.parseMajorVersion('foo'), 0);
		assert.strictEqual(requirements.parseMajorVersion('version'), 0);
		assert.strictEqual(requirements.parseMajorVersion('version ""'), 0);
		assert.strictEqual(requirements.parseMajorVersion('version "NaN"'), 0);

		//Test the real stuff
		assert.strictEqual(requirements.parseMajorVersion('version "1.7"'), 7);
		assert.strictEqual(requirements.parseMajorVersion('version "1.8.0_151"'), 8);
		assert.strictEqual(requirements.parseMajorVersion('version "9"'), 9);
		assert.strictEqual(requirements.parseMajorVersion('version "9.0.1"'), 9);
		assert.strictEqual(requirements.parseMajorVersion('version "10-ea"'), 10);
	});
});
