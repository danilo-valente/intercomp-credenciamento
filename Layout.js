const {promises: fsPromises} = fs;

module.exports = class Layout {

    constructor(pdf, entity, athletes, fontsDir) {
        this._entity = entity;
        this._athletes = athletes;
        this._fontsDir = fontsDir;
    }

    async init() {
        this._pdf = await this.setup();

        await this.registerFonts()
    }

    async registerFonts() {
        const fonts = await fsPromises.readdir(this._fontsDir);

        fonts.forEach(file => {
            const {name} = path.parse(file);
            this._pdf.registerFont(name, path.join(this._fontsDir, file));
        });
    }

    id() {
        throw new Error('Not yet implemented');
    }

    referenceUrl() {
        throw new Error('Not yet implemented');
    }

    async setup() {
        throw new Error('Not yet implemented');
    }

    async renderDocument() {
        throw new Error('Not yet implemented');
    }
};