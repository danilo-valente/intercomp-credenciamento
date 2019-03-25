const path = require('path');
const fs = require('fs-extra');
const adler32 = require('adler32');
const QRCode = require('qrcode');
const {createCanvas} = require('canvas');

const Layout = require('../Layout');

adler32.register();

const config = {
    pdf: {
        margin: 0,
        dpi: 72,
        size: [595, 842]
    },
    page: {
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
    data: {
        hashSeparator: ',',
        qrcodeSeparator: '\n'
    },
    background: {
        width: 1039,
        height: 1023,
        image: 'background.png'
    }
};

module.exports = class Pimaco6180Layout extends Layout {

    id() {
        return 'pimaco6180';
    }

    getReferenceUrl() {
        return 'http://www.pimaco.com.br/produto/108/6180-carta-100-folhas';
    }

    pdfConfig() {
        return config.pdf;
    }

    async renderDocument() {
        const {_pdf: pdf, _athletes: athletes} = this;

        const backgroundPath = path.join(this._globalConfig.imagesDir, config.background.image);
        const logo = await fs.readFile(backgroundPath);

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

                await this._renderPageData(k / tagsPerPage + 1, numberOfPages);
            }

            await this._renderTag(config.page.marginHz + config.tag.width * j, config.page.marginVt + config.tag.height * i, athlete, logo);
        }
    }

    async _renderPageData(pageIndex, numberOfPages) {
        const {_pdf: pdf, _entity: entity} = this;

        // Header
        pdf.font(config.header.font).fontSize(config.header.fontSize);

        pdf.text(entity, 0, config.page.marginVt / 2, {
            width: config.pdf.size[0],
            align: 'center'
        });

        // Page count
        pdf.font(config.pageCount.font).fontSize(config.pageCount.fontSize);

        pdf.text(`Página ${pageIndex} de ${numberOfPages}`, config.page.marginHz, config.pdf.size[1] - config.pageCount.bottom, {
            width: config.pdf.size[0] - config.page.marginHz * 2,
            align: 'right'
        });
    }

    async _renderTag(x, y, athlete, logo) {
        const hash = adler32.sum(Object.values(athlete).join(config.data.hashSeparator)).toString(16);

        const text = [hash, maskId(athlete.id), athlete.name, athlete.entity].join(config.data.qrcodeSeparator);

        const qrcodeSize = config.tag.height - 2 * config.tag.margin;

        await this._renderBackground(x, y, qrcodeSize, logo);

        await this._renderQrCode(x, y, qrcodeSize, text);

        await this._renderData(x, y, qrcodeSize, athlete);

        if (config.tag.hasBorder) {
            await this._renderBorder(x, y);
        }
    }

    async _renderBorder(x, y) {
        const {_pdf: pdf} = this;

        pdf.lineWidth(config.tag.borderWidth).strokeColor(config.tag.borderColor);

        pdf.roundedRect(x, y, config.tag.width, config.tag.height, config.tag.borderRadius);

        pdf.stroke();
    }

    async _renderBackground(x, y, qrcodeSize, logo) {
        const {_pdf: pdf} = this;

        const height = config.tag.height - config.tag.margin * 2;
        const width = height * config.background.width / config.background.height;
        const left = x + qrcodeSize + config.tag.margin + (config.tag.width - qrcodeSize - config.tag.margin - width) / 2;
        const top = y + (config.tag.height - height) / 2;

        pdf.image(logo, left, top, { width, height });
    }

    async _renderQrCode(x, y, qrcodeSize, text) {
        const {_pdf: pdf} = this;

        const canvas = createCanvas(qrcodeSize, qrcodeSize);

        await QRCode.toCanvas(canvas, text, {
            errorCorrectionLevel: config.tag.errorCorrectionLevel,
            margin: 0,
            width: qrcodeSize
        });

        const qrcodeBuffer = canvas.toBuffer('image/png');

        pdf.image(qrcodeBuffer, x + config.tag.margin, y + config.tag.margin);
    }

    async _renderData(x, y, qrcodeSize, athlete) {
        const {_pdf: pdf} = this;

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