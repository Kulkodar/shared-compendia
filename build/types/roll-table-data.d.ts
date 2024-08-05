import { DocumentStats } from './document-stats';
import { TableResultData } from './table-result.data';

interface RollTableData {
	_id: string;
	name: string;
	img: string;
	description: string;
	results: TableResultData[];
	formula: string;
	replacement: boolean;
	displayRoll: boolean;
	folder: string;
	sort: number;
	ownership: object;
	flags: object;
	_stats: DocumentStats;
}

export { type RollTableData };
