import process from 'process';
import { PackExtractor } from './lib/extractor';

const extractor = new PackExtractor();

try {
	await extractor.run('dist', 'packs', true);
	console.log(`Extraction complete.`);
} catch (error) {
	console.error(error);
	process.exit(1);
}
