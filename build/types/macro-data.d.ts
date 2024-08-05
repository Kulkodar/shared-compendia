import { DocumentStats } from './document-stats';

interface MacroData {
	_id: string;
	name: string;
	type: string;
	author: string;
	img: string;
	scope: string;
	command: string;
	folder: string;
	sort: number;
	ownership: object;
	flags: object;
	_stats: DocumentStats;
}

export { type MacroData };
