import * as assert from 'assert';
import * as requirements from '../requirements';

//test copied from vscode-java

suite('Java requirements', () => {

	test('should parse Java version', function () {
		//Test boundaries
		assert.equal(requirements.parseMajorVersion(null), 0);
		assert.equal(requirements.parseMajorVersion(''), 0);
		assert.equal(requirements.parseMajorVersion('foo'), 0);
		assert.equal(requirements.parseMajorVersion('version'), 0);
		assert.equal(requirements.parseMajorVersion('version ""'), 0);
		assert.equal(requirements.parseMajorVersion('version "NaN"'), 0);

		//Test the real stuff
		assert.equal(requirements.parseMajorVersion('version "1.7"'), 7);
		assert.equal(requirements.parseMajorVersion('version "1.8.0_151"'), 8);
		assert.equal(requirements.parseMajorVersion('version "9"'), 9);
		assert.equal(requirements.parseMajorVersion('version "9.0.1"'), 9);
		assert.equal(requirements.parseMajorVersion('version "10-ea"'), 10);
	});
});
