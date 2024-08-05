import fs from 'fs';
import path from 'path';
import prompts from 'prompts';

const dataPath: string | undefined = (
	await prompts({
		type: 'text',
		name: 'value',
		format: (v: string) => v.replace(/\W*$/, '').trim(), // trim trailing /
		message: `Enter the full path to your Foundry data folder.`,
	})
).value;

if (!dataPath || !/\bData$/.test(dataPath)) {
	console.error(`"${dataPath}" does not look like a Foundry data folder.`);
	process.exit(1);
}

const dataPathStats = fs.lstatSync(dataPath, { throwIfNoEntry: false });
if (!dataPathStats?.isDirectory()) {
	console.error(`No folder found at "${dataPath}"`);
	process.exit(1);
}

const symlinkPath = path.resolve(
	dataPath,
	'modules',
	'kulkodars-shared-compendia'
);
const symlinkStats = fs.lstatSync(symlinkPath, { throwIfNoEntry: false });
if (symlinkStats) {
	const atPath = symlinkStats.isDirectory()
		? 'folder'
		: symlinkStats.isSymbolicLink()
			? 'symlink'
			: 'file';
	const proceed: boolean = (
		await prompts({
			type: 'confirm',
			name: 'value',
			initial: false,
			message: `A "kulkodars-shared-compendia" ${atPath} already exists in the "modules" subfolder. Replace with new symlink?`,
		})
	).value;
	if (!proceed) {
		console.log('Aborting.');
		process.exit();
	}
}

function clear(path: string) {
	const symlinkStats = fs.lstatSync(path, { throwIfNoEntry: false });
	if (symlinkStats?.isDirectory()) {
		fs.rmSync(path, { recursive: true, force: true });
	} else if (symlinkStats) {
		fs.unlinkSync(path);
	}
}

try {
	const systemPackPath = path.resolve(dataPath, 'systems', 'pf2e', 'packs');
	const systemJsonPath = path.resolve(
		dataPath,
		'systems',
		'pf2e',
		'system.json'
	);
	const systemPackSymlinkPath = path.resolve(process.cwd(), 'build', 'packs');
	const systemJsonSymlinkPath = path.resolve(
		process.cwd(),
		'build',
		'system.json'
	);

	clear(symlinkPath);
	clear(systemPackSymlinkPath);
	clear(systemJsonSymlinkPath);

	fs.symlinkSync(path.resolve(process.cwd(), 'dist'), symlinkPath);
	fs.symlinkSync(systemPackPath, systemPackSymlinkPath);
	fs.symlinkSync(systemJsonPath, systemJsonSymlinkPath);
} catch (error) {
	if (error instanceof Error) {
		console.error(
			`An error was encountered trying to create a symlink: ${error.message}`
		);
		process.exit(1);
	}
}

console.log(`Symlink successfully created at "${symlinkPath}"!`);
