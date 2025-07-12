// backend/models/Employee.js
const pool = require('../db'); // <--- Korrigiert!

const createEmployee = async (name, role, idNumber, majlisName, department_id, created_by, B_Name, B_Majlis) => {
    if (!name || !role || !idNumber) {
    throw new Error('Alle Pflichtfelder müssen ausgefüllt werden.');
  }
    try {
        const [result] = await pool.query(
            'INSERT INTO employees (name, role, idNumber, majlisName, department_id, created_by, B_Name, B_Majlis) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, role, idNumber, majlisName, department_id, created_by, B_Name, B_Majlis]
        );
        return result;
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            throw new Error('ID-Nummer bereits vorhanden.');
        }
        throw err;
    }
};

module.exports = { createEmployee };

