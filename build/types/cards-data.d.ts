import { CardData } from './card-data';
import { DocumentStats } from './document-stats';

interface CardsData {
	_id: string;
	name: string;
	type: string;
	system: object;
	description: string;
	img: string;
	cards: CardData[];
	width: number;
	height: number;
	rotation: number;
	displayCount: boolean;
	folder: string;
	sort: number;
	ownership: object;
	flags: object;
	_stats: DocumentStats;
}

export { type CardsData };
