const path = require('path');

const RESOURCES_DIR = 'resources';

module.exports = {
    showLogs: false,
    fontsDir: path.join(__dirname, RESOURCES_DIR, 'fonts'),
    imagesDir: path.join(__dirname, RESOURCES_DIR, 'images'),
    skipLines: 4,
    headers: [
        '',
        '#',
        'Nome Completo',
        'RA',
        'Curso',
        'Formado'
    ],
    attributes: {
        id: '#',
        name: 'Nome Completo',
        ra: 'RA',
        course: 'Curso',
        graduated: 'Formado'
    }
};