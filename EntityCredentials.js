const csvtojson = require('csvtojson');
const chalk = require('chalk');

const Athlete = require('./Athlete');

module.exports = class EntityCredentials {

    constructor(entity, csvFile, config) {
        this._entity = entity;
        this._csvFile = csvFile;
        this._config = config;
        this._athletes = null;
    }

    get athletes() {
        return this._athletes;
    }

    _log(level, message) {
        console[level](`${chalk.yellow('[' + this._entity.name + ']')} ${message}`);
    }

    async log(message) {
        if (this._config.showLogs) {
            this._log('log', message);
        }
    }

    async warn(message) {
        if (this._config.showWarnings) {
            this._log('warn', message);
        }
    }

    async setup() {
        this._athletes = await this._readCsv();
    }

    async generate(outputFile, layoutClass, multiProgress) {
        const {_entity: entity, _config: config, _athletes: athletes} = this;
    
        const layout = new layoutClass(entity, athletes, outputFile, multiProgress, config);
    
        this.log(`Generating credentials using layout ${chalk.green(layout.id())}`);
        
        await layout.render();
    
        this.log(`Credentials ${chalk.green('successfully')} generated`);
    }
    
    async _readCsv() {
        const {_entity: entity, _csvFile: csvFile, _config: config} = this;

        this.log(`Reading athletes from file ${chalk.green(csvFile)}`);
    
        const rawObjects = await csvtojson({ headers: config.headers, noheader: true }).fromFile(csvFile);
    
        const attributeNames = Object.keys(config.attributes);
    
        return rawObjects.slice(config.skipLines)
            .map(obj => attributeNames.reduce((athlete, attr) => {
                athlete[attr] = config.attributes[attr](obj);
                return athlete;
            }, {}))
            .filter(athlete => athlete.name && athlete.name.trim())
            .map(obj => new Athlete(obj, entity, config))
            .filter(athlete => {

            if (!config.includeMissing && (!athlete.course || !athlete.ra.trim())) {
                this.warn(`Ignoring athlete ${chalk.red(athlete.name)} because there is missing information about them`);

                return false;
            }

            if (!config.noValidate && athlete.isCourseNotAllowed) {
                this.warn(`Ignoring athlete ${chalk.red(athlete.name)} because they belong to the course ${chalk.red(athlete.course)} which is not registered in the courses list`);

                return false;
            }

            return true;
        });
    }
};
