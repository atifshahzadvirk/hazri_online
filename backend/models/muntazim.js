// backend/models/muntazim.js

const connection = require('../db');

const createMuntazim = (username, password, department_id, position, role, idNumber) => {

    return new Promise((resolve, reject) => {
        if (!username) return reject(new Error('Benutzername fehlt.'));
        if (!password) return reject(new Error('Passwort fehlt.'));
        if (!role) return reject(new Error('Rolle fehlt.'));
        // Abteilung/Bereich nur für bestimmte Rollen Pflicht!
        if ((role === 'muntazim' || role === 'NMA(read-only)') && !department_id) {
            return reject(new Error('Abteilung/Bereich fehlt.'));
        }
        if (!idNumber && role !== 'admin') return reject(new Error('ID Nummer fehlt.'));

        connection.query(
            'INSERT INTO muntazim (username, password, department_id, position, role, idNumber) VALUES (?, ?, ?, ?, ?, ?)',
            [username, password, department_id, position, role, idNumber],
            (err, result) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return reject(new Error('Benutzername ist bereits vergeben.'));
                    }
                    return reject(err);
                }
                resolve(result);
            }
        );
    });
};

const findMuntazimByUsername = (username) => {
    return new Promise((resolve, reject) => {
        connection.query(
            'SELECT * FROM muntazim WHERE username = ?',
            [username],
            (err, results) => {
                if (err) {
                    return reject(err);
                }
                resolve(results[0]);
            }
        );
    });
};

module.exports = { createMuntazim, findMuntazimByUsername };
