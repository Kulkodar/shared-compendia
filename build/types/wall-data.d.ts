import { WallThresholdData } from './wall-threshold-data';

interface WallData {
	_id: string;
	c: number[];
	light: number;
	move: number;
	sight: number;
	sound: number;
	dir: number;
	door: number;
	ds: number;
	threshold: WallThresholdData;
	flags: object;
}

export { type WallData };
