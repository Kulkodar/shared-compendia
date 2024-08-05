import fs from 'fs';
import path from 'path';
import process from 'process';
import moduleJSON from '../../static/module.json';
import systemJSON from '../system.json';
import {
	CompendiumDocumentType,
	CompendiumMetadata,
	CompendiumPack,
	isAdventure,
} from './compendium-pack';
import { PackError } from './helpers';
import { DBEntry, LevelDatabase } from './level-database';
import slugify from 'slug';
import { AdventureData } from 'build/types/adventure-data';
import { ActorData } from 'build/types/actor-data';
import { FolderData } from 'build/types/folder-data';
import { JournalEntryData } from 'build/types/journal-entry-data';
import { SceneData } from 'build/types/scene-data';
import { ItemData } from 'build/types/item-data';

class PackExtractor {
	readonly dataPath: string;
	readonly systemDataPath: string;
	readonly tempDataPath: string;
	readonly packsMetadata: CompendiumMetadata[];

	readonly #newDocIdMap: Record<string, string> = {};

	readonly #idsToNames: {
		[K in Extract<
			CompendiumDocumentType,
			'Actor' | 'Card' | 'Item' | 'JournalEntry' | 'Macro' | 'RollTable'
		>]: Map<string, Map<string, string>>;
	} & Record<string, Map<string, Map<string, string>> | undefined> = {
		Actor: new Map(),
		Card: new Map(),
		Item: new Map(),
		JournalEntry: new Map(),
		Macro: new Map(),
		RollTable: new Map(),
	};

	#folderPathMap = new Map<string, string>();

	constructor() {
		this.tempDataPath = path.resolve(process.cwd(), 'packs-temp');
		this.dataPath = path.resolve(process.cwd(), 'packs');
		this.systemDataPath = path.resolve(process.cwd(), 'system-packs');
		this.packsMetadata = [
			...(systemJSON.packs as unknown as CompendiumMetadata[]),
			...(moduleJSON.packs as unknown as CompendiumMetadata[]),
		];
	}

	async run(
		pack: string,
		outputDir: string,
		sanitize: boolean
	): Promise<void> {
		const packsPath = path.join(process.cwd(), pack, 'packs');

		console.log('Cleaning up old temp data...');
		await fs.promises.rm(this.tempDataPath, {
			recursive: true,
			force: true,
		});
		
		await fs.promises.mkdir(this.tempDataPath);

		const packs = fs.readdirSync(packsPath).map(function (packPath) {
			return path.resolve(packsPath, packPath);
		});

		console.log('Populating Id map...');
		await this.#populateIdNameMap(
			path.resolve(process.cwd(), 'dist', 'packs')
		);
		await this.#populateIdNameMap(
			path.resolve(process.cwd(), 'build', 'packs')
		);

		await Promise.all(
			packs.map(async (filePath): Promise<void> => {
				const dbDirectory = path.basename(filePath);
				const metadata = this.packsMetadata.find(
					(p) => path.basename(p.path) === dbDirectory
				);
				if (!metadata) {
					return;
				}
				if (!fs.existsSync(filePath)) {
					throw PackError(`Directory not found: "${dbDirectory}"`);
				}

				const outDirPath = path.resolve(outputDir, dbDirectory);
				const tempOutDirPath = path.resolve(
					this.tempDataPath,
					dbDirectory
				);
				await fs.promises.mkdir(tempOutDirPath);

				const sourceCount = await this.extractPack(
					filePath,
					dbDirectory,
					sanitize
				);

				// Move ./packs-temp/[packname]/ to ./packs/[packname]/
				fs.rmSync(outDirPath, { recursive: true, force: true });
				await fs.promises.rename(tempOutDirPath, outDirPath);

				console.log(
					`Finished extracting ${sourceCount} documents from pack ${dbDirectory}`
				);
			})
		);
		await fs.promises.rm(this.tempDataPath, {
			recursive: true,
			force: true,
		});
	}

	async extractPack(
		filePath: string,
		packDirectory: string,
		sanitize: boolean
	): Promise<number> {
		console.log(`Extracting pack: ${packDirectory}`);
		const outPath = path.resolve(this.tempDataPath, packDirectory);

		const metadata = this.packsMetadata.find((p) =>
			p.path.endsWith(packDirectory)
		);
		if (!metadata) {
			throw PackError(
				`Error generating dbKeys: Compendium ${packDirectory} has no metadata in the local system.json or module.json file.`
			);
		}
		const db = new LevelDatabase(filePath, metadata);

		const { packSources, folders } = await db.getEntries();

		await this.#extactFolder(folders, packDirectory, outPath, sanitize);
		await this.#extractSource(
			packSources,
			packDirectory,
			outPath,
			sanitize
		);

		return packSources.length;
	}

	async #extactFolder(
		folders: FolderData[],
		packDirectory: string,
		outPath: string,
		sanitize: boolean
	) {
		if (folders.length > 0) {
			const getFolderPath = (
				folder: FolderData,
				parts: string[] = []
			): string => {
				if (parts.length > 3) {
					throw PackError(
						`Error: Maximum folder depth exceeded for "${folder.name}" in pack: ${packDirectory}`
					);
				}
				parts.unshift(slugify(folder.name));
				if (folder.folder) {
					// This folder is inside another folder
					const parent = folders.find((f) => f._id === folder.folder);
					if (!parent) {
						throw PackError(
							`Error: Unknown parent folder id [${folder.folder}] in pack: ${packDirectory}`
						);
					}
					return getFolderPath(parent, parts);
				}
				parts.unshift(packDirectory);
				return path.join(...parts);
			};

			for (const folder of folders) {
				this.#folderPathMap.set(folder._id, getFolderPath(folder));
				if (sanitize) {
					this.#sanitizeFolder(folder);
				}
			}
			const folderFilePath = path.resolve(outPath, '_folders.json');
			await fs.promises.writeFile(
				folderFilePath,
				this.#prettyPrintJSON(folders),
				'utf-8'
			);
		}
	}

	async #extractSource(
		packSources: DBEntry[],
		packDirectory: string,
		outPath: string,
		sanitize: boolean
	) {
		for (const source of packSources) {
			const preparedSource = this.#convertUUIDs(source, packDirectory);

			if (!this.#folderPathMap.get(preparedSource.folder ?? '')) {
				delete (preparedSource as { folder?: unknown }).folder;
			}

			if (sanitize) {
				this.#sanitizeDocument(preparedSource);
			}

			const outData = this.#prettyPrintJSON(preparedSource);

			const slug = slugify(preparedSource.name);
			const outFileName = `${slug}.json`;

			const subfolder = this.#folderPathMap.get(
				preparedSource.folder ?? ''
			);
			const outFolderPath = subfolder
				? path.resolve(this.tempDataPath, subfolder)
				: outPath;
			if (subfolder && !fs.existsSync(outFolderPath)) {
				fs.mkdirSync(outFolderPath, { recursive: true });
			}
			const outFilePath = path.resolve(outFolderPath, outFileName);

			if (fs.existsSync(outFilePath)) {
				throw PackError(
					`Error: Duplicate name "${preparedSource.name}" in pack: ${packDirectory}`
				);
			}

			await fs.promises.writeFile(outFilePath, outData, 'utf-8');
		}
	}

	#sanitizeDocument(docSource: DBEntry) {
		delete (docSource as { _stats?: unknown })._stats;
		if (isAdventure(docSource)) {
			const adventureDoc = docSource as AdventureData;
			for (const actor of adventureDoc.actors) {
				this.#sanitizeActor(actor);
			}
			for (const folder of adventureDoc.folders) {
				this.#sanitizeFolder(folder);
			}
			for (const journal of adventureDoc.journal) {
				this.#sanitizeJournal(journal);
			}
			for (const scene of adventureDoc.scenes) {
				this.#sanitizeScene(scene);
			}
		}
	}

	#sanitizeActor(actor: ActorData) {
		delete (actor as { _stats?: unknown })._stats;
		for (const items of actor.items) {
			this.#sanitizeItem(items);
		}
	}

	#sanitizeFolder(folder: FolderData) {
		delete (folder as { _stats?: unknown })._stats;
	}

	#sanitizeJournal(journal: JournalEntryData) {
		delete (journal as { _stats?: unknown })._stats;
	}

	#sanitizeScene(scene: SceneData) {
		delete (scene as { _stats?: unknown })._stats;
	}

	#sanitizeItem(item: ItemData) {
		delete (item as { _stats?: unknown })._stats;
	}

	#prettyPrintJSON(object: object): string {
		const idPattern = /^[a-z0-9]{20,}$/g;
		const allKeys = new Set<string>();
		const idKeys: string[] = [];

		JSON.stringify(object, (key, value) => {
			if (idPattern.test(key)) {
				idKeys.push(key);
			} else {
				allKeys.add(key);
			}

			return value;
		});

		const sortedKeys = Array.from(allKeys).sort().concat(idKeys);
		const newJson = JSON.stringify(object, sortedKeys, 1);

		return `${newJson}\n`;
	}

	#convertUUIDs(docSource: DBEntry, packName: string): DBEntry {
		this.#newDocIdMap[docSource._id!] = docSource.name;

		const docJSON = JSON.stringify(docSource).replace(
			/@Compendium\[/g,
			'@UUID[Compendium.'
		);

		// Link checks
		const { LINK_PATTERNS } = CompendiumPack;
		const worldItemLinks = Array.from(
			docJSON.matchAll(LINK_PATTERNS.world)
		);
		if (worldItemLinks.length > 0) {
			const linkString = worldItemLinks
				.map((match) => match[0])
				.join(', ');
			throw PackError(
				`${docSource.name} (${packName}) has links to world items: ${linkString}`
			);
		}

		const compendiumLinks = Array.from(docJSON.matchAll(LINK_PATTERNS.uuid))
			.map((match) => match[0])
			.filter((l) => !l.includes('JournalEntryPage.'));

		// Convert links by ID to links by name
		const notFound: string[] = [];
		const convertedJson = compendiumLinks.reduce(
			(partiallyConverted, linkById): string => {
				const components = new RegExp(LINK_PATTERNS.uuid.source);

				const parts = components.exec(linkById);
				if (!Array.isArray(parts)) {
					throw PackError('Unexpected error parsing compendium link');
				}

				const [packId, docType, docId] = parts.slice(1, 4);
				const packMap = this.#idsToNames[docType]?.get(packId);
				if (!packMap) {
					throw PackError(`Pack ${packId} has no ID-to-name map.`);
				}

				const docName = packMap.get(docId) ?? this.#newDocIdMap[docId];
				if (!docName) {
					notFound.push(parts[0].replace(/\{$/, ''));
					return partiallyConverted;
				}

				const idPattern = new RegExp(
					`(?<!"_?id":")${docId}(?=\\])`,
					'g'
				);
				// Remove link labels when the label is the same as the document name
				const labeledLinkPattern = (() => {
					const escapedDocName = docName.replace(
						/[-/\\^$*+?.()|[\]{}]/g,
						'\\$&'
					);
					return new RegExp(
						String.raw`(@UUID\[[^\]]+\])\{${escapedDocName}\}`
					);
				})();
				return partiallyConverted
					.replace(idPattern, docName)
					.replace(labeledLinkPattern, '$1');
			},
			docJSON
		);

		return JSON.parse(convertedJson) as DBEntry;
	}

	async #populateIdNameMap(packPath: string): Promise<void> {
		const packDirs = fs.readdirSync(packPath);

		for (const packDir of packDirs) {
			const metadata = this.packsMetadata.find(
				(p) => path.basename(p.path) === packDir
			);

			if (!metadata) {
				throw PackError(
					`Compendium at ${packDir} has no metadata in the local system.json or module.json file.`
				);
			}

			const packMap = new Map<string, string>();
			this.#idsToNames[metadata.type]?.set(metadata.name, packMap);

			const db = new LevelDatabase(
				path.resolve(packPath, packDir),
				metadata
			);
			const { packSources } = await db.getEntries();

			for (const source of packSources) {
				packMap.set(source._id, source.name);
			}
		}
	}
}

export { PackExtractor };
