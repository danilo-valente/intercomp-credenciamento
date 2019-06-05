const util = require('util');
const path = require('path');
const fs = require('fs-extra');
const replaceExt = require('replace-ext');
const glob = util.promisify(require('glob'));
const MultiProgress = require('multi-progress');

const config = require('./config');
const EntityCredentials = require('./EntityCredentials');

const argv = require('yargs')
    .usage('$0 <cmd> [args]')

    .command('gen <json>', 'Generate credentials from JSON files!', yargs => {
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
            .option('includeMissing', {
                describe: 'Include athletes with missing information',
                type: 'boolean',
                default: config.includeMissing
            })
            .demandOption(['outputDir', 'layout']);
    }, async argv => generateAll(argv, config))

    .command('val <json>', 'Validate registrations from JSON files!', yargs => {
        return yargs
            .positional('json', {
                type: 'string',
                describe: 'Source JSON file'
            });
    }, async argv => validateAll(argv, config))

    .demandCommand(1, 'Command required')
    .strict(true)
    .help()
    .argv;

async function generateAll(argv, config) {
    const {json: globInput, outputDir, layout: layoutId, log: showLogs, includeMissing} = argv;

    const layoutPath = path.join(__dirname, 'layouts', layoutId);
    const layoutClass = require(layoutPath);

    const inputFiles = await glob(globInput);

    await fs.mkdirp(outputDir);

    const multiProgress = new MultiProgress();

    return await Promise.all(inputFiles.map(async entityFile => {

        const {entity, credentials} = await readEntity(entityFile, {
            ...config,
            showLogs,
            includeMissing
        });

        const pathObj = path.parse(entityFile);

        const outputFile = entity.outputFile || path.join(outputDir, pathObj.name + '.pdf');

        await credentials.setup();

        return await credentials.generate(outputFile, layoutClass, multiProgress);
    }));
}

async function validateAll(argv, config) {
    const {json: globInput} = argv;

    const inputFiles = await glob(globInput);

    return await Promise.all(inputFiles.map(async entityFile => {

        const {credentials} = await readEntity(entityFile, config);

        return await credentials.setup();
    }));
}

async function assembleAll(argv, config) {
    // TODO
}

async function readEntity(entityFile, config) {

    const entity = await fs.readJson(entityFile);

    const csvFile = entity.csvFile || replaceExt(entityFile, '.csv');

    const credentials = new EntityCredentials(entity, csvFile, config);

    return {entity, credentials};
}