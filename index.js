const util = require('util');
const path = require('path');
const fs = require('fs');
const {promises: fsPromises} = fs;
const adler32 = require('adler32');
const QRCode = require('qrcode');
const pdfkit = require('pdfkit');
const csvtojson = require('csvtojson');
const glob = util.promisify(require('glob'));
const {createCanvas, loadImage} = require('canvas');

const config = require('./config');

adler32.register();

generateAll(process.argv[2], process.argv[3])
    .then(() => console.log('success'))
    .catch(err => console.error(err));

async function generateAll(globInput, outputDir) {

    const inputFiles = await glob(globInput);

    const tasks = inputFiles.map(inputFile => {
        const basename = path.basename(inputFile, path.extname(inputFile));
        const outputFile = path.join(outputDir, basename + '.pdf');

        const entity = basename.match(/\w+/g).map(w => w[0].toUpperCase() + w.substr(1)).join(' ');

        console.log(`Generating file ${outputFile} from ${inputFile} for entity ${entity}`);

        return generate(inputFile, outputFile, entity);
    });

    for (let i = 0; i < tasks.length; i++) {
        await tasks[i];
    }
}

async function generate(inputFile, outputFile, entity) {

    const athletes = await csvtojson({ headers: config.headers }).fromFile(inputFile);

    const pdf = new pdfkit({
        margin: 0,
        dpi: config.page.dpi,
        size: [config.page.width, config.page.height]
    });
    
    await registerFonts(pdf, config.fontsDir);

    pdf.pipe(fs.createWriteStream(outputFile, { flags: 'w+' }));

    await renderDocument(pdf, entity, athletes);

    await pdf.end();
}

// async function renderLogo(canvas, canvasSize) {

//     const ctx = canvas.getContext('2d');
//     const image = await loadImage(LOGO_PATH);
//     const w = canvasSize / 3;
//     const x = (canvasSize - w) / 2;

//     ctx.fillStyle = '#ffffff';
//     ctx.fillRect(x, x, w, w);
//     ctx.drawImage(image, x, x, w, w);
// }