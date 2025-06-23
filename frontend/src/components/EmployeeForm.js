//frontend/src/components/EmployeeForm.js

import React, { useState, useEffect } from 'react';

const EmployeeForm = () => {
    // States für alle Felder
    const [name, setName] = useState('');
    const [role, setRole] = useState('Muawin');
    const [idNumber, setIdNumber] = useState('');
    const [majlisName, setMajlisName] = useState('');
    
    const [departmentId, setDepartmentId] = useState('');
    const [abteilungName, setAbteilungName] = useState('');
    const [verificationStatus, setVerificationStatus] = useState('');
    const [abteilungen, setAbteilungen] = useState([]);
    const userRole = sessionStorage.getItem('role');
    // const userDepartmentId = sessionStorage.getItem('department_id'); // [ENTFERNT] Nicht mehr benötigt

    // [NEU] Mapping für Enum-Werte
    const roleMap = {
        "Naib Muntazim": "NM",
        "Muawin": "Muawin",
        "Muntazim": "Muntazim",
        "NMA": "NMA"
    };

    useEffect(() => {
        if (userRole === 'muntazim') {
            // Hole die Abteilung des eingeloggten Muntazim
            fetch('http://localhost:5000/api/departments/mein-bereich-abteilung', {
                headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
            })
                .then(res => res.json())
                .then(data => {
                    setDepartmentId(data.abteilungId);
                    setAbteilungName(data.abteilungsName);
                });
        } else {
            // Admin sieht alle Abteilungen
            fetch('http://localhost:5000/api/departments/abteilungenAlle', {
                headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
            })
                .then(res => res.json())
                .then(data => setAbteilungen(Array.isArray(data) ? data : []));
        }
    }, [userRole]);

    // ID-Prüfung über Backend-API
    const verifyId = async (id) => {
        const response = await fetch('http://localhost:5000/api/employees/verify-id', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idNumber: id })
        });
        const result = await response.json();
        return result.isValid;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setVerificationStatus('');
        if (!departmentId) {
            setVerificationStatus('Abteilung konnte nicht ermittelt werden.');
            return;
        }
        const isValid = await verifyId(idNumber);
        if (!isValid) {
            setVerificationStatus('ID-Nummer ungültig.');
            return;
        }
        const response = await fetch('http://localhost:5000/api/employees', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                role: roleMap[role], // [NEU] Enum-Mapping!
                idNumber,
                majlisName,
                department_id: departmentId // Wichtig für Admin und Muntazim!
            }),
        });

        if (response.ok) {
            setName('');
            setRole('Muawin');
            setIdNumber('');
            setMajlisName('');
            setVerificationStatus('');
        } else {
            const errorText = await response.text();
            setVerificationStatus('Fehler: ' + errorText);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                required
            />
            <select value={role} onChange={(e) => setRole(e.target.value)}>
                {/* Mapping: Dropdown-Text → DB-Enum */}
                <option value="Naib Muntazim">Naib Muntazim</option>
                <option value="Muawin">Muawin</option>
            </select>
            <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="ID Nummer"
                required
            />
            <input
                type="text"
                value={majlisName}
                onChange={(e) => setMajlisName(e.target.value)}
                placeholder="Majlisname"
                required
            />

            {/* Department-Auswahl für Admin, für Muntazim nur Anzeige */}
            {userRole === 'muntazim' ? (
                <input type="text" value={abteilungName} readOnly placeholder="Abteilung" />
            ) : (
                <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required>
                    <option value="">Abteilung wählen</option>
                    {abteilungen.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                </select>
            )}
            <button type="submit">Submit</button>
            {verificationStatus && <p>{verificationStatus}</p>}
        </form>
    );
};

export default EmployeeForm;