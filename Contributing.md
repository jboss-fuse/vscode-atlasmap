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

When the AtlasMap editor is opened, some commands to debug are available:

* in palette (Ctrl+Shift+P), use "Developer: Open Webview Developer Tools"
* to have the console and some stack you will need to call from the palette (Ctrl+Shift+P) "Developer: Reload Web

## How to provide a new version on VS Code Marketplace

* Check that the version in package.json has not been published yet
    * If already published:
        * Run `npm version --no-git-tag-version patch`
        * Push changes in a PR
        * Wait for PR to be merged
* Check that someone listed as _submitter_ in Jenkinsfile is available
* Create a tag
* Push the tag to vscode-atlasmap repository, it will trigger a build after few minutes
* Check build is working fine on [Circle CI](https://app.circleci.com/pipelines/github/jboss-fuse/vscode-atlasmap)
* Start build on [Jenkins CI](https://studio-jenkins-csb-codeready.apps.ocp-c1.prod.psi.redhat.com/job/Fuse/job/VSCode/job/vscode-atlasmap-release/) with _publishToMarketPlace_ and _publishToOVSX_ parameters checked
* When the build hits the _Publish to Marketplace_ step, it will wait for a response
* It is possible to check that the produced vsix is valid by using the one pushed in [Jboss download area](https://download.jboss.org/jbosstools/vscode/snapshots/vscode-atlasmap/)
* For someone in _submitter_ list:
  * Ensure you are logged in
  * Go to the console log of the build and click "Proceed"
* Wait few minutes and check that it has been published on [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=redhat.atlasmap-viewer) and [Open VSX Marketplace](https://open-vsx.org/extension/redhat/atlasmap-viewer)
* Keep build forever for later reference and edit build information to indicate the version
* Prepare next iteration:
    * Run `npm version --no-git-tag-version patch`
    * Push changes in a PR
    * Follow PR until it is approved/merged

## How to test a new version of AtlasMap standalone without rebuilding

A hack consists in replacing the AtlasMap standalone jar in `~/.vscode/extensions/redhat.atlasmap-viewer-<theVersion>/jars/atlasmap-standalone.jar`.
