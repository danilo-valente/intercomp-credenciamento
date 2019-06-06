const path = require('path');

const RESOURCES_DIR = 'resources';

module.exports = {
    showLogs: false,
    showWarnings: false,
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
    },
    progressBar: {
        width: 30,
        complete: '█',
        incomplete: '░'
    },
    csvExport: {
        separator: ',',
        headers: [
            'ID',
            'Hash',
            'Nome',
            'RA',
            'Formado',
            'Curso',
            'Entidade',
            'Não-estatutário'
        ],
        columns: [
            athlete => athlete.maskedId,
            athlete => athlete.hash,
            athlete => athlete.name,
            athlete => athlete.ra,
            athlete => athlete.graduated ? 'SIM' : '',
            athlete => athlete.course,
            athlete => athlete.entity.name,
            athlete => athlete.isExceptional ? 'SIM' : ''
        ]
    },
    data: {
        hashSeparator: ',',
        idMask: '000'
    }
};