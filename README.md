# AtlasMap in VS Code

[![GitHub tag](https://img.shields.io/github/tag/jboss-fuse/vscode-atlasmap.svg?style=plastic)]()
[![Build Status](https://travis-ci.org/jboss-fuse/vscode-atlasmap.svg?branch=master)](https://travis-ci.org/jboss-fuse/vscode-atlasmap)
[![License](https://img.shields.io/badge/license-Apache%202-blue.svg)]()

## Features

This extension is providing 2 commands to help development of [AtlasMap](http://docs.atlasmap.io/) transformation.

### Start an AtlasMap instance

"AtlasMap: Start AtlasMap" command is starting an AtlasMap instance locally:
![Start AtlasMap command in palette](doc/StartAtlasMapCommand.png)

AtlasMap is started on port 8585.
To check that it has been started correctly, you can go to Output view and check for the "AtlasMap server" output:
![AtlasMap server output](doc/AtlasMapServerOutput.png)

### Open an AtlasMap instance

"AtlasMap: Open AtlasMap in default system browser" is opening the default system browser on 127.0.0.1:8585 address which is the URL used if you launched AtlasMap through the "Start AtlasMap" command.
![Open AtlasMap command in palette](doc/OpenAtlasMapCommand.png)

It opens with some default Data types.
![Default page AtlasMap](doc/AtlasMapDefaultPage.png)

 It allows to create and edit Data transformation using AtlasMap. When the Data transformation is finished, you can export it from AtlasMap UI and copy the artifact in your project.

## Prerequisites

- java 8+ must be installed on system path
- port 8585 must be available
