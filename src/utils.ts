"use strict";

import * as detect from 'detect-port';

export const DEFAULT_ATLASMAP_PORT = "8585";

export function retrieveFreeLocalPort(): Promise<string> {
	return new Promise((resolve, reject) => {
		detect(DEFAULT_ATLASMAP_PORT)
			.then(_port => {
				resolve("" + _port);
			})
			.catch(err => {
				reject(err);
			});
	});
}
