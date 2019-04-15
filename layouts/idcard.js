const path = require('path');
const fs = require('fs-extra');
const adler32 = require('adler32');
const QRCode = require('qrcode');
const {createCanvas, loadImage} = require('canvas');

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
        marginVt: 38,
        rows: 6,
        cols: 2
    },
    header: {
        font: 'Comfortaa-Bold',
        fontSize: 16,
        fontColor: '#363636'
    },
    pageCount: {
        font: 'Raleway-Regular',
        fontSize: 10,
        fontColor: '#363636',
        right: 14,
        bottom: 32
    },
    tag: {
        width: 277.5,
        height: 123,
        margin: 0,
        padding: 6,
        background: '#ffffff',
        exceptionalBackground: '#ffffaa',
        font: 'Raleway-Regular',
        fontSize: 12,
        fontColor: '#363636',
        nameFont: 'Raleway-Bold',
        nameFontSize: 14,
        nameFontColor: '#363636',
        idMask: '000',
        hasBorder: true,
        borderColor: '#999999',
        borderWidth: 1,
        borderRadius: 0,
        errorCorrectionLevel: 'Q',
        logo: 'logo-30-anos.png',
        exceptional: {
            color: '#ff0000',
            radius: 8,
            borderColor: '#990000',
            borderWidth: 2
        }
    },
    data: {
        hashSeparator: ',',
        qrcodeSeparator: '\n'
    },
    background: {
        width: 1039,
        height: 1023,
        image: 'background-patrocinador.png'
    }
};

module.exports = class IdCardLayout extends Layout {

    id() {
        return 'idcard';
    }

    getReferenceUrl() {
        return null;
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

            await this._renderTag(config.page.marginHz + (config.tag.width + config.tag.margin) * j, config.page.marginVt + (config.tag.height + config.tag.margin) * i, athlete, logo);
        }
    }

    async _renderPageData(pageIndex, numberOfPages) {
        const {_pdf: pdf, _entity: entity} = this;

        // Header
        pdf.font(config.header.font).fontSize(config.header.fontSize).fillColor(config.header.fontColor);

        pdf.text(entity, 0, config.page.marginVt / 2, {
            width: config.pdf.size[0],
            align: 'center'
        });

        // Page count
        pdf.font(config.pageCount.font).fontSize(config.pageCount.fontSize).fillColor(config.header.fontColor);

        pdf.text(`Página ${pageIndex} de ${numberOfPages}`, config.page.marginHz, config.pdf.size[1] - config.pageCount.bottom, {
            width: config.pdf.size[0] - config.page.marginHz * 2,
            align: 'right'
        });
    }

    async _renderTag(x, y, athlete, logo) {
        const hash = adler32.sum(Object.values(athlete).join(config.data.hashSeparator)).toString(16);

        const text = [hash, maskId(athlete.id), athlete.name, athlete.entity].join(config.data.qrcodeSeparator);

        const qrcodeSize = config.tag.height - 2 * config.tag.padding;

        await this._renderBackground(x, y, qrcodeSize, logo, athlete);

        await this._renderQrCode(x, y, qrcodeSize, text, athlete);

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

    async _renderBackground(x, y, qrcodeSize, logo, athlete) {
        const {_pdf: pdf} = this;

        const height = config.tag.height - config.tag.padding * 2;
        const width = height * config.background.width / config.background.height;
        const left = x + qrcodeSize + config.tag.padding + (config.tag.width - qrcodeSize - config.tag.padding - width) / 2;
        const top = y + (config.tag.height - height) / 2;

        if (athlete.exceptional) {
            pdf.fillColor(config.tag.exceptionalBackground);
        } else {
            pdf.fillColor(config.tag.background);
        }

        pdf.rect(x, y, config.tag.width, config.tag.height).fill();

        pdf.image(logo, left, top, { width, height });
    }

    async _renderQrCode(x, y, qrcodeSize, text, athlete) {
        const {_pdf: pdf} = this;

        const canvas = createCanvas(qrcodeSize, qrcodeSize);

        await QRCode.toCanvas(canvas, text, {
            errorCorrectionLevel: config.tag.errorCorrectionLevel,
            margin: 0,
            width: qrcodeSize,
            color: {
                light: athlete.exceptional ? config.tag.exceptionalBackground : config.tag.background
            }
        });

        await this._renderLogo(canvas, qrcodeSize, athlete);

        const qrcodeBuffer = canvas.toBuffer('image/png');

        pdf.image(qrcodeBuffer, x + config.tag.padding, y + config.tag.padding);
    }

    async _renderLogo(canvas, canvasSize, athlete) {

        const logoPath = path.join(this._globalConfig.imagesDir, config.tag.logo);

        const ctx = canvas.getContext('2d');
        const image = await loadImage(logoPath);
        const w = canvasSize / 3;
        const x = (canvasSize - w) / 2;

        ctx.fillStyle = athlete.exceptional ? config.tag.exceptionalBackground : config.tag.background;
        ctx.fillRect(x, x, w, w);
        ctx.drawImage(image, x, x, w, w);

        return ctx;
    }

    async _renderData(x, y, qrcodeSize, athlete) {
        const {_pdf: pdf} = this;

        const left = x + qrcodeSize + config.tag.padding * 2;
        let top = y + config.tag.padding;

        const textOptions = {
            width: config.tag.width - qrcodeSize - config.tag.padding * 3,
            align: 'left'
        };

        const id = maskId(athlete.id);

        pdf.font(config.tag.nameFont).fontSize(config.tag.nameFontSize).fillColor(config.tag.nameFontColor);
        pdf.text(id, left, top, textOptions);
        top += pdf.heightOfString(id, textOptions);

        pdf.font(config.tag.nameFont).fontSize(config.tag.nameFontSize).fillColor(config.tag.nameFontColor);
        pdf.text(athlete.name, left, top, textOptions);
        top += pdf.heightOfString(athlete.name, textOptions);

        pdf.font(config.tag.font).fontSize(config.tag.fontSize).fillColor(config.tag.fontColor);
        pdf.text(athlete.entity, left, top, textOptions);
        top += pdf.heightOfString(athlete.entity, textOptions);
    }
};

function maskId(id) {
    return `${config.tag.idMask}${id}`.substr(-3);
}
