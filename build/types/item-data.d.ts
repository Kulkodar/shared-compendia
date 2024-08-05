import { DocumentStats } from './document-stats';

interface ItemData {
	_id: string;
	name: string;
	type: string;
	img: string;
	system: object;
	effects: BaseActiveEffect[];
	folder: string;
	sort: number;
	ownership: object;
	flags: object;
	_stats: DocumentStats;
}

export { type ItemData };
