const path = require('path');
const fs = require('fs');
const {promises: fsPromises} = require('fs');
const adler32 = require('adler32');
const QRCode = require('qrcode');
const pdfkit = require('pdfkit');
const {createCanvas, loadImage} = require('canvas');

adler32.register();

const config = {
    page: {
        dpi: 72,
        width: 595,
        height: 842,
        marginHz: 14,
        marginVt: 76,
        rows: 10,
        cols: 3
    },
    tag: {
        width: 189,
        height: 69,
        margin: 8,
        font: 'Helvetica',
        fontSize: 10,
        nameFont: 'Helvetica-Bold',
        nameFontSize: 11,
        idMask: '000',
        hasBorder: true,
        borderColor: '#999999',
        borderWidth: 1,
        borderRadius: 3
    },
    data: {
        hashSeparator: ',',
        qrcodeSeparator: '\n'
    },
    background: {
        width: 1039,
        height: 1023,
        path: path.join(__dirname, 'background.png')
    }
};

generate(process.argv[2], process.argv[3])
    .then(() => console.log('success'))
    .catch(err => console.error(err));

async function generate(inputFile, outputFile) {

    const athletes = require(path.resolve(inputFile));

    const pdf = new pdfkit({
        margins: {
            left: config.page.marginHz,
            right: config.page.marginHz,
            top: config.page.marginVt,
            bottom: config.page.marginVt
        },
        dpi: config.page.dpi,
        size: [config.page.width, config.page.height]
    });

    pdf.pipe(fs.createWriteStream(outputFile, { flags: 'w+' }));

    await renderAllTags(pdf, athletes);

    await pdf.end();
}

async function renderAllTags(pdf, athletes) {

    const logo = await fsPromises.readFile(config.background.path);

    const tagsPerPage = config.page.rows * config.page.cols;

    for (let k = 0; k < athletes.length; k++) {
        const athlete = athletes[k];
        const j = k % config.page.cols;
        const i = Math.floor(k / config.page.cols) % config.page.rows;

        if (k % tagsPerPage === 0 && k > 0) {
            pdf.addPage();
        }

        await renderTag(pdf, config.page.marginHz + config.tag.width * j, config.page.marginVt + config.tag.height * i, athlete, logo);
    }
}

async function renderTag(pdf, x, y, athlete, logo) {
    const hash = adler32.sum(Object.values(athlete).join(config.data.hashSeparator)).toString(16);

    const text = [hash, athlete.id, athlete.name, athlete.institution].join(config.data.qrcodeSeparator);

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
        errorCorrectionLevel: 'M',
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

    const id = `${config.tag.idMask}${athlete.id}`.substr(-3);

    pdf.font(config.tag.nameFont).fontSize(config.tag.nameFontSize);
    pdf.text(id, left, top, textOptions);
    top += pdf.heightOfString(id, textOptions);

    pdf.font(config.tag.nameFont).fontSize(config.tag.nameFontSize);
    pdf.text(athlete.name, left, top, textOptions);
    top += pdf.heightOfString(athlete.name, textOptions);

    pdf.font(config.tag.font).fontSize(config.tag.fontSize);
    pdf.text(athlete.institution, left, top, textOptions);
    top += pdf.heightOfString(athlete.institution, textOptions);
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