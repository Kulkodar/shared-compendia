import fs from 'fs';
import path from 'path';
import { getFilesRecursively, PackError } from './helpers';
import { DBEntry, LevelDatabase } from './level-database';
import moduleJSON from '../../static/module.json';
import systemJSON from '../system.json';
import slugify from 'slug';
import { AdventureData } from 'build/types/adventure-data';
import { SceneData } from 'build/types/scene-data';
import { FolderData } from 'build/types/folder-data';
import { ActorData } from 'build/types/actor-data';
import { ItemData } from 'build/types/item-data';

type CompendiumDocumentType =
	| 'Actor'
	| 'Adventure'
	| 'Cards'
	| 'Item'
	| 'JournalEntry'
	| 'Macro'
	| 'Playlist'
	| 'Scene'
	| 'RollTable';

interface CompendiumMetadata {
	system: string;
	name: string;
	path: string;
	type: CompendiumDocumentType;
}

class CompendiumPack {
	packId: string;
	packDir: string;
	documentType: CompendiumDocumentType;
	systemId: string;
	data: DBEntry[];
	folders: FolderData[];

	static outDir = path.resolve(process.cwd(), 'dist/packs');
	static #namesToIds: {
		[K in Extract<
			CompendiumDocumentType,
			| 'Actor'
			| 'Adventure'
			| 'Cards'
			| 'Item'
			| 'JournalEntry'
			| 'Macro'
			| 'RollTable'
			| 'Scene'
			| 'Playlist'
		>]: Map<string, Map<string, string>>;
	} & Record<string, Map<string, Map<string, string>> | undefined> = {
		Actor: new Map(),
		Adventure: new Map(),
		Cards: new Map(),
		Item: new Map(),
		JournalEntry: new Map(),
		Macro: new Map(),
		RollTable: new Map(),
		Scene: new Map(),
		Playlist: new Map(),
	};

	static #packsMetadata = [
		...(systemJSON.packs as unknown as CompendiumMetadata[]),
		...(moduleJSON.packs as unknown as CompendiumMetadata[]),
	];

	static LINK_PATTERNS = {
		world: /@(?:Item|JournalEntry|Actor)\[[^\]]+\]|@Compendium\[world\.[^\]]{16}\]|@UUID\[(?:Item|JournalEntry|Actor)/g,
		compendium:
			/@Compendium\[(?:kulkodars-shared-compendia|lost-realms)\.(?<packName>[^.]+)\.(?<docType>Actor|JournalEntry|Item|Macro|RollTable)\.(?<docName>[^\]]+)\]\{?/g,
		uuid: /@UUID\[Compendium\.(?:kulkodars-shared-compendia|lost-realms)\.(?<packName>[^.]+)\.(?<docType>Actor|JournalEntry|Item|Macro|RollTable)\.(?<docName>[^\]]+)\]\{?/g,
	};

	constructor(
		packDir: string,
		parsedData: DBEntry[],
		parsedFolders: FolderData[]
	) {
		this.data = parsedData;
		this.packDir = packDir;

		const metadata = CompendiumPack.#packsMetadata.find(
			(pack) => path.basename(pack.path) === path.basename(this.packDir)
		);
		if (metadata === undefined) {
			throw PackError(
				`Compendium at ${this.packDir} has no metadata in the local module.json file.`
			);
		}

		this.systemId = metadata.system;
		this.packId = metadata.name;
		this.documentType = metadata.type;

		if (!this.#isFoldersData(parsedFolders)) {
			throw PackError(
				`Folder data supplied for ${this.packId} does not resemble folder source data.`
			);
		}
		this.folders = parsedFolders;

		if (!this.#isPackData(parsedData)) {
			throw PackError(
				`Data supplied for ${this.packId} does not resemble Foundry document source data.`
			);
		}

		CompendiumPack.#namesToIds[this.documentType]?.set(
			this.packId,
			new Map()
		);
		const packMap = CompendiumPack.#namesToIds[this.documentType]?.get(
			this.packId
		);

		if (!packMap) {
			throw PackError(
				`Compendium ${this.packId} (${this.packDir}) was not found.`
			);
		}

		for (const docSource of this.data) {
			packMap.set(docSource.name, docSource._id ?? '');
		}
	}

	static loadJSON(dirPath: string): CompendiumPack {
		const filePaths = getFilesRecursively(dirPath);
		const parsedData = filePaths.map((filePath) => {
			const jsonString = fs.readFileSync(filePath, 'utf-8');
			const packSource: DBEntry = (() => {
				try {
					return JSON.parse(jsonString);
				} catch (error) {
					if (error instanceof Error) {
						throw PackError(
							`File ${filePath} could not be parsed: ${error.message}`
						);
					}
				}
			})();

			const documentName = packSource?.name;
			if (documentName === undefined) {
				throw PackError(
					`Document contained in ${filePath} has no name.`
				);
			}

			const filenameForm = slugify(documentName).concat('.json');
			if (path.basename(filePath) !== filenameForm) {
				throw PackError(
					`Filename at ${filePath} does not reflect document name (should be ${filenameForm}).`
				);
			}

			return packSource;
		});

		const folders = ((): FolderData[] => {
			const foldersFile = path.resolve(dirPath, '_folders.json');
			if (fs.existsSync(foldersFile)) {
				const jsonString = fs.readFileSync(foldersFile, 'utf-8');
				const foldersSource: FolderData[] = (() => {
					try {
						return JSON.parse(jsonString);
					} catch (error) {
						if (error instanceof Error) {
							throw PackError(
								`File ${foldersFile} could not be parsed: ${error.message}`
							);
						}
					}
				})();

				return foldersSource;
			}
			return [];
		})();

		const dbFilename = path.basename(dirPath);
		return new CompendiumPack(dbFilename, parsedData, folders);
	}

	async save(): Promise<number> {
		if (
			!fs
				.lstatSync(CompendiumPack.outDir, { throwIfNoEntry: false })
				?.isDirectory()
		) {
			fs.mkdirSync(CompendiumPack.outDir);
		}
		const packDir = path.join(CompendiumPack.outDir, this.packDir);

		// If the old folder is not removed the new data will be inserted into the existing db
		const stats = fs.lstatSync(packDir, { throwIfNoEntry: false });
		if (stats?.isDirectory()) {
			fs.rmSync(packDir, { recursive: true });
		}

		const metadata = CompendiumPack.#packsMetadata.find(
			(pack) => path.basename(pack.path) === path.basename(this.packDir)
		);
		if (metadata === undefined) {
			throw PackError(
				`Compendium at ${this.packDir} has no metadata in the local module.json file.`
			);
		}

		const db = new LevelDatabase(packDir, metadata);
		await db.createPack(this.finalizeAll(), this.folders);
		console.log(
			`Pack "${this.packId}" with ${this.data.length} entries built successfully.`
		);

		return this.data.length;
	}

	finalizeAll(): DBEntry[] {
		return this.data.map((d) => JSON.parse(this.#finalize(d)));
	}

	#finalize(docSource: DBEntry): string {
		// Replace all compendium documents linked by name to links by ID
		const stringified = JSON.stringify(docSource);
		const worldItemLink =
			CompendiumPack.LINK_PATTERNS.world.exec(stringified);
		if (worldItemLink !== null) {
			throw PackError(
				`${docSource.name} (${this.packId}) has a link to a world item: ${worldItemLink[0]}`
			);
		}

		docSource.flags ??= {};

		const replace = (
			match: string,
			packId: string,
			docType: string,
			docName: string
		): string => {
			if (match.includes('JournalEntryPage')) return match;

			const namesToIds = CompendiumPack.#namesToIds[docType]?.get(packId);
			const link = match.replace(/\{$/, '');
			if (namesToIds === undefined) {
				throw PackError(
					`${docSource.name} (${this.packId}) has a bad pack reference: ${link}`
				);
			}

			const documentId: string | undefined = namesToIds.get(docName);
			if (documentId === undefined) {
				throw PackError(
					`${docSource.name} (${this.packId}) has broken link to ${docName}: ${match}`
				);
			}
			const sourceId = `Compendium.${this.systemId}.${packId}.${docType}.${documentId}`;
			const labelBraceOrFullLabel = match.endsWith('{')
				? '{'
				: `{${docName}}`;

			return `@UUID[${sourceId}]${labelBraceOrFullLabel}`;
		};

		return JSON.stringify(docSource)
			.replace(CompendiumPack.LINK_PATTERNS.uuid, replace)
			.replace(CompendiumPack.LINK_PATTERNS.compendium, replace);
	}

	/** Convert UUIDs in REs to resemble links by name or back again */
	static convertUUIDs(
		source: ItemData,
		{
			to,
			map,
		}: { to: 'ids' | 'names'; map: Map<string, Map<string, string>> }
	): void {
		const convertOptions = {
			to: to === 'ids' ? 'id' : 'name',
			map,
		} as const;

		// Convert UUIDs found in places particular to certain item types
		if (
			(source.type == 'feat' || source.type == 'action') &&
			source.system.selfEffect
		) {
			source.system.selfEffect.uuid = CompendiumPack.convertUUID(
				source.system.selfEffect.uuid,
				convertOptions
			);
		} else if (
			source.type == 'ancestry' ||
			source.type == 'background' ||
			source.type == 'class' ||
			source.type == 'kit'
		) {
			const items: Record<
				string,
				{ uuid: string; items?: Record<string, { uuid: string }> }
			> = source.system.items;
			for (const entry of Object.values(items)) {
				entry.uuid = CompendiumPack.convertUUID(
					entry.uuid,
					convertOptions
				);
				if (typeof entry.items === 'object' && entry.items !== null) {
					for (const subentry of Object.values(entry.items)) {
						subentry.uuid = CompendiumPack.convertUUID(
							subentry.uuid,
							convertOptions
						);
					}
				}
			}
		}
	}

	static convertUUID<TUUID extends string>(
		uuid: TUUID,
		{ to, map }: ConvertUUIDOptions
	): TUUID {
		if (uuid.startsWith('Item.')) {
			throw PackError(`World-item UUID found: ${uuid}`);
		}
		if (
			!(
				uuid.startsWith('Compendium.pf2e.') ||
				uuid.startsWith('Compendium.lost-realms.')
			)
		)
			return uuid;

		const toNameRef = (uuid: string): TUUID => {
			const parts = uuid.split('.');
			const [packId, _docType, docId] = parts.slice(2, 6);

			const docName = map.get(packId)?.get(docId);
			if (docName) {
				return parts.slice(0, 4).concat(docName).join('.') as TUUID;
			} else {
				console.debug(
					`Warning: Unable to find document name corresponding with ${uuid}`
				);
				return uuid as TUUID;
			}
		};

		const toIDRef = (uuid: string): TUUID => {
			const match =
				/(?<=^Compendium\.pf2e\.)([^.]+)\.([^.]+)\.(.+)$/.exec(uuid);
			const [, packId, _docType, docName] = match ?? [
				null,
				null,
				null,
				null,
			];
			const docId = map.get(packId ?? '')?.get(docName ?? '');
			if (docName && docId) {
				return uuid.replace(docName, docId) as TUUID;
			} else {
				throw Error(`Unable to resolve UUID for ${docName ?? docId}`);
			}
		};
		const result = to === 'id' ? toIDRef(uuid) : toNameRef(uuid);

		return result;
	}

	#isDocumentSource(maybeDocSource: unknown): maybeDocSource is DBEntry {
		if (!(typeof maybeDocSource === 'object' && maybeDocSource !== null))
			return false;
		const checks = Object.entries({
			name: (data: { name?: unknown }) => typeof data.name === 'string',
		});

		const failedChecks = checks
			.map(([key, check]) => (check(maybeDocSource) ? null : key))
			.filter((key) => key !== null);

		if (failedChecks.length > 0) {
			throw PackError(
				`Document source in (${this.packId}) has invalid or missing keys: ${failedChecks.join(', ')}`
			);
		}

		return true;
	}

	#isPackData(packData: unknown[]): packData is DBEntry[] {
		return packData.every((maybeDocSource: unknown) =>
			this.#isDocumentSource(maybeDocSource)
		);
	}

	#isFolderSource(maybeFolderSource: FolderData) {
		return (
			'folder' in maybeFolderSource &&
			'sorting' in maybeFolderSource &&
			'sort' in maybeFolderSource &&
			'color' in maybeFolderSource &&
			(maybeFolderSource.sorting == 'a' ||
				maybeFolderSource.sorting == 'm')
		);
	}

	#isFoldersData(folderData: FolderData[]): folderData is FolderData[] {
		return folderData.every((maybeFolderData) =>
			this.#isFolderSource(maybeFolderData)
		);
	}
}

interface ConvertUUIDOptions {
	to: 'id' | 'name';
	map: Map<string, Map<string, string>>;
}

function isAdventure(doc: DBEntry): doc is AdventureData {
	return (
		'actors' in doc &&
		'combats' in doc &&
		'items' in doc &&
		'journal' in doc &&
		'tables' in doc &&
		'macros' in doc
	);
}

function isScene(doc: DBEntry): doc is SceneData {
	return (
		'background' in doc &&
		'backgroundColor' in doc &&
		'environment' in doc &&
		'darknessLevel' in doc &&
		'globalLight' in doc
	);
}

function isActor(doc: DBEntry): doc is ActorData {
	return (
		'name' in doc &&
		'type' in doc &&
		'system' in doc &&
		'prototypeToken' in doc &&
		'items' in doc &&
		doc.type == 'npc'
	);
}

function isItem(doc: DBEntry): doc is ItemData {
	return (
		'name' in doc &&
		'type' in doc &&
		'system' in doc &&
		'prototypeToken' in doc &&
		'items' in doc &&
		(doc.type == 'melee' || doc.type == 'action' || doc.type == 'lore')
	);
}

export {
	CompendiumMetadata,
	CompendiumPack,
	CompendiumDocumentType,
	PackError,
	isAdventure,
	isScene,
	isActor,
	isItem,
};
