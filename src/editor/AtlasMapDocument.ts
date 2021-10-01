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
import { ChildProcess } from 'child_process';
import * as vscode from 'vscode';

import fs = require('fs');

export class AtlasMapDocument implements vscode.CustomDocument {

	uri: vscode.Uri;
	atlasMapServerProcess: ChildProcess;
	atlasMapWSFolder: string;
	associatedPort: string;
	
	constructor(uri: vscode.Uri) {
		this.uri = uri;
	}
	
	setAtlasMapProcess(process: ChildProcess) {
		this.atlasMapServerProcess = process;
	}
	
	setWorkspaceFolder(atlasMapWSFolder: string) {
		this.atlasMapWSFolder = atlasMapWSFolder;
	}
	
	setAssociatedPort(associatedPort: string) {
		this.associatedPort = associatedPort;
	}
	
	dispose(): void {
		if(this.atlasMapServerProcess) {
			this.atlasMapServerProcess.kill();
		}
		if (this.atlasMapWSFolder) {
			fs.rmdirSync(this.atlasMapWSFolder, { recursive: true });
		}
	}
}
