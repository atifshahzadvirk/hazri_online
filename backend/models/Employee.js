// backend/models/Employee.js
const connection = require('../db');

const createEmployee = (name, role, idNumber, majlisName, department_id, created_by, B_Name, B_Majlis) => {
    return new Promise((resolve, reject) => {
        if (!name || !role || !idNumber || !majlisName) {
            return reject(new Error('Alle Pflichtfelder müssen ausgefüllt werden.'));
        }
        connection.query(
            'INSERT INTO employees (name, role, idNumber, majlisName, department_id, created_by, B_Name, B_Majlis) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, role, idNumber, majlisName, department_id, created_by, B_Name, B_Majlis],
            (err, result) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return reject(new Error('ID-Nummer bereits vorhanden.'));
                    }
                    return reject(err);
                }
                resolve(result);
            }
        );
    });
};

module.exports = { createEmployee };
