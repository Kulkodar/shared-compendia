import fs from 'fs';
import path from 'path';
import url from 'url';
import {
	CompendiumMetadata,
	CompendiumPack,
	PackError,
} from './lib/compendium-pack';
import systemJSON from './system.json';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

// Loads all system packs into memory for the sake of making all document name/id mappings available
const systemPacksMetadata = systemJSON.packs as unknown as CompendiumMetadata[];

const systemPacksDataPath = path.resolve(__dirname, '../system-packs');
const systemPackDirPaths = fs
	.readdirSync(systemPacksDataPath)
	.map((dirName) => path.resolve(__dirname, systemPacksDataPath, dirName))
	.filter((filePath) =>
		systemPacksMetadata.find(
			(p) => path.basename(p.path) === path.basename(filePath)
		)
	);

systemPackDirPaths.map((p) => CompendiumPack.loadJSON(p));

// Loads all packs into memory for the sake of making all document name/id mappings available
const packsDataPath = path.resolve(__dirname, '../packs');
const packDirPaths = fs
	.readdirSync(packsDataPath)
	.map((dirName) => path.resolve(__dirname, packsDataPath, dirName));

const packs = packDirPaths.map((p) => CompendiumPack.loadJSON(p));

const documentCounts = await Promise.all(
	packs.map(function (p) {
		return p.save();
	})
);
const total = documentCounts.reduce((total, c) => total + c, 0);

if (documentCounts.length > 0) {
	console.log(
		`Created ${documentCounts.length} packs with ${total} documents.`
	);
} else {
	throw PackError('No data available to build packs.');
}
