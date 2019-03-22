const util = require('util');
const path = require('path');
const csvtojson = require('csvtojson');
const glob = util.promisify(require('glob'));
const chalk = require('chalk');

const config = require('./config');

generateAll(process.argv[2], process.argv[3], process.argv[4])
    .then(() => console.log(`Documents ${chalk.green('successfully')} generated`))
    .catch(err => console.error(err));

async function generateAll(globInput, outputDir, layoutId) {

    const layoutPath = path.join(__dirname, 'layouts', layoutId);
    const layoutClass = require(layoutPath);

    const inputFiles = await glob(globInput);

    const tasks = inputFiles.map(inputFile => {
        const basename = path.basename(inputFile, path.extname(inputFile));
        const outputFile = path.join(outputDir, basename + '.pdf');

        const entity = basename.match(/\w+/g).map(w => w[0].toUpperCase() + w.substr(1)).join(' ');

        console.log(`Generating document ${chalk.green(outputFile)} from ${chalk.green(inputFile)} for entity ${chalk.green(entity)} using layout ${chalk.green(layoutId)}`);

        return generate(inputFile, outputFile, layoutClass, entity);
    });

    for (let i = 0; i < tasks.length; i++) {
        await tasks[i];
    }
}

async function generate(inputFile, outputFile, layoutClass, entity) {

    const athletes = await csvtojson({ headers: config.headers }).fromFile(inputFile);

    const layout = new layoutClass(config, entity, athletes, outputFile);

    layout.render();
}