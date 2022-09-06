# ChangeLog

## 0.2.1

## 0.2.0

- Upgrade to AtlasMap 2.5.0. Beware 2.5.0 is based on 2.3.x which is older than 2.4.0-M4 this extension was previously based on. The main branch work is now suspended. Breaking changes: adm files created with 0.1.x VS Code AtlasMap might not be compatible with this new version. It should work in most of the cases but it is not guaranteed.

## 0.1.3

- Upgrade to AtlasMap 2.4.0-M.4, notably includes upgrades to log4j 2.17.1

## 0.1.2

- Upgrade to AtlasMap 2.4.0-M.3, notably includes upgrades to log4j 2.17
- Fix usage on Windows #755

## 0.1.1

- Upgrade to AtlasMap 2.4.0-M.2, notably includes upgrades to log4j 2.16

## 0.1.0

- Upgrade to AtlasMap 2.4.0-M.1
- Open _*.adm_ files in VS Code Editor instead of Webview. It allows to have dirty/save lifecycle.
- Remove Open and Stop AtlasMap command, forcing the AtlasMap UI to be linked to an _*.adm_ file and benefits from dirty/save lifecycle.
- Adding a new command to create an AtlasMap _*.adm_ file and open it
- Adding a telemetry event to track usage of the new command to create _*.adm_ files

## 0.0.9

- Upgrade to AtlasMap 2.3.2
- Allow automatic detection of JREs (and not only JDKs)
- Provide Codelens to open _*.adm_ files referenced in Camel URI inside AtlasMap UI

## 0.0.8

- Upgrade to AtlasMap 2.2.3
- Include opt-in telemetrics for usage information
- Avoid reloading of AtlasMap UI on each focus gain/lost of the webview in Eclipse Theia

## 0.0.7

- Upgrade to AtlasMap 2.1.6

## 0.0.6

- Upgrade to AtlasMap 2.0.5, which has a new UI based on React instead of Angular

## 0.0.5

- Internal modification to allow integration in Eclipse Theia and Eclipse Che, and remote environment in general
- Upgrade to AtlasMap 1.43.4

## 0.0.4

- Upgrade to AtlasMap 1.42.10
- Fix resource leak when closing VS Code on Mac

## 0.0.3

- Upgrade to AtlasMap 1.41.1
- Update to naming approved by Red Hat legal

## 0.0.2

- Allows to open an _*.adm_ file in AtlasMap UI via contextual menu
- Open AtlasMap UI in internal view by default (configurable via settings)
- Use a specific AtlasMap backend data folder per workspace to improve performance and keep Data Transformation when reopening VS Code
- Upgrade to AtlasMap 1.40.0-beta1
- Move to Red Hat publisher to improve visibility

## 0.0.1

- Command to Start an AtlasMap instance locally
- Command to Open default system browser on previously locally launched AtlasMap instance
