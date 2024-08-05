import { DocumentStats } from './document-stats';
import { PlaylistSoundData } from './playlist-sound-data';

interface PlaylistData {
	_id: string;
	name: string;
	description: string;
	sounds: PlaylistSoundData[];
	mode: number;
	channel: string;
	playing: boolean;
	fade: number;
	folder: string;
	sorting: string;
	sort: number;
	seed: number;
	ownership: object;
	flags: object;
	_stats: DocumentStats;
}

export { type PlaylistData };
