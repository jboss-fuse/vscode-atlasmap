# AtlasMap in VS Code

[![GitHub tag](https://img.shields.io/github/tag/jboss-fuse/vscode-atlasmap.svg?style=plastic)](https://github.com/jboss-fuse/vscode-atlasmap/tags)
[![Travis](https://travis-ci.com/jboss-fuse/vscode-atlasmap.svg?branch=master)](https://travis-ci.com/jboss-fuse/vscode-atlasmap)
[![CircleCI](https://circleci.com/gh/circleci/circleci-docs.svg?style=shield)](https://circleci.com/gh/jboss-fuse/vscode-atlasmap)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=vscode-atlasmap&metric=alert_status)](https://sonarcloud.io/dashboard?id=vscode-atlasmap)
[![License](https://img.shields.io/badge/license-Apache%202-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Features

This extension is providing a command to help development of [AtlasMap](http://docs.atlasmap.io/) transformations.

### Preferences: Preferred Browser Type

Inside the VSCode Preferences you can choose what browser type you want to open the AtlasMap UI with.

Possible choices:
- Internal (This will open the AtlasMap UI inside VSCode in a dedicated view)
- External (This will open the AtlasMap UI in the default OS browser externally)
![AtlasMap Preferences](doc/AtlasMapPreferences.png)

### Start an AtlasMap instance

"AtlasMap: Open AtlasMap" command is starting a local AtlasMap instance and opens a Web View or an external browser pointing to its web UI:
![Open AtlasMap command in palette](doc/OpenAtlasMapCommand.png)

AtlasMap is started on port 8585 by default. If this port is occupied another free port will be chosen automatically.
To check if it has been started correctly, you can go to Output view and check for the "AtlasMap Server" output:
![AtlasMap Server output](doc/AtlasMapServerOutput.png)

The AtlasMap web interface opens with the last edited Data transformation.
![Default page AtlasMap](doc/AtlasMapDefaultPage.png)

 It allows you to create and modify data transformations using AtlasMap. You can export your data transformation from the AtlasMap UI and save the artifact into your project.

## Prerequisites

- Java 8+ must be installed on system path
