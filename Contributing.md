# Help to participate in the development of the project

## How to start development

### Inside VS Code

* Click menu *Terminal* -> *New Terminal* to open a terminal view

### Inside the Terminal View

* Enter *npm install* to install all the needed dependencies and the standalone AtlasMap server jar. You will need to call it again only if dependencies are modified in package.json.
* Enter *npm run watch* to monitor the project for changes and to rebuild automatically
  * You can also click menu *Terminal* -> *Run Task* and then select *npm:watch* from the list
  * Both ways this will make any manual compiling obsolete which is a great help
* Go to *Debug perspective* (*Ctrl+Shift+D*)
* Select *Run AtlasMap extension*
* Click on the green arrow OR press *F5* to launch the extension

When testing new version of the AtlasMap, just replace the jar in *./jars* folder respecting the name *atlasmap-standalone.jar* and relaunch the *Run AtlasMap extension*.

## Debug the Webview API

After calling the "Open AtlasMap" and that the AtlasMap panel is opened, some commands to debug are available in the same VS Code instance you launched the "Open AtlasMap command":

* in palette (Ctrl+Shift+P), use "Developer: Open Webview Developer Tools"
* to have the console and some stack you will need to call from the palette (Ctrl+Shift+P) "Developer: Reload Web

## How to provide a new version on VS Code Marketplace

* Check that the version in package.json has not been published yet
  * If already published:
    * Upgrade the version in package.json
    * Run 'npm install' so that the package-lock.json is updated
    * Push changes in a PR
    * Wait for PR to be merged
* Create a tag
* Push the tag to vscode-atlasmap repository, it will trigger a build after few minutes
* Check build is working fine on [Travis CI](https://travis-ci.org/jboss-fuse/vscode-atlasmap)
* Wait that the new plugin version is validated by VS Code marketplace moderators (can take minutes or days)
* Prepare next iteration:
  * Upgrade the version in package.json
  * Run 'npm install' so that the package-lock.json is updated
  * Push changes in a PR
  * Follow PR until it is approved/merged
  