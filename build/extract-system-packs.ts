import process from 'process';
import { PackExtractor } from './lib/extractor';

const extractor = new PackExtractor();

try {
	await extractor.run('build', 'system-packs', false);
	console.log(`Extraction complete.`);
} catch (error) {
	console.error(error);
	process.exit(1);
}
