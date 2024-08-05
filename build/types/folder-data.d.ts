import { DocumentStats } from './document-stats';

interface FolderData {
	_id: string;
	name: string;
	type: FOLDER_DOCUMENT_TYPES;
	description: string;
	folder: string;
	sorting: 'a' | 'm';
	sort: number;
	color: string;
	flags: object;
	_stats: DocumentStats;
}

export { type FolderData };
