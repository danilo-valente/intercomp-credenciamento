const adler32 = require('adler32');

adler32.register();

module.exports = class Athlete {

    constructor(obj, entity, config) {
        if (obj) {
            this.id = obj.id;
            this.name = obj.name;
            this.ra = obj.ra;
            this.course = obj.course;
            this.graduated = obj.graduated;
        }

        this.entity = entity;
        this.allowedCourses = entity.courses.regular.concat(entity.courses.exceptional);
        this.config = config;
    }

    get hash() {
        return adler32.sum(Object.values(this).join(this.config.data.hashSeparator)).toString(16);
    }

    get maskedId() {
        return this.entity.tag
            + `${this.config.data.idMask}${this.id}`.substr(-3)
            + (this.isCourseExceptional ? '-NE' : '')
            + (this.graduated ? '-F' : '');
    }

    get isExceptional() {
        return this.graduated || this.isCourseExceptional || this.isCourseNotAllowed;
    }

    get isCourseExceptional() {
        return this.entity.courses.exceptional.indexOf(this.course) !== -1;
    }

    get isCourseNotAllowed() {
        return this.config.noValidate && this.allowedCourses.indexOf(this.course) === -1;
    }
};
