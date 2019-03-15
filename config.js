const path = require('path');

const RESOURCES_DIR = 'resources';

module.exports = {
    fontsDir: path.join(__dirname, RESOURCES_DIR, 'fonts'),
    headers: [
        'id',
        'name',
        'birthdate',
        'rg',
        'cpf',
        'ra',
        'entity',
        'course'
    ],
    page: {
        dpi: 72,
        width: 595,
        height: 842,
        marginHz: 14,
        marginVt: 76,
        rows: 10,
        cols: 3
    },
    header: {
        font: 'Comfortaa-Bold',
        fontSize: 24
    },
    pageCount: {
        font: 'Raleway-Regular',
        fontSize: 10,
        right: 14,
        bottom: 38
    },
    tag: {
        width: 189,
        height: 69,
        margin: 8,
        font: 'Raleway-Regular',
        fontSize: 10,
        nameFont: 'Raleway-Bold',
        nameFontSize: 11,
        idMask: '000',
        hasBorder: true,
        borderColor: '#999999',
        borderWidth: 1,
        borderRadius: 3,
        errorCorrectionLevel: 'Q'
    },
    data: {
        hashSeparator: ',',
        qrcodeSeparator: '\n'
    },
    background: {
        width: 1039,
        height: 1023,
        path: path.join(__dirname, RESOURCES_DIR, 'background.png')
    }
};