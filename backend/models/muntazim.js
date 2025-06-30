// backend/models/muntazim.js

const pool = require('../db'); // <--- Korrigiert!

const createMuntazim = async (username, password, department_id, position, role, idNumber) => {
    if (!username) throw new Error('Benutzername fehlt.');
    if (!password) throw new Error('Passwort fehlt.');
    if (!role) throw new Error('Rolle fehlt.');
    if ((role === 'muntazim' || role === 'NMA(read-only)') && !department_id) {
        throw new Error('Abteilung/Bereich fehlt.');
    }
    if (!idNumber && role !== 'admin') throw new Error('ID Nummer fehlt.');

    try {
        const [result] = await pool.query(
            'INSERT INTO muntazim (username, password, department_id, position, role, idNumber) VALUES (?, ?, ?, ?, ?, ?)',
            [username, password, department_id, position, role, idNumber]
        );
        return result;
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            throw new Error('Benutzername ist bereits vergeben.');
        }
        throw err;
    }
};

const findMuntazimByUsername = async (username) => {
    const [rows] = await pool.query(
        'SELECT * FROM muntazim WHERE username = ?',
        [username]
    );
    return rows[0];
};

module.exports = { createMuntazim, findMuntazimByUsername };

