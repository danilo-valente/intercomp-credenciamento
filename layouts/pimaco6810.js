const Layout = require('../Layout');

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
    header: {
        font: 'Comfortaa-Bold',
        fontSize: 24
    },
    pageCount: {
        font: 'Raleway-Regular',
        fontSize: 10,
        right: 14,
        bottom: 38
    },
    tag: {
        width: 189,
        height: 69,
        margin: 8,
        font: 'Raleway-Regular',
        fontSize: 10,
        nameFont: 'Raleway-Bold',
        nameFontSize: 11,
        idMask: '000',
        hasBorder: true,
        borderColor: '#999999',
        borderWidth: 1,
        borderRadius: 3,
        errorCorrectionLevel: 'Q'
    },
    background: {
        width: 1039,
        height: 1023,
        path: path.join(__dirname, '..', 'resources', 'background.png')
    }
};

module.exports = class Pimaco6180Layout extends Layout {

    id() {
        return 'pimaco-6180';
    }

    getReferenceUrl() {
        return 'http://www.pimaco.com.br/produto/108/6180-carta-100-folhas';
    }

    async init() {

    }

    async renderDocument() {

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

                await this._renderPageData(pdf, entity, k / tagsPerPage + 1, numberOfPages);
            }

            await renderTag(pdf, config.page.marginHz + config.tag.width * j, config.page.marginVt + config.tag.height * i, athlete, logo);
        }
    }

    async _renderPageData(pdf, entity, pageIndex, numberOfPages) {

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

    async _renderTag(pdf, x, y, athlete, logo) {
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

    async _renderBorder(pdf, x, y) {
        pdf.lineWidth(config.tag.borderWidth).strokeColor(config.tag.borderColor);

        pdf.roundedRect(x, y, config.tag.width, config.tag.height, config.tag.borderRadius);

        pdf.stroke();
    }

    async _renderBackground(pdf, x, y, qrcodeSize, logo) {

        const height = config.tag.height - config.tag.margin * 2;
        const width = height * config.background.width / config.background.height;
        const left = x + qrcodeSize + config.tag.margin + (config.tag.width - qrcodeSize - config.tag.margin - width) / 2;
        const top = y + (config.tag.height - height) / 2;

        pdf.image(logo, left, top, { width, height });
    }

    async _renderQrCode(pdf, x, y, qrcodeSize, text) {

        const canvas = createCanvas(qrcodeSize, qrcodeSize);

        await QRCode.toCanvas(canvas, text, {
            errorCorrectionLevel: config.tag.errorCorrectionLevel,
            margin: 0,
            width: qrcodeSize
        });

        const qrcodeBuffer = canvas.toBuffer('image/png');

        pdf.image(qrcodeBuffer, x + config.tag.margin, y + config.tag.margin);
    }

    async _renderData(pdf, x, y, qrcodeSize, athlete) {
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
};

function maskId(id) {
    return `${config.tag.idMask}${id}`.substr(-3);
}