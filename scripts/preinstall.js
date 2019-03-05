'use strict';

const download = require("mvn-artifact-download").default;
const fs = require('fs');
const path = require('path');

const atlasmap_server_version = process.env.npm_package_config_atlasmapversion;

download('io.atlasmap:atlasmap-standalone:' + atlasmap_server_version, './jars/').then((filename)=>{
	fs.renameSync(filename, path.join('.', 'jars', 'atlasmap-standalone.jar'));
});
