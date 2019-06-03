const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const adler32 = require('adler32');
const QRCode = require('qrcode');
const svg2pdfkit = require('svg-to-pdfkit');
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
        marginTop: 22,
        marginBottom: 16,
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
        exceptionalBackground: '#ffbfd6',
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
        logo: 'logo-30-anos.svg',
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
        width: 1565,
        height: 800,
        image: 'logo-vtex.svg'
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
        const {_pdf: pdf, _athletes: athletes, _entity: entity} = this;

        const backgroundPath = path.join(this._globalConfig.imagesDir, config.background.image);
        const backgroundImage = await fs.readFile(backgroundPath);
        this._backgroundImage = backgroundImage.toString('utf8');

        const qrcodeLogoPath = path.join(this._globalConfig.imagesDir, config.tag.logo);
        const qrcodeLogoImage = await fs.readFile(qrcodeLogoPath);
        this._qrcodeLogoImage = qrcodeLogoImage.toString('utf8');

        const tagsPerPage = config.page.rows * config.page.cols;
        const numberOfPages = Math.ceil(athletes.length / tagsPerPage);

        const progressBar = this._multiProgress.newBar(chalk.green(entity) + '\t[:bar] :percent | ETA: :etas', {
            complete: '█',
            incomplete: '░',
            width: 30,
            total: athletes.length
        });

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

            await this._renderTag(config.page.marginHz + (config.tag.width + config.tag.margin) * j, config.page.marginTop + (config.tag.height + config.tag.margin) * i, athlete);

            progressBar.tick();
        }
    }

    async _renderPageData(pageIndex, numberOfPages) {
        const {_pdf: pdf, _entity: entity} = this;

        // Header
        pdf.font(config.header.font).fontSize(config.header.fontSize).fillColor(config.header.fontColor);

        pdf.text(entity, 0, config.page.marginTop + config.page.marginBottom, {
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

    async _renderTag(x, y, athlete) {
        const {_entity: entity, _entityTag: entityTag} = this;

        const hash = adler32.sum(Object.values(athlete).join(config.data.hashSeparator)).toString(16);

        const text = [hash, maskId(entityTag, athlete), capitalizeFirstLetters(athlete.name), entity].join(config.data.qrcodeSeparator);

        const qrcodeSize = config.tag.height - 2 * config.tag.padding;

        await this._renderBackground(x, y, qrcodeSize, athlete);

        await this._renderQrCode(x, y, qrcodeSize, text, athlete);

        await this._renderData(x, y, qrcodeSize,  athlete);

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

    async _renderBackground(x, y, qrcodeSize, athlete) {
        const {_pdf: pdf} = this;

        const height = config.tag.height / 2 - config.tag.padding;
        const width = height * config.background.width / config.background.height;
        const left = x + qrcodeSize + config.tag.padding + (config.tag.width - qrcodeSize - config.tag.padding - width) / 2;
        const top = y + config.tag.height / 2;

        if (athlete.exceptional) {
            pdf.fillColor(config.tag.exceptionalBackground);
        } else {
            pdf.fillColor(config.tag.background);
        }

        pdf.rect(x, y, config.tag.width, config.tag.height).fill();

        svg2pdfkit(pdf, this._backgroundImage, left, top, { width, height });
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

        const qrcodeBuffer = canvas.toBuffer('image/png');

        const baseX = x + config.tag.padding;
        const baseY = y + config.tag.padding;

        pdf.image(qrcodeBuffer, baseX, baseY);

        await this._renderQrCodeLogo(baseX, baseY, qrcodeSize, athlete);
    }

    async _renderQrCodeLogo(baseX, baseY, canvasSize, athlete) {
        const {_pdf: pdf} = this;

        const width = canvasSize / 3;
        const relX = (canvasSize - width) / 2;

        const left = baseX + relX;
        const top = baseY + relX;

        pdf.fillColor(athlete.exceptional ? config.tag.exceptionalBackground : config.tag.background)
            .rect(left, top, width, width)
            .fill();

        svg2pdfkit(pdf, this._qrcodeLogoImage, left, top, {
            width,
            height: width,
            assumePt: true,
            preserveAspectRatio: 'xMinYMin meet'
        });
    }

    async _renderData(x, y, qrcodeSize, athlete) {
        const {_pdf: pdf, _entity: entity, _entityTag: entityTag} = this;

        const left = x + qrcodeSize + config.tag.padding * 2;
        let top = y + config.tag.padding;

        const textOptions = {
            width: config.tag.width - qrcodeSize - config.tag.padding * 3,
            align: 'left'
        };

        const id = maskId(entityTag, athlete);

        pdf.font(config.tag.nameFont).fontSize(config.tag.nameFontSize).fillColor(config.tag.nameFontColor);
        pdf.text(id, left, top, textOptions);
        top += pdf.heightOfString(id, textOptions);

        const athleteName = capitalizeFirstLetters(athlete.name);
        pdf.font(config.tag.nameFont).fontSize(config.tag.nameFontSize).fillColor(config.tag.nameFontColor);
        pdf.text(athleteName, left, top, textOptions);
        top += pdf.heightOfString(athleteName, textOptions);

        pdf.font(config.tag.font).fontSize(config.tag.fontSize).fillColor(config.tag.fontColor);
        pdf.text(entity, left, top, textOptions);
        top += pdf.heightOfString(entity, textOptions);
    }
};

function maskId(entityTag, athlete) {
    return entityTag + `${config.tag.idMask}${athlete.id}`.substr(-3) + (athlete.exceptional ? '-E' : '');
}

function capitalizeFirstLetters(str) {
    return str.toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.substring(1))
        .join(' ');
}