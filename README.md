# AtlasMap in VS Code

[![GitHub tag](https://img.shields.io/github/tag/jboss-fuse/vscode-atlasmap.svg?style=plastic)](https://github.com/jboss-fuse/vscode-atlasmap/tags)
[![Build Status](https://travis-ci.org/jboss-fuse/vscode-atlasmap.svg?branch=master)](https://travis-ci.org/jboss-fuse/vscode-atlasmap)
[![License](https://img.shields.io/badge/license-Apache%202-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Features

This extension is providing a command to help development of [AtlasMap](http://docs.atlasmap.io/) transformations.

### Start an AtlasMap instance

"AtlasMap: Open AtlasMap" command is starting a local AtlasMap instance and opens a Web View or an external browser pointing to its web UI:
![Open AtlasMap command in palette](doc/OpenAtlasMapCommand.png)

AtlasMap is started on port 8585 by default. If this port is occupied another free port will be choosen automatically.
To check if it has been started correctly, you can go to Output view and check for the "AtlasMap Server" output:
![AtlasMap Server output](doc/AtlasMapServerOutput.png)

The AtlasMap web interface opens with the last edited Data transformation.
![Default page AtlasMap](doc/AtlasMapDefaultPage.png)

 It allows you to create and modify data transformations using AtlasMap. You can export your data transformation from the AtlasMap UI and save the artifact into your project.

## Prerequisites

- Java 8+ must be installed on system path
