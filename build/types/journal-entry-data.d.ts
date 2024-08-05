import { DocumentStats } from './document-stats';
import { JournalEntryPageData } from './journal-entry-page-data';

interface JournalEntryData {
	_id: string;
	name: string;
	pages: JournalEntryPageData[];
	folder: string;
	sort: number;
	ownership: object;
	flags: object;
	_stats: DocumentStats;
}

export { type JournalEntryData };
