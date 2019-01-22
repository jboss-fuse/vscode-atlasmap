(function() { "use strict"; } ());

var atlasMapServerVersion = "1.39.0";

const download = require("mvn-artifact-download").default;
const fs = require("fs");
const path = require("path");

download("io.atlasmap:atlasmap-standalone:" + atlasMapServerVersion, "./jars/").then((filename) => {
  fs.renameSync(filename, path.join(".", "jars", "atlasmap-standalone.jar"));
});
