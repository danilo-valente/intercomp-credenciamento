const util = require('util');
const path = require('path');
const fs = require('fs-extra');
const replaceExt = require('replace-ext');
const glob = util.promisify(require('glob'));
const chalk = require('chalk');
const MultiProgress = require('multi-progress');

const config = require('./config');
const EntityCredentials = require('./EntityCredentials');

const argv = require('yargs')
    .usage('$0 <cmd> [args]')

    .command('gen <json>', 'Generate credentials from JSON files', yargs => {
        return yargs
            .positional('json', {
                type: 'string',
                describe: 'Source JSON file'
            })
            .option('outputDir', {
                alias: 'o',
                describe: 'Output folder',
                type: 'string',
                default: '.'
            })
            .option('layout', {
                alias: 'l',
                describe: 'Credentials layout name',
                type: 'string'
            })
            .option('log', {
                describe: 'Show log information',
                type: 'boolean',
                default: config.showLogs
            })
            .option('warn', {
                describe: 'Show warning information',
                type: 'boolean',
                default: config.showWarnings
            })
            .option('noValidate', {
                describe: 'Whether to include or exclude athletes which do not belong to allowed courses',
                type: 'boolean',
                default: config.validateCourse
            })
            .option('includeMissing', {
                describe: 'Include athletes with missing information',
                type: 'boolean',
                default: config.includeMissing
            })
            .demandOption(['outputDir', 'layout']);
    }, async argv => generateAll(argv, config))

    .command('val <json>', 'Validate registrations from JSON files', yargs => {
        return yargs
            .positional('json', {
                type: 'string',
                describe: 'Source JSON file'
            })
            .option('log', {
                describe: 'Show log information',
                type: 'boolean',
                default: config.showLogs
            })
            .option('warn', {
                describe: 'Show warning information',
                type: 'boolean',
                default: config.showWarnings
            })
            .option('noValidate', {
                describe: 'Whether to include or exclude athletes which do not belong to allowed courses',
                type: 'boolean',
                default: config.validateCourse
            })
            .option('includeMissing', {
                describe: 'Include athletes with missing information',
                type: 'boolean',
                default: config.includeMissing
            });
    }, async argv => validateAll(argv, config))

    .command('csv <json>', 'Generate athletes list from JSON files', yargs => {
        return yargs
            .positional('json', {
                type: 'string',
                describe: 'Source JSON file'
            })
            .option('output', {
                alias: 'o',
                describe: 'Output file',
                type: 'string'
            })
            .option('log', {
                describe: 'Show log information',
                type: 'boolean',
                default: config.showLogs
            })
            .option('warn', {
                describe: 'Show warning information',
                type: 'boolean',
                default: config.showWarnings
            })
            .option('noValidate', {
                describe: 'Whether to include or exclude athletes which do not belong to allowed courses',
                type: 'boolean',
                default: config.validateCourse
            })
            .option('includeMissing', {
                describe: 'Include athletes with missing information',
                type: 'boolean',
                default: config.includeMissing
            })
            .demandOption(['output']);
    }, async argv => assembleAll(argv, config))

    .demandCommand(1, 'Command required')
    .strict(true)
    .help()
    .argv;

async function generateAll(argv, config) {
    const {json: globInput, outputDir, layout: layoutId, log: showLogs, warn: showWarnings, noValidate, includeMissing} = argv;

    const layoutPath = path.join(__dirname, 'layouts', layoutId);
    const layoutClass = require(layoutPath);

    const inputFiles = await glob(globInput);

    await fs.mkdirp(outputDir);

    const multiProgress = new MultiProgress();

    return await Promise.all(inputFiles.map(async entityFile => {

        const {entity, credentials} = await readEntity(entityFile, {
            ...config,
            showLogs,
            showWarnings,
            noValidate,
            includeMissing
        });

        const pathObj = path.parse(entityFile);

        const outputFile = entity.outputFile || path.join(outputDir, pathObj.name + '.pdf');

        await credentials.setup();

        return await credentials.generate(outputFile, layoutClass, multiProgress);
    }));
}

async function validateAll(argv, config) {
    const {json: globInput, log: showLogs, warn: showWarnings, noValidate, includeMissing} = argv;

    const inputFiles = await glob(globInput);

    return await Promise.all(inputFiles.map(async entityFile => {

        const {credentials} = await readEntity(entityFile, {
            ...config,
            showLogs,
            showWarnings,
            noValidate,
            includeMissing
        });

        return await credentials.setup();
    }));
}

async function assembleAll(argv, config) {
    const {json: globInput, output, log: showLogs, warn: showWarnings, noValidate,includeMissing} = argv;

    const inputFiles = await glob(globInput);

    const multiProgress = new MultiProgress();

    const readingBar = multiProgress.newBar(chalk.green('Reading') + ' [:bar] :percent | ETA: :etas', {
        ...config.progressBar,
        total: inputFiles.length
    });

    const athleteLists = await Promise.all(inputFiles.map(async entityFile => {

        const {credentials} = await readEntity(entityFile, {
            ...config,
            showLogs,
            showWarnings,
            noValidate,
            includeMissing
        });

        await credentials.setup();

        readingBar.tick();

        return credentials.athletes;
    }));

    const athletes = athleteLists.reduce((athletes, list) => athletes.concat(list), []);

    const processingBar = multiProgress.newBar(chalk.green('Processing') + ' [:bar] :percent | ETA: :etas', {
        ...config.progressBar,
        total: athletes.length
    });

    const rows = athletes
        .map(athlete => config.csvExport.columns.reduce((row, mapper) => {

            const newRow = row.concat(`"${mapper(athlete)}"`);

            processingBar.tick();

            return newRow;
        }, []));

    return exportCsv(output, config.csvExport.headers, rows, config, multiProgress);
}

async function exportCsv(outputFile, headers, rows, config, multiProgress) {

    const exportingBar = multiProgress.newBar(chalk.green('Exporting') + ' [:bar] :percent | ETA: :etas', {
        ...config.progressBar,
        total: rows.length
    });

    const outputStream = fs.createWriteStream(outputFile);

    outputStream.write(headers.join(config.csvExport.separator) + '\n');

    rows.forEach(row => {
        outputStream.write(row.join(config.csvExport.separator) + '\n');

        exportingBar.tick();
    });

    outputStream.end();
}

async function readEntity(entityFile, config) {

    const entity = await fs.readJson(entityFile);

    const csvFile = entity.csvFile || replaceExt(entityFile, '.csv');

    const credentials = new EntityCredentials(entity, csvFile, config);

    return {entity, credentials};
}
