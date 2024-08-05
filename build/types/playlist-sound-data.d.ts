interface PlaylistSoundData {
	_id: string;
	name: string;
	description: string;
	path: string;
	channel: string;
	playing: boolean;
	pausedTime: number;
	repeat: boolean;
	volume: number;
	fade: number;
	sort: number;
	flags: object;
}

export { type PlaylistSoundData };
