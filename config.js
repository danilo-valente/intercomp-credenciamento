const path = require('path');

const RESOURCES_DIR = 'resources';

module.exports = {
    fontsDir: path.join(__dirname, RESOURCES_DIR, 'fonts'),
    imagesDir: path.join(__dirname, RESOURCES_DIR, 'images'),
    headers: [
        'id',
        'name',
        'birthdate',
        'rg',
        'cpf',
        'ra',
        'entity',
        'course'
    ]
};