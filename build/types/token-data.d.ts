import { TokenBarData } from './token-bar-data';
import { TokenDetectionMode } from './token-detection-mode';
import { TokenSightData } from './token-sight-data';

interface TokenData {
	_id: string;
	name: string;
	displayName: number;
	actorId: string;
	actorLink: boolean;
	delta: BaseActorDelta;
	texture: TextureData;
	width: number;
	height: number;
	x: number;
	y: number;
	elevation: number;
	locked: boolean;
	lockRotation: boolean;
	rotation: number;
	alpha: number;
	hidden: boolean;
	disposition: number;
	displayBars: number;
	bar1: TokenBarData;
	bar2: TokenBarData;
	light: LightData;
	sight: TokenSightData;
	detectionModes: TokenDetectionMode[];
	flags: object;
}

export { type TokenData };
