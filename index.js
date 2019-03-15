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
    
    registerFonts(pdf, config.fontsDir);

    pdf.pipe(fs.createWriteStream(outputFile, { flags: 'w+' }));

    await renderDocument(pdf, entity, athletes);

    await pdf.end();
}

async function registerFonts(pdf, fontsDir) {
    const fonts = await fsPromises.readdir(fontsDir);

    fonts.forEach(file => {
        const {name} = path.parse(file);
        pdf.registerFont(name, path.join(fontsDir, file));
    });
}

async function renderDocument(pdf, entity, athletes) {

    const logo = await fsPromises.readFile(config.background.path);

    const tagsPerPage = config.page.rows * config.page.cols;
    const numberOfPages = Math.ceil(athletes.length / tagsPerPage);

    for (let k = 0; k < athletes.length; k++) {
        const athlete = athletes[k];
        const j = k % config.page.cols;
        const i = Math.floor(k / config.page.cols) % config.page.rows;

        if (k % tagsPerPage === 0) {
            if (k > 0) {
                pdf.addPage();
            }

            await renderPageData(pdf, entity, k / tagsPerPage + 1, numberOfPages);
        }

        await renderTag(pdf, config.page.marginHz + config.tag.width * j, config.page.marginVt + config.tag.height * i, athlete, logo);
    }
}

async function renderPageData(pdf, entity, pageIndex, numberOfPages) {

    // Header
    pdf.font(config.header.font).fontSize(config.header.fontSize);

    pdf.text(entity, 0, config.page.marginVt / 2, {
        width: config.page.width,
        align: 'center'
    });

    // Page count
    pdf.font(config.pageCount.font).fontSize(config.pageCount.fontSize);

    pdf.text(`Página ${pageIndex} de ${numberOfPages}`, config.page.marginHz, config.page.height - config.pageCount.bottom, {
        width: config.page.width - config.page.marginHz * 2,
        align: 'right'
    });
}

async function renderTag(pdf, x, y, athlete, logo) {
    const hash = adler32.sum(Object.values(athlete).join(config.data.hashSeparator)).toString(16);

    const text = [hash, maskId(athlete.id), athlete.name, athlete.entity].join(config.data.qrcodeSeparator);

    const qrcodeSize = config.tag.height - 2 * config.tag.margin;

    await renderBackground(pdf, x, y, qrcodeSize, logo);

    await renderQrCode(pdf, x, y, qrcodeSize, text);

    await renderData(pdf, x, y, qrcodeSize, athlete);

    if (config.tag.hasBorder) {
        await renderBorder(pdf, x, y);
    }
}

async function renderBorder(pdf, x, y) {
    pdf.lineWidth(config.tag.borderWidth).strokeColor(config.tag.borderColor);

    pdf.roundedRect(x, y, config.tag.width, config.tag.height, config.tag.borderRadius);

    pdf.stroke();
}

async function renderBackground(pdf, x, y, qrcodeSize, logo) {

    const height = config.tag.height - config.tag.margin * 2;
    const width = height * config.background.width / config.background.height;
    const left = x + qrcodeSize + config.tag.margin + (config.tag.width - qrcodeSize - config.tag.margin - width) / 2;
    const top = y + (config.tag.height - height) / 2;

    pdf.image(logo, left, top, { width, height });
}

async function renderQrCode(pdf, x, y, qrcodeSize, text) {

    const canvas = createCanvas(qrcodeSize, qrcodeSize);

    await QRCode.toCanvas(canvas, text, {
        errorCorrectionLevel: config.tag.errorCorrectionLevel,
        margin: 0,
        width: qrcodeSize
    });

    const qrcodeBuffer = canvas.toBuffer('image/png');

    pdf.image(qrcodeBuffer, x + config.tag.margin, y + config.tag.margin);
}

async function renderData(pdf, x, y, qrcodeSize, athlete) {
    const left = x + qrcodeSize + config.tag.margin * 2;
    let top = y + config.tag.margin;

    const textOptions = {
        width: config.tag.width - qrcodeSize - config.tag.margin * 3,
        align: 'left'
    };

    const id = maskId(athlete.id);

    pdf.font(config.tag.nameFont).fontSize(config.tag.nameFontSize);
    pdf.text(id, left, top, textOptions);
    top += pdf.heightOfString(id, textOptions);

    pdf.font(config.tag.nameFont).fontSize(config.tag.nameFontSize);
    pdf.text(athlete.name, left, top, textOptions);
    top += pdf.heightOfString(athlete.name, textOptions);

    pdf.font(config.tag.font).fontSize(config.tag.fontSize);
    pdf.text(athlete.entity, left, top, textOptions);
    top += pdf.heightOfString(athlete.entity, textOptions);
}

function maskId(id) {
    return `${config.tag.idMask}${id}`.substr(-3);
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