const path = require('path');

const RESOURCES_DIR = 'resources';

module.exports = {
    showLogs: false,
    includeMissing: false,
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
        id: athlete => parseInt(athlete['#'].trim(), 10),
        name: athlete => athlete['Nome Completo'].trim(),
        ra: athlete => athlete['RA'].trim(),
        course: athlete => athlete['Curso'].trim(),
        graduated: athlete => !!athlete['Formado'].trim()
    }
};