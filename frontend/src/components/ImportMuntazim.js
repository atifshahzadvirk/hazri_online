// frontend/src/components/ImportMuntazim.js

import React from 'react';
import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs'; //Änderung von bcrypt zu bcryptjs

const ImportMuntazim = () => {
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const wb = XLSX.read(evt.target.result, {type: 'binary'});
            const ws = wb.Sheets[wb.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(ws);

            for (const row of jsonData) {
                const hashedPassword = await bcrypt.hash(row.password, 10);
                // Erwartet: username, password, department_id, position, role im Excel/CSV
		// API-Anfrage, um den Benutzer zu erstellen
                fetch(`${process.env.REACT_APP_API_URL}/api/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: row.username,
                        password: hashedPassword,
                        department_id: row.department_id,
                        position: row.position,
                        role: row.role,
                        idNumber: row.idNumber
                    }),
                })
                .then(response => {
                    if (response.ok) {
                        console.log(`Muntazim ${row.username} erfolgreich erstellt.`);
                    } else {
                        console.error('Fehler beim Erstellen des Muntazim');
                    }
                });
            }
        };

        reader.readAsBinaryString(file);
    };

    return (
        <div>
            <input type="file" onChange={handleFileUpload} accept=".xlsx" />
        </div>
    );
};

export default ImportMuntazim;
