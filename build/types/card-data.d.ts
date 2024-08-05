import { CardFaceData } from './card-face-data';

interface CardData {
	_id: string;
	name: string;
	description: string;
	type: string;
	system: object;
	suit: string;
	value: number;
	back: CardFaceData;
	faces: CardFaceData[];
	face: number;
	drawn: boolean;
	ownership: object;
	origin: string;
	width: number;
	height: number;
	rotation: number;
	sort: number;
	flags: object;
}

export { type CardData };
