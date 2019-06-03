const util = require('util');
const path = require('path');
const fs = require('fs-extra');
const replaceExt = require('replace-ext');
const csvtojson = require('csvtojson');
const glob = util.promisify(require('glob'));
const chalk = require('chalk');
const MultiProgress = require('multi-progress');

const config = require('./config');

const argv = require('yargs')
    .usage('$0 <cmd> [args]')

    .command('gen <json>', 'Gerar credenciais a partir de arquivos JSON!', yargs => {
        return yargs
            .positional('json', {
                type: 'string',
                describe: 'Arquivos JSON fonte'
            })
            .option('outputDir', {
                alias: 'o',
                describe: 'Diretório de saída',
                type: 'string',
                default: '.'
            })
            .option('layout', {
                alias: 'l',
                describe: 'Layout da credencial',
                type: 'string'
            })
            .demandOption(['outputDir', 'layout']);
    }, async argv => generateAll(argv, config))

    .demandCommand(1, 'Um comando é necessário')
    .strict(true)
    .help()
    .argv;

async function generateAll(argv, config) {
    const {json: globInput, outputDir, layout: layoutId} = argv;

    const layoutPath = path.join(__dirname, 'layouts', layoutId);
    const layoutClass = require(layoutPath);

    const inputFiles = await glob(globInput);

    await fs.mkdirp(outputDir);

    const multiProgress = new MultiProgress();

    const tasks = inputFiles.map(taskBuilder(outputDir, layoutClass, multiProgress, config));

    return await Promise.all(tasks);
}

function taskBuilder(outputDir, layoutClass, multiProgress, config) {

    return async entityFile => {
        const entity = await fs.readJson(entityFile);

        const pathObj = path.parse(entityFile);

        const csvFile = entity.csvFile || replaceExt(entityFile, '.csv');

        const outputFile = entity.outputFile || path.join(outputDir, pathObj.name + '.pdf');

        return await generate(entity, csvFile, outputFile, layoutClass, multiProgress, config);
    };
}

async function generate(entity, csvFile, outputFile, layoutClass, multiProgress, config) {

    if (config.showLogs) {
        console.log(`Generating document ${chalk.green(outputFile)} for entity ${chalk.green(entity.name)} using layout ${chalk.green(layoutId)}`);
    }

    const athletes = await readCsv(csvFile, config);

    const layout = new layoutClass(entity, athletes, outputFile, multiProgress, config);

    await layout.render();

    if (config.showLogs) {
        console.log(`Documents ${chalk.green('successfully')} generated`);
    }
}

async function readCsv(csvFile, config) {

    const rawObjects = await csvtojson({ headers: config.headers, noheader: true }).fromFile(csvFile);

    const attributeNames = Object.keys(config.attributes);

    return rawObjects.slice(config.skipLines)
        .map(obj => attributeNames.reduce((athlete, attr) => {
            athlete[attr] = obj[config.attributes[attr]];
            return athlete;
        }, {}))
        .filter(athlete => athlete.name && athlete.name.trim());
}