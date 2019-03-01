const path = require('path');
const crypto = require('crypto');
const {promises: fsPromises} = require('fs');
const adler32 = require('adler32');
const QRCode = require('qrcode');
const pngjs = require('pngjs');
const {createCanvas, loadImage} = require('canvas');

adler32.register();

const HASH_SEP = ',';
const QRC_SEP = '\n';
const CANVAS_SIZE = 72;
const MARGIN = 0;
const LOGO_PATH = path.join(__dirname, 'logo.png');
const LOGO_SIZE = CANVAS_SIZE / 3;

let i = 2;

const athlete = {
    id: process.argv[i++],
    name: process.argv[i++],
    institution: process.argv[i++],
    rg: process.argv[i++],
    cpf: process.argv[i++],
    birthdate: process.argv[i++],
};

generate(athlete);

async function generate(athlete) {

//    const hash = crypto.createHash('adler32');

//    hash.update(Object.values(athlete).join(HASH_SEP), 'ascii');

//    const digest = hash.digest('hex');
    const hash = adler32.sum(Object.values(athlete).join(HASH_SEP)).toString(16);

    const text = [hash, athlete.id, athlete.name, athlete.institution].join(QRC_SEP);

    const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);

    await QRCode.toCanvas(canvas, text, { errorCorrectionLevel: 'H', margin: MARGIN, width: CANVAS_SIZE });

    const ctx = canvas.getContext('2d');
    const image = await loadImage(LOGO_PATH);
    const w = LOGO_SIZE;
    const x = (CANVAS_SIZE - w) / 2;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, x, w, w);
    ctx.drawImage(image, x, x, w, w);

    console.log(canvas.toDataURL());

    return await fsPromises.writeFile(`${athlete.id}.png`, canvas.toBuffer('image/png'));
}
