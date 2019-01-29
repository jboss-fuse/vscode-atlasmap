# AtlasMap in VS Code

[![GitHub tag](https://img.shields.io/github/tag/jboss-fuse/vscode-atlasmap.svg?style=plastic)](https://github.com/jboss-fuse/vscode-atlasmap/tags)
[![Build Status](https://travis-ci.org/jboss-fuse/vscode-atlasmap.svg?branch=master)](https://travis-ci.org/jboss-fuse/vscode-atlasmap)
[![License](https://img.shields.io/badge/license-Apache%202-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Features

This extension is providing a command to help development of [AtlasMap](http://docs.atlasmap.io/) transformations.

### Start an AtlasMap instance

"AtlasMap: Start AtlasMap" command is starting a local AtlasMap instance and opens a brower pointing to its web UI:
![Start AtlasMap command in palette](doc/StartAtlasMapCommand.png)

AtlasMap is started on port 8585 by default. If this port is occupied another free port will be choosen automatically.
To check if it has been started correctly, you can go to Output view and check for the "AtlasMap Server" output:
![AtlasMap server output](doc/AtlasMapServerOutput.png)

The AtlasMap web interface opens with some default data types.
![Default page AtlasMap](doc/AtlasMapDefaultPage.png)

 It allows you to create and modify data transformations using AtlasMap. When the data transformation is finished, you can export it from AtlasMap UI and copy the artifact into your project.

## Prerequisites

- java 8+ must be installed on system path
