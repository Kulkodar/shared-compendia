import { TileOcclusionData } from './tile-occlusion-data';
import { TileVideoData } from './tile-video-data';

interface TileData {
	_id: string;
	texture: TextureData;
	width: number;
	height: number;
	x: number;
	y: number;
	elevation: number;
	sort: number;
	rotation: number;
	alpha: number;
	hidden: boolean;
	locked: boolean;
	occlusion: TileOcclusionData;
	video: TileVideoData;
	flags: object;
}

export { type TileData };
