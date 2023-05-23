import * as path from 'path';
import * as Mocha from 'mocha';
import { globSync } from 'glob';

export function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: "bdd",
		color: true,
		timeout: 100000,
		slow: 50000,
		reporter: 'mocha-jenkins-reporter'
	});

	const testsRoot = path.resolve(__dirname, '..');

	return new Promise((c, e) => {
		const files = globSync('**/**.test.js', { cwd: testsRoot });

		// Add files to the test suite
		files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

		try {
			// Run the mocha test
			mocha.run(failures => {
				if (failures > 0) {
					e(new Error(`${failures} tests failed.`));
				} else {
					c();
				}
			});
		} catch (err) {
			e(err);
		}
	});
}
