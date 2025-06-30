// backend/routes/departments.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // <--- Angepasst!
const authenticate = require('../middlewares/authenticate');

// Alle Bereiche (Typ = 'NMA') abrufen
router.get('/bereiche', authenticate, async (req, res) => { // <--- async!
    const query = `
        SELECT d.id, d.name, d.type, m.username as leiter 
        FROM departments d
        LEFT JOIN muntazim m ON m.department_id = d.id
        WHERE d.type = 'NMA' OR d.type = 'SM' OR d.type = 'MA' OR d.type = 'SI'
        ORDER BY d.name
    `;
    
    try {
        const [results] = await pool.query(query);
        res.json(Array.isArray(results) ? results : []);
    } catch (err) {
        console.error('Fehler beim Abrufen der Bereiche:', err);
        res.status(500).json([]);
    }
});

// Abteilungen (Typ = 'Muntazim') eines Bereichs abrufen
router.get('/abteilungen', authenticate, async (req, res) => {
    const bereichId = req.query.bereichId;
    if (!bereichId) {
        return res.status(400).json({ message: 'Bereich-ID fehlt' });
    }
    const query = `
        SELECT d.id, d.name, m.username as leiter
        FROM departments d
        LEFT JOIN muntazim m ON m.department_id = d.id
        WHERE d.type = 'Muntazim' AND d.parent_id = ?
        ORDER BY d.name
    `;
    try {
        const [results] = await pool.query(query, [bereichId]);
        res.json(Array.isArray(results) ? results : []);
    } catch (err) {
        console.error('Fehler beim Abrufen der Abteilungen:', err);
        res.status(500).json([]);
    }
});


// NEU: Alle Abteilungen (Typ = 'Muntazim') abrufen (für Dropdowns)
router.get('/abteilungenAlle', authenticate, async (req, res) => {
    const query = `
        SELECT d.id, d.name
        FROM departments d
        WHERE d.type = 'Muntazim'
        ORDER BY d.name
    `;
    try {
        const [results] = await pool.query(query);
        res.json(Array.isArray(results) ? results : []);
    } catch (err) {
        console.error('Fehler beim Abrufen aller Abteilungen:', err);
        res.status(500).json([]);
    }
});


// Bereich und Abteilung des eingeloggten Users abrufen
router.get('/mein-bereich-abteilung', authenticate, async (req, res) => {
    const userId = req.user.id;
    try {
        const [userResults] = await pool.query('SELECT department_id FROM muntazim WHERE id = ?', [userId]);
        if (!userResults.length) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }
        const departmentId = userResults[0].department_id;
        const query = `
            SELECT
                abt.id as abteilungId,
                abt.name as abteilungsName,
                abtLeiter.username as abteilungsLeiter,
                bereich.id as bereichId,
                bereich.name as bereichName,
                bereichLeiter.username as bereichLeiter
            FROM departments abt
            LEFT JOIN departments bereich ON bereich.id = abt.parent_id
            LEFT JOIN muntazim abtLeiter ON abtLeiter.department_id = abt.id AND abtLeiter.position = 'Muntazim'
            LEFT JOIN muntazim bereichLeiter ON bereichLeiter.department_id = bereich.id AND bereichLeiter.position = 'NMA'
            WHERE abt.id = ?
        `;
        const [results] = await pool.query(query, [departmentId]);
        if (!results.length) {
            return res.status(404).json({ message: 'Abteilung/Bereich nicht gefunden' });
        }
        res.json(results[0]);
    } catch (err) {
        console.error('Fehler beim Abrufen von Bereich/Abteilung:', err);
        res.status(500).json({ message: 'Serverfehler' });
    }
});


module.exports = router;
