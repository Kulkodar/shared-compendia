import { ActorData } from './actor-data';
import { CardsData } from './cards-data';
import { CombatData } from './combat-data';
import { DocumentStats } from './document-stats';
import { ItemData } from './item-data';
import { JournalEntryData } from './journal-entry-data';
import { MacroData } from './macro-data';
import { PlaylistData } from './playlist-data';
import { RollTableData } from './roll-table-data';
import { SceneData } from './scene-data';

interface AdventureData {
	_id: string;
	name: string;
	img: string;
	caption: string;
	description: string;
	actors: ActorData[];
	combats: CombatData[];
	items: ItemData[];
	scenes: SceneData[];
	journal: JournalEntryData[];
	tables: RollTableData[];
	macros: MacroData[];
	cards: CardsData[];
	playlists: PlaylistData[];
	folder: string;
	folders: FolderData[];
	sort: number;
	ownership: object;
	flags: object;
	_stats: DocumentStats;
}

export { type AdventureData };
