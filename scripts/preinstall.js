'use strict';

var atlasmap_server_version = "1.39.3";

const download = require("mvn-artifact-download").default;
const fs = require('fs');
const path = require('path');

download('io.atlasmap:atlasmap-standalone:' + atlasmap_server_version, './jars/').then((filename)=>{
	fs.renameSync(filename, path.join('.', 'jars', 'atlasmap-standalone.jar'));
});
