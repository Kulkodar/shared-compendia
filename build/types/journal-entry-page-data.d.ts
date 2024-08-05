import { DocumentStats } from './document-stats';
import { JournalEntryPageImageData } from './journal-entry-page-image-data';
import { JournalEntryPageTextData } from './journal-entry-page-text-data';
import { JournalEntryPageVideoData } from './journal-entry-page-video-data';
import { JournalEntryPageTitleData } from './journal-page-title-data';

interface JournalEntryPageData {
	_id: string;
	name: string;
	type: string;
	title: JournalEntryPageTitleData;
	image: JournalEntryPageImageData;
	text: JournalEntryPageTextData;
	video: JournalEntryPageVideoData;
	src: string;
	system: object;
	sort: number;
	ownership: object;
	flags: object;
	_stats: DocumentStats;
}

export { type JournalEntryPageData };
