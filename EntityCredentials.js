const csvtojson = require('csvtojson');
const chalk = require('chalk');

module.exports = class EntityCredentials {

    constructor(entity, csvFile, config) {
        this._entity = entity;
        this._csvFile = csvFile;
        this._config = config;
        this._athletes = null;
    }

    async log(message, level = 'log') {
        if (level !== 'log' || this._config.showLogs) {
            console[level](`${chalk.yellow('[' + this._entity.name + ']')} ${message}`);
        }
    }

    async warn(message) {
        return this.log(message, 'warn');
    }

    async setup() {
        this._athletes = await this._readCsv();
    }

    async generate(outputFile, layoutClass, multiProgress) {
        const {_entity: entity, _csvFile: csvFile, _config: config, _athletes: athletes} = this;
    
        this.log(`Generating credentials using layout ${chalk.green(layoutClass.id)}`);
        
        const layout = new layoutClass(entity, athletes, outputFile, multiProgress, config);
    
        await layout.render();
    
        this.log(`Credentials ${chalk.green('successfully')} generated`);
    }
    
    async _readCsv() {
        const {_entity: entity, _csvFile: csvFile, _config: config} = this;

        this.log(`Reading athletes from file ${chalk.green(csvFile)}`);
    
        const rawObjects = await csvtojson({ headers: config.headers, noheader: true }).fromFile(csvFile);
    
        const attributeNames = Object.keys(config.attributes);
    
        const allowedCourses = entity.courses.regular.concat(entity.courses.exceptional);

        const athletes = rawObjects.slice(config.skipLines)
            .map(obj => attributeNames.reduce((athlete, attr) => {
                athlete[attr] = obj[config.attributes[attr]];
                return athlete;
            }, {}))
            .filter(athlete => athlete.name && athlete.name.trim());
    
        if (config.includeMissing) {
            return athletes;
        }

        return athletes.filter(athlete => {

            const course = athlete.course.trim();
            if (!course || !athlete.ra.trim()) {
                this.warn(`Ignoring athlete ${chalk.red(athlete.name)} because there is missing information about them`);

                return false;
            }

            if (allowedCourses.indexOf(course) === -1) {
                this.warn(`Ignoring athlete ${chalk.red(athlete.name)} because they belong to the course ${chalk.red(athlete.course)} which is not registered in the courses list`);

                return false;
            }

            return true;
        });
    }
};