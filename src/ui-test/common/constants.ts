export namespace notifications {
	export const ATLASMAP_STARTING = 'Starting AtlasMap instance at port ';
	export const ATLASMAP_RUNNING = 'Running AtlasMap instance found';
	export const ATLASMAP_WAITING = 'Waiting for ';
	export const ATLASMAP_STOPPING = 'Stopping AtlasMap instance at port';
	export const ATLASMAP_STOPPED = 'Stopped AtlasMap instance at port';
	export const ATLASMAP_UNABLE_LOCATE = 'Unable to locate running AtlasMap instance';
}

export namespace commands {
	export const START_ATLASMAP = 'AtlasMap: Open AtlasMap';
	export const STOP_ATLASMAP = 'AtlasMap: Stop AtlasMap';
	export const CLEAR_NOTIFICATIONS = 'Notifications: Clear All notifications';
}

export namespace views {
	export const ATLASMAP_TITLE = 'AtlasMap';
}
