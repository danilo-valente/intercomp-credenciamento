const util = require('util');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const QRCode = require('qrcode');
const svg2img = util.promisify(require('svg2img'));
const svg2pdfkit = require('svg-to-pdfkit');
const {createCanvas, loadImage} = require('canvas');

const Layout = require('../Layout');

const layoutConfig = {
    pdf: {
        margin: 0,
        dpi: 72,
        size: [595, 842]
    },
    page: {
        marginHz: 20,
        marginTop: 44,
        marginBottom: 16,
        rows: 6,
        cols: 2
    },
    header: {
        font: 'Comfortaa-Bold',
        fontSize: 16,
        fontColor: '#363636',
        top: 22
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
        font: 'Courier',
        fontSize: 12,
        fontColor: '#363636',
        textBgOpacity: 0.7,
        nameFont: 'Courier-Bold',
        nameFontSize: 14,
        nameFontColor: '#363636',
        idFont: 'Courier-Bold',
        idFontSize: 14,
        idFontColor: '#363636',
        hasBorder: true,
        borderColor: '#999999',
        borderWidth: 1,
        borderRadius: 0,
        errorCorrectionLevel: 'Q',
        logo: null,
        exceptional: {
            color: '#006ba5',
            background: '#99e1ff',
            radius: 8,
            borderColor: '#004469',
            borderWidth: 2
        },
        courseNotAllowed: {
            color: '#a5002c',
            background: '#ff99a5',
            radius: 8,
            borderColor: '#690018',
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
        image: 'logo-ninja-edition.svg'
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
        return layoutConfig.pdf;
    }

    async renderDocument() {
        const {_pdf: pdf, _athletes: athletes, _entity: entity} = this;

        if (!athletes || athletes.length === 0) {
            return;
        }

        await this._setupImages();

        const tagsPerPage = layoutConfig.page.rows * layoutConfig.page.cols;
        const numberOfPages = Math.ceil(athletes.length / tagsPerPage);

        const progressBar = this._multiProgress.newBar(chalk.green(entity.name) + ' [:bar] :percent | ETA: :etas', {
            ...this._globalConfig.progressBar,
            total: athletes.length
        });

        for (let k = 0; k < athletes.length; k++) {
            const athlete = athletes[k];
            const j = k % layoutConfig.page.cols;
            const i = Math.floor(k / layoutConfig.page.cols) % layoutConfig.page.rows;

            if (k % tagsPerPage === 0) {
                if (k > 0) {
                    pdf.addPage();
                }

                await this._renderPageData(k / tagsPerPage + 1, numberOfPages);
            }

            await this._renderTag(layoutConfig.page.marginHz + (layoutConfig.tag.width + layoutConfig.tag.margin) * j, layoutConfig.page.marginTop + (layoutConfig.tag.height + layoutConfig.tag.margin) * i, athlete);

            progressBar.tick();
        }
    }

    async _setupImages() {

        // Background
        const backgroundPath = path.join(this._globalConfig.imagesDir, layoutConfig.background.image);
        const backgroundSvg = await fs.readFile(backgroundPath);
        this._backgroundSvg = backgroundSvg.toString('utf8');

        this._backgroundHeight = layoutConfig.tag.height / 2 - layoutConfig.tag.padding;
        this._backgroundWidth = this._backgroundHeight * layoutConfig.background.width / layoutConfig.background.height;

        // Multiply dimensions to reduce quality loss
        this._backgroundPng = await svg2img(backgroundSvg, {
            width: this._backgroundWidth * 4,
            height: this._backgroundHeight * 4
        });

        this._qrcodeSize = layoutConfig.tag.height - 2 * layoutConfig.tag.padding;

        this._qrcodeLogoEnabled = !!layoutConfig.tag.logo;

        if (this._qrcodeLogoEnabled) {
            // QR Code Logo
            const qrcodeLogoPath = path.join(this._globalConfig.imagesDir, layoutConfig.tag.logo);
            const qrcodeLogoImageSvg = await fs.readFile(qrcodeLogoPath);
            this._qrcodeLogoImageSvg = qrcodeLogoImageSvg.toString('utf8');

            this._qrcodeLogoPng = await svg2img(qrcodeLogoImageSvg);
        } else {
            this._qrcodeLogoImageSvg = null;

            this._qrcodeLogoPng = null;
        }
    }

    async _renderPageData(pageIndex, numberOfPages) {
        const {_pdf: pdf, _entity: entity} = this;

        // Header
        pdf.font(layoutConfig.header.font).fontSize(layoutConfig.header.fontSize).fillColor(layoutConfig.header.fontColor);

        pdf.text(entity.name, 0, layoutConfig.header.top, {
            width: layoutConfig.pdf.size[0],
            align: 'center'
        });

        // Page count
        pdf.font(layoutConfig.pageCount.font).fontSize(layoutConfig.pageCount.fontSize).fillColor(layoutConfig.header.fontColor);

        pdf.text(`Página ${pageIndex} de ${numberOfPages}`, layoutConfig.page.marginHz, layoutConfig.pdf.size[1] - layoutConfig.pageCount.bottom, {
            width: layoutConfig.pdf.size[0] - layoutConfig.page.marginHz * 2,
            align: 'right'
        });
    }

    async _renderTag(x, y, athlete) {
        const {_entity: entity} = this;

        const text = [athlete.hash, athlete.maskedId, capitalizeFirstLetters(athlete.name), entity.name].join(layoutConfig.data.qrcodeSeparator);

        await this._renderBackground(x, y, athlete);

        await this._renderQrCode(x, y, text, athlete);

        await this._renderData(x, y, athlete);

        if (layoutConfig.tag.hasBorder) {
            await this._renderBorder(x, y);
        }
    }

    async _renderBorder(x, y) {
        const {_pdf: pdf} = this;

        pdf.lineWidth(layoutConfig.tag.borderWidth).strokeColor(layoutConfig.tag.borderColor);

        pdf.roundedRect(x, y, layoutConfig.tag.width, layoutConfig.tag.height, layoutConfig.tag.borderRadius);

        pdf.stroke();
    }

    async _renderBackground(x, y, athlete) {
        const {
            _pdf: pdf,
            _backgroundWidth: width,
            _backgroundHeight: height,
            _qrcodeSize: qrcodeSize
        } = this;

        const left = x + qrcodeSize + layoutConfig.tag.padding + (layoutConfig.tag.width - qrcodeSize - layoutConfig.tag.padding - width) / 2;
        const top = y + layoutConfig.tag.height / 2;

        pdf.fillColor(
            athlete.isCourseNotAllowed
                ? layoutConfig.tag.courseNotAllowed.background
                : athlete.isExceptional
                    ? layoutConfig.tag.exceptional.background
                    : layoutConfig.tag.background
        );

        pdf.rect(x, y, layoutConfig.tag.width, layoutConfig.tag.height).fill();

        if (true) {
            pdf.image(this._backgroundPng, left, top, { width, height });
        } else {
            // Disabled due to performance issues
            svg2pdfkit(pdf, this._backgroundSvg, left, top, { width, height });
        }
    }

    async _renderQrCode(x, y, text, athlete) {
        const {_pdf: pdf, _qrcodeSize: qrcodeSize} = this;

        const canvas = createCanvas(qrcodeSize, qrcodeSize);

        // TODO: improve performance
        await QRCode.toCanvas(canvas, text, {
            errorCorrectionLevel: layoutConfig.tag.errorCorrectionLevel,
            margin: 0,
            width: qrcodeSize,
            color: {
                light: athlete.isCourseNotAllowed
                    ? layoutConfig.tag.courseNotAllowed.background
                    : athlete.isExceptional
                        ? layoutConfig.tag.exceptional.background
                        : layoutConfig.tag.background
            }
        });

        const qrcodeBuffer = canvas.toBuffer('image/png');

        const baseX = x + layoutConfig.tag.padding;
        const baseY = y + layoutConfig.tag.padding;

        pdf.image(qrcodeBuffer, baseX, baseY);

        await this._renderQrCodeLogo(baseX, baseY, athlete);
    }

    async _renderQrCodeLogo(baseX, baseY, athlete) {

        if (!this._qrcodeLogoEnabled) {
            return;
        }

        const {_pdf: pdf, _qrcodeSize: qrcodeSize} = this;

        const width = qrcodeSize / 3;
        const relX = (qrcodeSize - width) / 2;

        const left = baseX + relX;
        const top = baseY + relX;

        pdf.fillColor(
            athlete.isCourseNotAllowed
                ? layoutConfig.tag.courseNotAllowed.background
                : athlete.isExceptional
                    ? layoutConfig.tag.exceptional.background
                    : layoutConfig.tag.background
        )
            .rect(left, top, width, width)
            .fill();

        if (true) {
            pdf.image(this._qrcodeLogoPng, left, top, { width, height: width });
        } else {
            // Disabled due to performance issues
            svg2pdfkit(pdf, this._qrcodeLogoImageSvg, left, top, {
                width,
                height: width,
                assumePt: true,
                preserveAspectRatio: 'xMinYMin meet'
            });
        }
    }

    async _renderData(x, y, athlete) {
        const {_pdf: pdf, _entity: entity, _qrcodeSize: qrcodeSize} = this;

        const left = x + qrcodeSize + layoutConfig.tag.padding * 2;
        let top = y + layoutConfig.tag.padding;

        const bgColor = athlete.isCourseNotAllowed
            ? layoutConfig.tag.courseNotAllowed.background
            : athlete.isExceptional
                ? layoutConfig.tag.exceptional.background
                : layoutConfig.tag.background;

        const textOptions = {
            width: layoutConfig.tag.width - qrcodeSize - layoutConfig.tag.padding * 3,
            align: 'left'
        };

        // TODO: fix text background overflow

        // ID
        pdf.font(layoutConfig.tag.idFont).fontSize(layoutConfig.tag.idFontSize);

        const id = athlete.maskedId;
        const idWidth = pdf.widthOfString(id, textOptions);
        const idHeight = pdf.heightOfString(id, textOptions);

        pdf.fillColor(bgColor, layoutConfig.tag.textBgOpacity).rect(left, top, idWidth, idHeight).fill();
        pdf.fillColor(layoutConfig.tag.idFontColor, 1).text(id, left, top, textOptions);
        top += idHeight;

        // Name
        pdf.font(layoutConfig.tag.nameFont).fontSize(layoutConfig.tag.nameFontSize);

        const athleteName = capitalizeFirstLetters(athlete.name);
        const nameWidth = pdf.widthOfString(athleteName, textOptions);
        const nameHeight = pdf.heightOfString(athleteName, textOptions);

        pdf.fillColor(bgColor, layoutConfig.tag.textBgOpacity).rect(left, top, nameWidth, nameHeight).fill();
        pdf.fillColor(layoutConfig.tag.nameFontColor, 1).text(athleteName, left, top, textOptions);
        top += nameHeight;

        // Entity
        pdf.font(layoutConfig.tag.font).fontSize(layoutConfig.tag.fontSize);

        const entityName = entity.name;
        const entityWidth = pdf.widthOfString(entityName, textOptions);
        const entityHeight = pdf.heightOfString(entityName, textOptions);

        pdf.fillColor(bgColor, layoutConfig.tag.textBgOpacity).rect(left, top, entityWidth, entityHeight).fill();
        pdf.fillColor(layoutConfig.tag.fontColor, 1).text(entity.name, left, top, textOptions);
        top += pdf.heightOfString(entityName, textOptions);
    }
};

function capitalizeFirstLetters(str) {
    return str.toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.substring(1))
        .join(' ');
}
