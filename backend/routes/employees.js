// backend/routes/employees.js

const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const fileUpload = require('express-fileupload');

function getValidIdData(idNumber) {
    const filePath = path.join(__dirname, '../data/valid_ids.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet);
    return jsonData.find(row => String(row.idNumber).trim() === String(idNumber).trim());
}

const { createEmployee } = require('../models/Employee');
const authenticate = require('../middlewares/authenticate');
const authorizeRole = require('../middlewares/authorizeRole');
const pool = require('../db'); // <--- Pool statt connection

router.use(fileUpload());

// Hilfsfunktion: Gültige IDs aus Excel lesen
function getValidIds() {
    const filePath = path.join(__dirname, '../data/valid_ids.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet);
    return jsonData.map(row => row.idNumber?.toString().trim()).filter(Boolean);
}

// Zentrale Prüfungen für Mitarbeiter-Anlage
async function validateEmployee({ name, role, idNumber, majlisName, department_id }, pool, skipIdExcelCheck = false) { // <--- pool statt connection
    // Pflichtfelder prüfen
    const rolesWithoutDepartment = ['MA', 'SI', 'SM']; // <-- NEU
    if (!name || !role || !idNumber || !majlisName || (!department_id && !rolesWithoutDepartment.includes(role))) { // <-- ANPASSUNG
        throw new Error('Bitte füllen Sie alle Pflichtfelder aus.');
    }

    // ID-Prüfung gegen Excel (optional abschaltbar)
    if (!skipIdExcelCheck) {
        const validIds = getValidIds();
        if (!validIds.includes(String(idNumber).trim())) {
            throw new Error('ID-Nummer ungültig.');
        }
    }

    // Prüfung: Nur ein Muntazim pro Abteilung
    if (role === 'Muntazim') {
        const [rows] = await pool.query(
            'SELECT COUNT(*) AS count FROM employees WHERE role = ? AND department_id = ?',
            [role, department_id]
        );
        if (rows[0].count > 0) {
            throw new Error('Für diese Abteilung existiert bereits ein Muntazim.');
        }
    }

    // Prüfung: Nur ein NMA pro Bereich
    if (role === 'NMA') {
        const [rows] = await pool.query(
            'SELECT COUNT(*) AS count FROM employees WHERE role = ? AND department_id = ?',
            [role, department_id]
        );
        if (rows[0].count > 0) {
            throw new Error('Für diesen Bereich existiert bereits ein NMA.');
        }
    }

    // Prüfung: ID schon vergeben
    const [idRows] = await pool.query(
        'SELECT id FROM employees WHERE idNumber = ?',
        [idNumber]
    );
    if (idRows.length > 0) {
        throw new Error('Mitarbeiter mit dieser ID existiert bereits.');
    }
}

// Mitarbeiter anlegen (mit zentraler Prüfung)
router.post('/', authenticate, async (req, res) => {
    let { name, role, idNumber, majlisName, department_id } = req.body;

    // Für Muntazim: department_id immer aus Token nehmen (Backend-Absicherung)
    if (req.user.role === 'muntazim') {
        department_id = req.user.department_id;
    }
      // NEU: Nur ein SM, MA, SI zulassen
    if (['SM', 'MA', 'SI'].includes(role)) {
        const [existing] = await pool.query(
            "SELECT COUNT(*) AS count FROM employees WHERE role = ?", [role]
        );
        if (existing[0].count > 0) {
            return res.status(400).json({ message: `Es darf nur einen Mitarbeiter mit der Rolle ${role} geben.` });
        }
    }

    try {
        await validateEmployee({ name, role, idNumber, majlisName, department_id }, pool); // <--- pool übergeben!
	        // Zusatzfelder aus Excel lesen
        let B_Name = '';
        let B_Majlis = '';
        if (idNumber) {
            const validData = getValidIdData(idNumber);
            if (validData) {
                B_Name = [validData["First Name"], validData["Last Name"]].filter(Boolean).join(' ');
                B_Majlis = validData["Majlis"] || '';

            }
        }

        await createEmployee(
            name, role, idNumber, majlisName, department_id,
            req.user.username, // created_by
            B_Name,
            B_Majlis
        );
        res.status(201).json({ message: 'Mitarbeiter erfolgreich angelegt.' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Mitarbeiter bearbeiten (PUT)
router.put('/:id', authenticate, async (req, res) => {
    const id = req.params.id;
    const { name, role, idNumber, majlisName, department_id } = req.body;

    // Prüfung: Nur ein Muntazim pro Abteilung nach Update
    if (role === 'Muntazim') {
        const [rows] = await pool.query(
            'SELECT COUNT(*) AS count FROM employees WHERE role = ? AND department_id = ? AND id != ?',
            [role, department_id, id]
        );
        if (rows[0].count > 0) {
            return res.status(400).json({ message: 'Für diese Abteilung existiert bereits ein Muntazim.' });
        }
    }

    // Prüfung: Nur ein NMA pro Bereich nach Update
    if (role === 'NMA') {
        const [rows] = await pool.query(
            'SELECT COUNT(*) AS count FROM employees WHERE role = ? AND department_id = ? AND id != ?',
            [role, department_id, id]
        );
        if (rows[0].count > 0) {
            return res.status(400).json({ message: 'Für diesen Bereich existiert bereits ein NMA.' });
        }
    }

          // 1. Muntazim-Schutz: Muntazim darf keinen Muntazim bearbeiten
    const [targetRows] = await pool.query('SELECT role FROM employees WHERE id = ?', [id]);
    if (req.user.role === 'muntazim' && targetRows[0]?.role === 'Muntazim') {
      return res.status(403).json({ message: 'Sie dürfen den Muntazim nicht bearbeiten oder löschen.' });
    }

    // 2. Prüfung: ID-Nummer darf nicht doppelt vergeben sein (außer beim eigenen Datensatz)
    const [idRows] = await pool.query(
        'SELECT id FROM employees WHERE idNumber = ? AND id != ?',
        [idNumber, id]
    );
    if (idRows.length > 0) {
        return res.status(400).json({ message: 'Mitarbeiter mit dieser ID existiert bereits.' });
    }
    try {
  // Vorherige Werte holen für die qualifizierte Meldung
  const [oldRows] = await pool.query(
    `SELECT e.name, e.role, d.name AS abteilungsName, b.name AS bereichsName
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     LEFT JOIN departments b ON d.parent_id = b.id
     WHERE e.id = ?`, [id]
  );
  const old = oldRows[0];

  await pool.query( // <--- geändert!
    'UPDATE employees SET name=?, role=?, idNumber=?, majlisName=?, department_id=? WHERE id=?',
    [name, role, idNumber, majlisName, department_id, id]
  );

  // Neue Werte holen
  const [newRows] = await pool.query(
    `SELECT e.name, e.role, d.name AS abteilungsName, b.name AS bereichsName
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     LEFT JOIN departments b ON d.parent_id = b.id
     WHERE e.id = ?`, [id]
  );
  const neu = newRows[0];

  let detailMsg = `Mitarbeiter ${neu.name} (${neu.role})`;
  if (old.abteilungsName !== neu.abteilungsName || old.bereichsName !== neu.bereichsName) {
    detailMsg += ` wurde von Abteilung "${old.abteilungsName || '-'}" (Bereich "${old.bereichsName || '-' }") zu Abteilung "${neu.abteilungsName || '-'}" (Bereich "${neu.bereichsName || '-' }") versetzt.`;
  } else {
    detailMsg += ` wurde aktualisiert.`;
  }

  res.json({ message: detailMsg });
} catch (err) {
  res.status(500).json({ message: 'Fehler beim Bearbeiten.' });
}


});

    // Mitarbeiter löschen (DELETE)
	router.delete('/:id', authenticate, async (req, res) => {
    	const id = req.params.id;
    // Muntazim-Schutz: Muntazim darf keinen Muntazim löschen
    	const [targetRows] = await pool.query('SELECT role FROM employees WHERE id = ?', [id]);
    	if (req.user.role === 'muntazim' && targetRows[0]?.role === 'Muntazim') {
      	return res.status(403).json({ message: 'Sie dürfen den Muntazim nicht bearbeiten oder löschen.' });
    }

    try {
  // Vorherige Werte holen für qualifizierte Meldung
  const [oldRows] = await pool.query(
    `SELECT e.name, e.role, d.name AS abteilungsName, b.name AS bereichsName
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     LEFT JOIN departments b ON d.parent_id = b.id
     WHERE e.id = ?`, [id]
  );
  const old = oldRows[0];

  await pool.query('DELETE FROM employees WHERE id = ?', [id]);

  let detailMsg = `Mitarbeiter ${old?.name || ''} (${old?.role || ''}) aus Abteilung "${old?.abteilungsName || '-'}" (Bereich "${old?.bereichsName || '-' }") wurde gelöscht.`;
  res.json({ message: detailMsg });
} catch (err) {
  res.status(500).json({ message: 'Fehler beim Löschen.' });
}

});

// Alle Mitarbeiter (für Admin-Übersicht, jetzt mit Bereich/Abteilung/Ersteller/Zeitstempel)
router.get('/all', authenticate, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT e.*, 
                    e.B_Name, 
            	    e.B_Majlis, 
		    d.name AS abteilungsName, 
                    b.name AS bereichsName, 
                    e.created_at, 
                    e.created_by
             FROM employees e
             LEFT JOIN departments d ON e.department_id = d.id
             LEFT JOIN departments b ON d.parent_id = b.id`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json([]);
    }
});

// Bereichs-Mitarbeiter (für NMA(read-only))
router.get('/bereichs-mitarbeiter', authenticate, async (req, res) => { // <-- async hinzugefügt!
    if (req.user.role !== 'NMA(read-only)') {
        return res.status(403).json({ message: 'Nicht berechtigt.' });
    }

    try { // <-- try/catch hinzugefügt!
        const [results] = await pool.query(
            `SELECT e.*, 
                    d.name AS abteilungsName, 
                    b.name AS bereichsName, 
                    e.created_at, 
                    e.created_by
             FROM employees e
             JOIN departments d ON e.department_id = d.id
             LEFT JOIN departments b ON d.parent_id = b.id
             WHERE d.parent_id = ?`,
            [req.user.department_id]
        ); // <-- Callback entfernt, await eingefügt!

        // Gruppierung nach Abteilungen (wie vorher)
        const gruppiert = results.reduce((acc, mitarbeiter) => {
            const key = mitarbeiter.abteilungsName;
            if (!acc[key]) acc[key] = [];
            acc[key].push(mitarbeiter);
            return acc;
        }, {});
        res.json(gruppiert);
    } catch (err) { // <-- Fehlerbehandlung jetzt im catch!
        console.error(err);
        return res.status(500).json([]);
    }
}); // <-- Callback-Klammer entfernt, async-Klammer bleibt!


// Mitarbeiter einer Abteilung (für Muntazim, mit Bereich/Abteilung/Ersteller/Zeitstempel)
router.get('/meine-abteilung', authenticate, async (req, res) => {
    if (req.user.role !== 'muntazim') {
        return res.status(403).json({ message: 'Nicht berechtigt.' });
    }

    try {
        const [results] = await pool.query(
            `SELECT e.*, 
                    d.name AS abteilungsName, 
                    b.name AS bereichsName, 
                    e.created_at, 
                    e.created_by
             FROM employees e
             LEFT JOIN departments d ON e.department_id = d.id
             LEFT JOIN departments b ON d.parent_id = b.id
             WHERE e.department_id = ?`,
            [req.user.department_id]
        );
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json([]);
    }
});


// ID-Prüfung (unverändert)
router.post('/verify-id', (req, res) => {
    const { idNumber } = req.body;
    const validIds = getValidIds();
    res.json({ 
        isValid: validIds.includes(idNumber?.trim() || ''),
        message: validIds.includes(idNumber?.trim() || '') ? '' : 'ID ungültig'
    });
});

// Import (nur für Admin) - jetzt mit zentraler Prüfung und Fehlerprotokoll
router.post('/import', authenticate, authorizeRole(['admin', 'MA-HN']), async (req, res) => {  
    if (!req.files?.file) {
        return res.status(400).json({
            summary: 'Keine Datei hochgeladen.',
            failedEntries: []
        });
    }
    try {
        const workbook = XLSX.read(req.files.file.data);
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        let success = 0, failed = 0;
        let failedEntries = [];
        for (const row of jsonData) {
            try {
                await validateEmployee({
                    name: row.name,
                    role: row.role,
                    idNumber: row.idNumber,
                    majlisName: row.majlisName,
                    department_id: row.department_id
                }, pool); // <--- geändert!

		// Zusatzfelder aus Excel lesen
                let B_Name = '';
                let B_Majlis = '';
                if (row.idNumber) {
                    const validData = getValidIdData(row.idNumber);
                    if (validData) {
                        B_Name = [validData["First Name"], validData["Last Name"]].filter(Boolean).join(' ');
                        B_Majlis = validData["Majlis"] || '';
                    }
                }

                await createEmployee(
                    row.name,
                    row.role,
                    row.idNumber,
                    row.majlisName,
                    row.department_id,
                    req.user.username, // created_by
                    B_Name,
                    B_Majlis
                );
                success++;
            } catch (err) {
                failed++;
                failedEntries.push({
                    row: row,
                    reason: err.message
                });
            }
        }
        res.json({
            summary: `Import abgeschlossen: ${success} erfolgreich, ${failed} fehlgeschlagen.`,
            failedEntries: failedEntries
        });
    } catch (error) {
        res.status(500).json({ summary: 'Fehler beim Verarbeiten der Datei.', failedEntries: [] });
    }
});

// Komplett-Import (Bereiche/Abteilungen/Mitarbeiter) - jetzt mit zentraler Prüfung und Fehlerprotokoll
router.post('/import-full', authenticate, authorizeRole(['admin', 'MA-HN']), async (req, res) => {
    if (!req.files?.file) {
        return res.status(400).json({
            summary: 'Keine Datei hochgeladen.',
            failedEntries: []
        });
    }
    try {
        const workbook = XLSX.read(req.files.file.data);
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        let success = 0, failed = 0;
        let failedEntries = [];
        
        for (const row of jsonData) {
            try {
                // Validierung für ParentTyp
                if (row.ParentTyp === 'SI' && row.Bereichsname) {
                    throw new Error('Bei ParentTyp "SI" muss Bereichsname leer sein.');
                }
                
                if (!row.Bereichsname && !row.ParentTyp) {
                    throw new Error('Entweder Bereichsname oder ParentTyp muss angegeben sein.');
                }
                
                                // NEU: Zentrale Logik für SM, MA, SI wie bei Einzelanlage
                let departmentId = null;
                if (['SM', 'MA', 'SI'].includes(row.Rolle)) {
                    // Prüfen, ob schon vorhanden
                    const [existing] = await pool.query(
                        "SELECT COUNT(*) AS count FROM employees WHERE role = ?", [row.Rolle]
                    );
                    if (existing[0].count > 0) {
                        throw new Error(`Es darf nur einen Mitarbeiter mit der Rolle ${row.Rolle} geben.`);
                    }
                    // Department für diese Rolle suchen oder anlegen
                    const [dept] = await pool.query(
                        "SELECT id FROM departments WHERE type = ? LIMIT 1", [row.Rolle]
                    );
                    if (dept.length > 0) {
                        departmentId = dept[0].id;
                    } else {
                        // Neuen Department-Eintrag anlegen
                        const result = await pool.query(
                            "INSERT INTO departments (name, type) VALUES (?, ?)",
                            [row.Mitarbeitername, row.Rolle]
                        );
                        departmentId = result[0].insertId;
                    }
                    await validateEmployee({
                        name: row.Mitarbeitername,
                        role: row.Rolle,
                        idNumber: row.IDNummer,
                        majlisName: row.Majlisname,
                        department_id: departmentId
                    }, pool); // <--- geändert!

                    // Zusatzfelder aus Excel lesen
                    let B_Name = '';
                    let B_Majlis = '';
                    const idNummer = row.IDNummer || row.idNumber;
                    if (idNummer) {
                        const validData = getValidIdData(idNummer);
                        if (validData) {
                            B_Name = [validData["First Name"], validData["Last Name"]].filter(Boolean).join(' ');
                            B_Majlis = validData["Majlis"] || '';
                        }
                    }

                    await createEmployee(
                        row.Mitarbeitername,
                        row.Rolle,
                        row.IDNummer,
                        row.Majlisname,
                        departmentId,
                        req.user.username,
                        B_Name,
                        B_Majlis
                    );
                    success++;
                    continue; // Rest der Schleife überspringen
                }

                // --- ALTE LOGIK FÜR BEREICHE UND ABTEILUNGEN BLEIBT UNVERÄNDERT ---
                // 1. Bereich prüfen/ggf. anlegen (wenn Bereichsname vorhanden)
                if (row.Bereichsname) {
                    let [bereich] = await pool.query(
                        "SELECT id FROM departments WHERE name = ? AND type = 'NMA'",
                        [row.Bereichsname]
                    );
                    
                    if (bereich.length === 0) {
                        // Neuen Bereich anlegen mit parent_id auf MA (wenn ParentTyp angegeben)
                        let result = await pool.query(
                            "INSERT INTO departments (name, type, parent_id) VALUES (?, 'NMA', ?)",
                            [row.Bereichsname, parentId]
                        );
                        bereichId = result[0].insertId;
                    } else {
                        bereichId = bereich[0].id;
                        // Optional: parent_id aktualisieren, wenn ParentTyp angegeben
                        if (parentId) {
                            await pool.query(
                                "UPDATE departments SET parent_id = ? WHERE id = ?",
                                [parentId, bereichId]
                            );
                        }
                    }
                }
                // 2. Abteilung prüfen/ggf. anlegen
                let parentForAbteilung = bereichId;
                if (!bereichId && row.ParentTyp === 'SI') {
                    parentForAbteilung = parentId;
                } else if (!bereichId && row.ParentTyp === 'MA') {
                    parentForAbteilung = parentId;
                }
                let [abt] = await pool.query(
                    "SELECT id FROM departments WHERE name = ? AND type = 'Muntazim' AND parent_id = ?",
                    [row.Abteilungsname, parentForAbteilung]
                );
                if (abt.length === 0) {
                    let result = await pool.query(
                        "INSERT INTO departments (name, type, parent_id) VALUES (?, 'Muntazim', ?)",
                        [row.Abteilungsname, parentForAbteilung]
                    );
                    abteilungId = result[0].insertId;
                } else {
                    abteilungId = abt[0].id;
                }

                await validateEmployee({
                    name: row.Mitarbeitername,
                    role: row.Rolle,
                    idNumber: row.IDNummer,
                    majlisName: row.Majlisname,
                    department_id: abteilungId
                }, pool); // <--- geändert!

                // Zusatzfelder aus Excel lesen
                let B_Name = '';
                let B_Majlis = '';
                const idNummer = row.IDNummer || row.idNumber;
                if (idNummer) {
                    const validData = getValidIdData(idNummer);
                    if (validData) {
                        B_Name = [validData["First Name"], validData["Last Name"]].filter(Boolean).join(' ');
                        B_Majlis = validData["Majlis"] || '';
                    }
                }

                await createEmployee(
                    row.Mitarbeitername,
                    row.Rolle,
                    row.IDNummer,
                    row.Majlisname,
                    abteilungId,
                    req.user.username,
                    B_Name,
                    B_Majlis
                );
                success++;

            } catch (err) {
                failed++;
                failedEntries.push({
                    row: row,
                    reason: err.message
                });
            }
        }
        res.json({
            summary: `Import abgeschlossen: ${success} erfolgreich, ${failed} fehlgeschlagen.`,
            failedEntries: failedEntries
        });
    } catch (error) {
        res.status(500).json({ summary: 'Fehler beim Verarbeiten der Datei.', failedEntries: [] });
    }
});

// Export aller Mitarbeiter als Excel (nur für Admin)
router.get('/export', authenticate, authorizeRole(['admin', 'MA-HN']), async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT e.*, 
                    d.name AS abteilungsName, 
                    b.name AS bereichsName, 
                    e.created_at, 
                    e.created_by
             FROM employees e
             LEFT JOIN departments d ON e.department_id = d.id
             LEFT JOIN departments b ON d.parent_id = b.id`
        );
        // Excel-Datei erstellen
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Mitarbeiter");
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        res.setHeader('Content-Disposition', 'attachment; filename="mitarbeiter_export.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        res.status(500).send('Fehler beim Exportieren der Daten.');
    }
});

// Ausweis-Druckstatus: printed_on setzen (nach PDF-Export)
router.put('/:id/printed', authenticate, async (req, res) => {
  try {
    await pool.query(
      'UPDATE employees SET printed_on = NOW() WHERE id = ?', [req.params.id]
    );
    res.json({ message: 'printed_on gesetzt' });
  } catch (err) {
    res.status(500).json({ message: 'Fehler beim Setzen von printed_on.' });
  }
});

// Ausweis-Druckstatus: printed_on zurücksetzen (manuell)
router.put('/:id/unprint', authenticate, async (req, res) => {
  try {
    await pool.query(
      'UPDATE employees SET printed_on = NULL WHERE id = ?', [req.params.id]
    );
    res.json({ message: 'printed_on entfernt' });
  } catch (err) {
    res.status(500).json({ message: 'Fehler beim Entfernen von printed_on.' });
  }
});

module.exports = router;
