// backend/routes/departments.js
const express = require('express');
const router = express.Router();
const connection = require('../db');
const authenticate = require('../middlewares/authenticate');

// Alle Bereiche (Typ = 'NMA') abrufen
router.get('/bereiche', authenticate, (req, res) => {
    const query = `
        SELECT d.id, d.name, d.type, m.username as leiter 
        FROM departments d
        LEFT JOIN muntazim m ON m.department_id = d.id
        WHERE d.type = 'NMA' OR d.type = 'SM' OR d.type = 'MA' OR d.type = 'SI'
        ORDER BY d.name
    `;
    
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Fehler beim Abrufen der Bereiche:', err);
            return res.status(500).json([]);
        }
        res.json(Array.isArray(results) ? results : []);
    });
});

// Abteilungen (Typ = 'Muntazim') eines Bereichs abrufen
router.get('/abteilungen', authenticate, (req, res) => {
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
    
    connection.query(query, [bereichId], (err, results) => {
        if (err) {
            console.error('Fehler beim Abrufen der Abteilungen:', err);
            return res.status(500).json([]);
        }
        res.json(Array.isArray(results) ? results : []);
    });
});

// NEU: Alle Abteilungen (Typ = 'Muntazim') abrufen (für Dropdowns)
router.get('/abteilungenAlle', authenticate, (req, res) => {
    const query = `
        SELECT d.id, d.name 
        FROM departments d
        WHERE d.type = 'Muntazim'
        ORDER BY d.name
    `;
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Fehler beim Abrufen aller Abteilungen:', err);
            return res.status(500).json([]);
        }
        res.json(Array.isArray(results) ? results : []);
    });
});

// Bereich und Abteilung des eingeloggten Users abrufen
router.get('/mein-bereich-abteilung', authenticate, (req, res) => {
    const userId = req.user.id;
    
    connection.query('SELECT department_id FROM muntazim WHERE id = ?', [userId], (err, userResults) => {
        if (err || !userResults.length) {
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
        
        connection.query(query, [departmentId], (err, results) => {
            if (err || !results.length) {
                return res.status(404).json({ message: 'Abteilung/Bereich nicht gefunden' });
            }
            
            res.json(results[0]);
        });
    });
});

module.exports = router;
