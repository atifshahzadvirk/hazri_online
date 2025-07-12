// backend/routes/auth.js

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const fileUpload = require('express-fileupload');
const { createMuntazim, findMuntazimByUsername } = require('../models/muntazim');
const pool = require('../db'); // <--- Pool statt Einzelverbindung!
const authenticate = require('../middlewares/authenticate');
const authorizeRole = require('../middlewares/authorizeRole');
require('dotenv').config();

const router = express.Router();
router.use(fileUpload());

// Hilfsfunktion: Gültige IDs aus Excel lesen
function getValidIds() {
    const filePath = path.join(__dirname, '../data/valid_ids.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet);
    return jsonData.map(row => row.idNumber?.toString().trim()).filter(Boolean);
}

// Hilfsfunktion: Finde User nach ID
async function findMuntazimByIdNumber(idNumber) {
    const [rows] = await pool.query(
        'SELECT id FROM muntazim WHERE idNumber = ?',
        [idNumber]
    );
    return rows.length > 0 ? rows[0] : null;
}


// Zentrale Prüfungsfunktion für User-Anlage
async function validateUser({ username, password, role, idNumber, department_id }) {
    // Pflichtfelder prüfen (ID nur für admin optional)
    if (!username || !password || !role) {
        throw new Error('Bitte füllen Sie alle Pflichtfelder aus.');
    }

    if (role !== 'admin' && !idNumber) {
        throw new Error('ID Nummer ist für diese Rolle Pflicht.');
    }

    // ID-Prüfung nur wenn vorhanden UND nicht admin
    if (idNumber) {
        // ID-Prüfung gegen Excel
        const validIds = getValidIds();
        if (!validIds.includes(String(idNumber).trim())) {
            throw new Error('ID-Nummer ungültig.');
        }

        // ID-Nummer muss 5 Ziffern sein
        if (!/^\d{5}$/.test(String(idNumber).trim())) {
            throw new Error('Die ID Nummer muss genau 5 Ziffern haben (00001 bis 99999).');
        }

        // Prüfung: ID-Nummer bereits vergeben
        const existingId = await findMuntazimByIdNumber(idNumber);
        if (existingId) {
            throw new Error('ID-Nummer ist bereits vergeben.');
        }
    }

    // Nur für bestimmte Rollen department_id prüfen
    if ((role === 'muntazim' || role === 'NMA(read-only)') && !department_id) {
        throw new Error('Abteilung/Bereich muss ausgewählt werden.');
    }

    // Prüfung: Benutzername bereits vergeben
    const existingUser = await findMuntazimByUsername(username);
    if (existingUser) {
        throw new Error('Benutzername ist bereits vergeben.');
    }

    // Prüfung: Nur ein Muntazim pro Abteilung
    if (role === 'muntazim') {
        const [rows] = await pool.query(
            'SELECT COUNT(*) AS count FROM muntazim WHERE role = ? AND department_id = ?',
            [role, department_id]
        );
        if (rows[0].count > 0) {
            throw new Error('Für diese Abteilung existiert bereits ein Muntazim.');
        }
    }

    // Prüfung: Nur ein NMA(read-only) pro Bereich
    if (role === 'NMA(read-only)') {
        const [rows] = await pool.query(
            'SELECT COUNT(*) AS count FROM muntazim WHERE role = ? AND department_id = ?',
            [role, department_id]
        );
        if (rows[0].count > 0) {
            throw new Error('Für diesen Bereich existiert bereits ein NMA(read-only).');
        }
    }
}




// Einzelne User-Anlage mit Backup
router.post('/register', authenticate, async (req, res) => {
    const { username, password, department_id, position, role, idNumber } = req.body;

    try {
        await validateUser({ username, password, role, idNumber, department_id });

        const hashedPassword = await bcrypt.hash(password, 10);
        await createMuntazim(
            username,
            hashedPassword,
            department_id || null,
            '', // <-- leere Zeichenkette für position
            role,
            idNumber
        );

        res.status(201).send('Benutzer erfolgreich registriert');
    } catch (error) {
        res.status(400).send(error.message || 'Serverfehler');
    }
});


// Massen-Upload mit Backup (Excel/CSV)
router.post('/import', authenticate, authorizeRole(['admin']), async (req, res) => {
    if (!req.files || !req.files.file) {
        return res.status(400).json({ 
            summary: 'Keine Datei hochgeladen.',
            failedEntries: []
        });
    }
    try {
        const workbook = XLSX.read(req.files.file.data);
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        let okCount = 0, failed = 0;
        let failedEntries = [];
        for (const row of jsonData) {
            try {
                await validateUser({
                    username: row.username,
                    password: row.password,
                    role: row.role,
                    idNumber: row.idNumber,
                    department_id: row.department_id
                });

                const hashedPassword = await bcrypt.hash(row.password, 10);
                await createMuntazim(
                    row.username,
                    hashedPassword,
                    row.department_id || null,
                    row.position || '',
                    row.role,
                    row.idNumber || '' // ✅ Leerer String, falls undefined
                );
                okCount++;
            } catch (err) {
                failed++;
                failedEntries.push({
                    row: row,
                    reason: err.message
                });
            }
        }
        res.json({
            summary: `Import abgeschlossen: ${okCount} erfolgreich, ${failed} fehlgeschlagen.`,
            failedEntries: failedEntries
        });
    } catch (error) {
        res.status(500).json({ 
            summary: 'Fehler beim Verarbeiten der Datei.',
            failedEntries: []
        });
    }
});

// Login-Route (angepasst, um department_id im Token zu speichern)
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const muntazim = await findMuntazimByUsername(username);
        if (!muntazim) return res.status(400).send('Benutzer nicht gefunden.');

        const match = await bcrypt.compare(password, muntazim.password);
        if (match) {
            // Füge department_id zum JWT-Token hinzu
            const token = jwt.sign(
                {
                    id: muntazim.id,
                    username: muntazim.username,
                    role: muntazim.role,
                    department_id: muntazim.department_id // Wichtig für Muntazim!
                },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            res.status(200).json({
                message: 'Login erfolgreich',
                token,
                role: muntazim.role
            });
        } else {
            res.status(400).send('Ungültiges Passwort');
        }
    } catch (err) {
	console.error('Login-Fehler:', err); // <-- NEUE ZEILE EINFÜGEN!
        res.status(500).send('Fehler beim Login');
    }
});

// --- Admin: Benutzer bearbeiten (jetzt auch Benutzername änderbar) ---
router.put('/users/:id', authenticate, authorizeRole(['admin']), async (req, res) => {
  const { username, role, department_id, idNumber, password } = req.body; // <-- username ergänzt
  const fields = [];
  const values = [];
  if (username) { fields.push('username = ?'); values.push(username); } // <-- NEU: Benutzername bearbeiten
  if (role) { fields.push('role = ?'); values.push(role); }
  if (department_id !== undefined) { fields.push('department_id = ?'); values.push(department_id); }
  if (idNumber) { fields.push('idNumber = ?'); values.push(idNumber); }
  if (password) {
    const hashed = await bcrypt.hash(password, 10);
    fields.push('password = ?'); values.push(hashed);
  }
  if (fields.length === 0) return res.status(400).json({ message: 'Keine Felder zum Aktualisieren.' });
  values.push(req.params.id);
  try {
    await pool.query(`UPDATE muntazim SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'Benutzer aktualisiert.' });
  } catch (err) {
    res.status(500).json({ message: 'Fehler beim Aktualisieren des Benutzers.' });
  }
});

// --- Admin: Alle Benutzer abrufen (ohne Passwort-Hash) ---
router.get('/users', authenticate, authorizeRole(['admin']), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, role, department_id, idNumber FROM muntazim'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Fehler beim Laden der Benutzer.' });
  }
});


module.exports = router;