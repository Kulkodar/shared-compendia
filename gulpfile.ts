/* eslint-disable @typescript-eslint/no-require-imports */
const gulp = require('gulp');
const ts = require('gulp-typescript');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const project = ts.createProject('tsconfig.json');
const {execSync} = require('child_process');

gulp.task('package', async () => {
	return new Promise((resolve) => {
		const packageParth = path.resolve(process.cwd(), 'package');

		fs.rmSync(packageParth, {
			recursive: true,
			force: true,
		});

		fs.mkdirSync(packageParth);

		const zipName = `module.zip`;
		const zipFile = fs.createWriteStream(path.join('package', zipName));
		const zip = archiver('zip', { zlib: { level: 9 } });
		zipFile.on('close', () => {
			console.log(zip.pointer() + ' total bytes');
			console.log(`Zip file ${zipName} has been written`);
		});

		zip.pipe(zipFile);
		zip.directory('dist/', '.');
		zip.finalize();

		gulp.src('dist/module.json').pipe(gulp.dest('package/'));

		resolve('finished');
	});
});

gulp.task('compile', () => {
	return gulp.src('src/**/*.ts').pipe(project()).pipe(gulp.dest('dist/'));
});

gulp.task('copy', async () => {
	return new Promise((resolve) => {
		gulp.src(['static/**', '!static/module.json']).pipe(gulp.dest('dist/'));
		const manifestPath = path.resolve(
			process.cwd(),
			'static',
			'module.json'
		);
		const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

		const gitVersionString = execSync(
			'git describe --tags --always',
			{
				encoding: 'utf8',
			}
		);

		const version = gitVersionString.trim();

		manifest.version = version;
		manifest.manifest =
			'https://github.com/Kulkodar/shared-compendia/releases/latest/download/module.json';
		manifest.download = `https://github.com/Kulkodar/shared-compendia/releases/download/${version}/module.zip`;

		fs.writeFileSync('dist/module.json', JSON.stringify(manifest), 'utf-8');
		resolve('finished');
	});
});

gulp.task('build', gulp.parallel('compile', 'copy'));
