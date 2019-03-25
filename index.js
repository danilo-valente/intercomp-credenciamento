const util = require('util');
const path = require('path');
const fs = require('fs-extra');
const csvtojson = require('csvtojson');
const glob = util.promisify(require('glob'));
const chalk = require('chalk');

const config = require('./config');

const argv = require('yargs')
    .usage('$0 <cmd> [args]')

    .command('gen <csv>', 'Gerar credenciais a partir de arquivos CSV!', yargs => {
        return yargs
            .positional('csv', {
                type: 'string',
                describe: 'Arquivos CSV fonte'
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
    const {csv: globInput, outputDir, layout: layoutId} = argv;

    const layoutPath = path.join(__dirname, 'layouts', layoutId);
    const layoutClass = require(layoutPath);

    const inputFiles = await glob(globInput);

    await fs.mkdirp(outputDir);

    const tasks = inputFiles.map(inputFile => {
        const basename = path.basename(inputFile, path.extname(inputFile));
        const outputFile = path.join(outputDir, basename + '.pdf');

        const entity = basename.match(/\w+/g).map(w => w[0].toUpperCase() + w.substr(1)).join(' ');

        console.log(`Generating document ${chalk.green(outputFile)} from ${chalk.green(inputFile)} for entity ${chalk.green(entity)} using layout ${chalk.green(layoutId)}`);

        return generate(inputFile, outputFile, layoutClass, entity, config);
    });

    for (let i = 0; i < tasks.length; i++) {
        await tasks[i];
    }
}

async function generate(inputFile, outputFile, layoutClass, entity, config) {

    const athletes = await csvtojson({ headers: config.headers }).fromFile(inputFile);

    const layout = new layoutClass(config, entity, athletes, outputFile);

    await layout.render();

    console.log(`Documents ${chalk.green('successfully')} generated`)
}