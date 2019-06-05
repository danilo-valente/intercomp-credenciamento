const path = require('path');
const fs = require('fs-extra');
const pdfkit = require('pdfkit');

module.exports = class Layout {

    constructor(entity, athletes, outputFile, multiProgress, globalConfig) {
        this._globalConfig = globalConfig;
        this._entity = entity;
        this._multiProgress = multiProgress;
        this._athletes = athletes;
        this._outputFile = outputFile;
    }

    async render() {
        this._pdf = new pdfkit(this.pdfConfig());

        await this._registerFonts();
    
        this._pdf.pipe(fs.createWriteStream(this._outputFile, { flags: 'w+' }));
    
        await this.renderDocument();
    
        await this._pdf.end();
    }

    async _registerFonts() {
        const fonts = await fs.readdir(this._globalConfig.fontsDir);

        fonts.forEach(file => {
            const {name} = path.parse(file);
            this._pdf.registerFont(name, path.join(this._globalConfig.fontsDir, file));
        });
    }

    isExceptional(athlete) {
        return athlete.graduated || this.isCourseExceptional(athlete);
    }

    isCourseExceptional(athlete) {
        return this._entity.courses.exceptional.indexOf(athlete.course) !== -1;
    }

    id() {
        throw new Error('Not yet implemented');
    }

    referenceUrl() {
        throw new Error('Not yet implemented');
    }

    pdfConfig() {
        throw new Error('Not yet implemented');
    }

    async renderDocument() {
        throw new Error('Not yet implemented');
    }
};