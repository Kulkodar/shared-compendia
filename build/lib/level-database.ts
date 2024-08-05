import type { AbstractSublevel } from 'abstract-level';
import { ClassicLevel } from 'classic-level';
import * as R from 'remeda';
import { PackError } from './helpers';
import { ActorData } from 'build/types/actor-data';
import { AdventureData } from 'build/types/adventure-data';
import { AmbientLightData } from 'build/types/ambient-light-data';
import { AmbientSoundData } from 'build/types/ambient-sound-data';
import { CardData } from 'build/types/card-data';
import { CardsData } from 'build/types/cards-data';
import { DrawingData } from 'build/types/drawing-data';
import { ItemData } from 'build/types/item-data';
import { JournalEntryData } from 'build/types/journal-entry-data';
import { JournalEntryPageData } from 'build/types/journal-entry-page-data';
import { MacroData } from 'build/types/macro-data';
import { MeasuredTemplateData } from 'build/types/measured-template-data';
import { NoteData } from 'build/types/note-data';
import { SceneData } from 'build/types/scene-data';
import { TableResultData } from 'build/types/table-result.data';
import { TileData } from 'build/types/tile-data';
import { TokenData } from 'build/types/token-data';
import { WallData } from 'build/types/wall-data';
import { PlaylistData } from 'build/types/playlist-data';
import { RollTableData } from 'build/types/roll-table-data';
import { FolderData } from 'build/types/folder-data';
import { CompendiumMetadata } from './compendium-pack';

const DB_KEYS = [
	'actors',
	'adventures',
	'cards',
	'items',
	'journal',
	'macros',
	'playlists',
	'scenes',
	'tables',
] as const;
const EMBEDDED_KEYS = [
	'items',
	'cards',
	'pages',
	'results',
	'drawings',
	'lights',
	'templates',
	'tiles',
	'tokens',
	'walls',
] as const;

class LevelDatabase extends ClassicLevel<string, DBEntry> {
	#dbkey: DBKey;
	embeddedKeys: EmbeddedKey[];

	#documentDb: Sublevel<DBEntry>;
	#foldersDb: Sublevel<FolderData>;
	#embeddedDbs = new Map<string, Sublevel<EmbeddedEntry>>();
	#packMetadata: CompendiumMetadata;

	constructor(location: string, packMetadata: CompendiumMetadata) {
		const dbOptions = {
			keyEncoding: 'utf8',
			valueEncoding: 'json',
		};
		super(location, dbOptions);

		this.#packMetadata = packMetadata;

		const { dbKey, embeddedKeys } = this.#getDBKeys();

		this.#dbkey = dbKey;
		this.embeddedKeys = embeddedKeys;

		this.#documentDb = this.sublevel(dbKey, dbOptions);
		this.#foldersDb = this.sublevel(
			'folders',
			dbOptions
		) as unknown as Sublevel<FolderData>;

		for (const key of this.embeddedKeys) {
			const sublevel = this.sublevel(
				`${this.#dbkey}.${key}`,
				dbOptions
			) as unknown as Sublevel<EmbeddedEntry>;
			this.#embeddedDbs?.set(key, sublevel);
		}
	}

	async createPack(
		docSources: DBEntry[],
		folders: FolderData[]
	): Promise<void> {
		const isDoc = (source: unknown): source is EmbeddedEntry => {
			return R.isObject(source) && '_id' in source;
		};
		const docBatch = this.#documentDb.batch();
		const embeddedBatch = this.#embeddedDbs.get('')?.batch();
		for (const source of docSources) {
			for (const key of this.embeddedKeys) {
				const embeddedDocs = source[key];
				if (Array.isArray(embeddedDocs)) {
					for (let i = 0; i < embeddedDocs.length; i++) {
						const doc = embeddedDocs[i];
						if (isDoc(doc) && embeddedBatch) {
							embeddedBatch.put(
								`${source['_id']}.${doc._id}`,
								doc
							);
							embeddedDocs[i] = doc._id ?? '';
						}
					}
				}
			}
			docBatch.put(source['_id'] ?? '', source);
		}
		await docBatch.write();
		if (embeddedBatch?.length) {
			await embeddedBatch.write();
		}
		if (folders.length) {
			const folderBatch = this.#foldersDb.batch();
			for (const folder of folders) {
				folderBatch.put(folder._id, folder);
			}
			await folderBatch.write();
		}

		await this.close();
	}

	async getEntries(): Promise<{
		packSources: DBEntry[];
		folders: FolderData[];
	}> {
		const packSources: DBEntry[] = [];
		for await (const [docId, source] of this.#documentDb.iterator()) {
			for (const embeddedKey of this.embeddedKeys) {
				if (source[embeddedKey]) {
					const db = this.#embeddedDbs.get(embeddedKey);
					const embeddedDocs = await db!.getMany(
						source[embeddedKey]?.map(
							(embeddedId: string) => `${docId}.${embeddedId}`
						)
					);
					source[embeddedKey] = embeddedDocs;
				}
			}
			packSources.push(source as DBEntry);
		}

		const folders: FolderData[] = [];
		for await (const [_key, folder] of this.#foldersDb.iterator()) {
			folders.push(folder);
		}
		await this.close();

		return {
			packSources,
			folders,
		};
	}

	#getDBKeys(): {
		dbKey: DBKey;
		embeddedKeys: EmbeddedKey[];
	} {
		const dbKey = ((): DBKey => {
			switch (this.#packMetadata.type) {
				case 'JournalEntry':
					return 'journal';
				case 'RollTable':
					return 'tables';
				case 'Cards':
					return 'cards';
				default: {
					const key = `${this.#packMetadata.type.toLowerCase()}s`;
					if (DB_KEYS.includes(key)) {
						return key;
					}
					throw PackError(
						`Unkown Document type: ${this.#packMetadata.type}`
					);
				}
			}
		})();
		const embeddedKeys = ((): EmbeddedKey[] => {
			switch (dbKey) {
				case 'actors':
					return ['items'];
				case 'journal':
					return ['pages'];
				case 'tables':
					return ['results'];
				case 'scenes':
					return [
						'drawings',
						'lights',
						'templates',
						'tiles',
						'tokens',
						'walls',
					];
				case 'cards':
					return ['cards'];
				default:
					return [];
			}
		})();
		return { dbKey, embeddedKeys };
	}
}

type DBKey = (typeof DB_KEYS)[number];
type EmbeddedKey = (typeof EMBEDDED_KEYS)[number];

type Sublevel<T> = AbstractSublevel<
	ClassicLevel<string, T>,
	string | Buffer | Uint8Array,
	string,
	T
>;

type EmbeddedEntry =
	| CardData
	| JournalEntryPageData
	| ItemData
	| TableResultData
	| ItemData
	| DrawingData
	| TileData
	| TokenData
	| AmbientLightData
	| NoteData
	| MeasuredTemplateData
	| AmbientSoundData
	| WallData;
type DBEntry =
	| SceneData
	| ItemData
	| CardsData
	| JournalEntryData
	| MacroData
	| AdventureData
	| ActorData
	| PlaylistData
	| RollTableData;

export { LevelDatabase, DBEntry, EmbeddedEntry, EmbeddedKey };
