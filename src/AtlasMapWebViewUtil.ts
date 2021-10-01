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
import * as vscode from 'vscode';

export async function loadWebContent(webview: vscode.Webview, fullWebServerUri: vscode.Uri) {
	const cspSource = webview.cspSource;
	const onScriptsCommand = "atlasmapScripts";
	/** CSP required for Atlasmap scripts to run. We need the unsafe scripts
	 * because of how webpack packages Atlasmap.
	 * Also set the base href for all requests. Since by default Atlasmap
	 * standalone fetches resources against localhost, setting this we make
	 * all AJAX requests go against our embedded Atlasmap server.
	*/
	const commonHead = `
			<base href="${fullWebServerUri}">
			<meta
				http-equiv="Content-Security-Policy"
				content="
					default-src 'self' 'unsafe-inline' 'unsafe-hashes' 'unsafe-eval' ${fullWebServerUri} ${cspSource};
					img-src 'self' ${fullWebServerUri} ${cspSource} data:;
				" />
		`;

	/** We first need to retrieve Atlasmap's index.html, that contains all the
	 * assets and html structure required to bootstrap the application. Since
	 * VSC doesn't provide a way to make AJAX requests inside the extension
	 * itself, we use the webview to do that. When the content of the file has
	 * been retrieve, a `onScriptsCommand` message is sent back to VSC.
	*/
	webview.html = `<!DOCTYPE html>
			<head>
				${commonHead}
			</head>
			<body>
				<div id="root"></div>
				<div id="modals"></div>
				<script>
					(async function injectAtlasmap() {
						const request = await fetch("${fullWebServerUri}index.html");
						const body = await request.text();
						const vscode = acquireVsCodeApi();
						vscode.postMessage({
							command: '${onScriptsCommand}',
							html: body,
						})
					})();
				</script>
			</body>
			</html>
		`;

	/** This handles the `onScriptsCommand` message from the webview. We take
	 * the index.html content as is, augmenting it with the CSP we need to run
	 * Atlasmap. After this the application is ready.
	 */
	webview.onDidReceiveMessage(
		message => {
			if (message.command === onScriptsCommand) {
				webview.html = (message.html as string).replace("<head>", "<head>" + commonHead);
			}
		},
		undefined,
		this._context ? this._context.subscriptions : undefined
	);
}

export async function getAtlasMapExternalURI(port: string): Promise<vscode.Uri> {
	return vscode.env.asExternalUri(vscode.Uri.parse(getAtlasMapLocalUrl(port)));
}

export function getAtlasMapLocalUrl(port: string): string {
	return `http://localhost:${port}`;
}
