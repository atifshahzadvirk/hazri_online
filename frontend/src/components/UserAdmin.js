// frontend/src/components/UserAdmin.js

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

const UserAdmin = () => {
  const [form, setForm] = useState({
    username: '',
    password: '',
    department_id: '',
    
    role: 'muntazim',
    idNumber: ''
  });
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [bereiche, setBereiche] = useState([]);
  const [abteilungen, setAbteilungen] = useState([]);
  const [selectedBereich, setSelectedBereich] = useState('');
  const [message, setMessage] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const userRole = sessionStorage.getItem('role');
  // --- NEU: State für Benutzertabelle und Bearbeiten ---
  const [userList, setUserList] = useState([]);
  const [editUser, setEditUser] = useState(null); // Für Bearbeiten

  // Sichtbarkeit der Benutzertabelle steuern
  const [showUserTable, setShowUserTable] = useState(false);

  // Mapping für Enum-Werte
  // // (entfernt, Mapping nicht mehr nötig!)

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    fetch(`${process.env.REACT_APP_API_URL}/api/departments/bereiche`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Fehler beim Laden der Bereiche');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) setBereiche(data);
        else setBereiche([]);
      })
      .catch(() => setBereiche([]));
  }, []);

  useEffect(() => {
    // Nur wenn Bereich gewählt und Rolle muntazim
    if (selectedBereich && form.role === 'muntazim') {
      const token = sessionStorage.getItem('token');
      fetch(`${process.env.REACT_APP_API_URL}/api/departments/abteilungen?bereichId=${selectedBereich}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) throw new Error('Fehler beim Laden der Abteilungen');
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) setAbteilungen(data);
          else setAbteilungen([]);
        })
        .catch(() => setAbteilungen([]));
    } else {
      setAbteilungen([]);
    }
  }, [selectedBereich, form.role]);

// --- NEU: Alle Benutzer beim Laden abrufen (nur für admin) ---
useEffect(() => {
  if (userRole !== 'admin') return;
  const token = sessionStorage.getItem('token');
  fetch(`${process.env.REACT_APP_API_URL}/api/auth/users`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(setUserList)
    .catch(() => setUserList([]));
}, [userRole]);


  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleBereichChange = (e) => {
    setSelectedBereich(e.target.value);
    setForm({ ...form, department_id: '' });
  };

  const handleAbteilungChange = (e) => {
    setForm({ ...form, department_id: e.target.value });
  };

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    setForm({ ...form, role: newRole, department_id: '' });
    setSelectedBereich('');
    setAbteilungen([]);
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setPasswordError('');

    if (form.password !== passwordRepeat) {
      setPasswordError('Die Passwörter stimmen nicht überein.');
      return;
    }

    if (form.role !== "admin") {
      if (!/^\d{5}$/.test(form.idNumber)) {
    	setMessage('Die ID Nummer muss genau 5 Ziffern haben (z.B. 00001 bis 99999).');
    return;
  }
} else {
     if (form.idNumber && !/^\d{5}$/.test(form.idNumber)) {
    	setMessage('Die ID Nummer muss genau 5 Ziffern haben (z.B. 00001 bis 99999).');
    return;
  }
}



    // Validierung Bereich/Abteilung je nach Rolle
    if (form.role === 'muntazim') {
      if (!selectedBereich) {
        setMessage('Bitte einen Bereich wählen.');
        return;
      }
      if (!form.department_id) {
        setMessage('Bitte eine Abteilung wählen.');
        return;
      }
    }
    if (form.role === 'NMA(read-only)') {
      if (!selectedBereich) {
        setMessage('Bitte einen Bereich wählen.');
        return;
      }
    }

    const token = sessionStorage.getItem('token');
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/register`, {
  	method: 'POST',
  	headers: {
    	  'Content-Type': 'application/json',
    	  'Authorization': `Bearer ${token}`
  	},
  	body: JSON.stringify({
    	  username: form.username,
    	  password: form.password,
    	  // department_id nur für passende Rollen senden, sonst null
    	  department_id: form.role === 'muntazim' ? form.department_id
                  	: form.role === 'NMA(read-only)' ? selectedBereich
                  	: null,
    	role: form.role, // <-- Änderung: direkt übernehmen!
    	idNumber: form.idNumber
      })
    });
    if (response.ok) {
      setMessage('Benutzer erfolgreich angelegt!');

        setForm({ username: '', password: '', department_id: '', role: 'muntazim', idNumber: '' });
        setPasswordRepeat('');
        setSelectedBereich('');
      } else {
        const errorText = await response.text();
        setMessage('Fehler beim Anlegen des Benutzers: ' + errorText);
      }
    } catch (err) {
      setMessage('Fehler beim Anlegen des Benutzers.');
    }
  };

  // Benutzer-Import (Excel/CSV) – jetzt mit Klartext-Passwort!
  const handleFileUpload = (e) => {
  setImportMsg('');
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = async (evt) => {
    const token = sessionStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file); // ✅ Datei als FormData senden

    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}` // 🚫 Kein Content-Type setzen!
      },
      body: formData // ✅ Korrekter Body
    });
    const result = await response.json();
    setImportMsg(result);
  };
  reader.readAsBinaryString(file);
};

// --- NEU: Handler für das Bearbeiten eines Benutzers ---
const handleEditUser = async (e) => {
  e.preventDefault();
  const token = sessionStorage.getItem('token');
  const { id, username, role, department_id, idNumber, password } = editUser;
  const body = { username, role, department_id, idNumber };
  if (password) body.password = password;

  await fetch(`${process.env.REACT_APP_API_URL}/api/auth/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  setEditUser(null);
  // Tabelle neu laden
  fetch(`${process.env.REACT_APP_API_URL}/api/auth/users`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(setUserList)
    .catch(() => setUserList([]));
};


  return (
    <div>
      <h2>Benutzerverwaltung (nur Admin)</h2>
      
{userRole === 'admin' && (		// Button zum Ein-/Ausblenden der Benutzertabelle (nur für admin)
  <button
    style={{ marginBottom: 16, background: "#1976D2", color: "#fff" }}
    onClick={() => setShowUserTable(v => !v)}
  >
    Benutzertabelle {showUserTable ? "ausblenden" : "einblenden"}
  </button>
)}

      <h3>Einzelnen Benutzer anlegen</h3>
      <form onSubmit={handleUserSubmit}>
        <input name="username" value={form.username} onChange={handleChange} placeholder="Benutzername" required />
        <div>
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={handleChange}
            placeholder="Passwort"
            required
            autoComplete="new-password"
          />
          <input
            name="passwordRepeat"
            type={showPassword ? "text" : "password"}
            value={passwordRepeat}
            onChange={e => setPasswordRepeat(e.target.value)}
            placeholder="Passwort wiederholen"
            required
            autoComplete="new-password"
          />
          <label style={{ marginLeft: 8 }}>
            <input
              type="checkbox"
              checked={showPassword}
              onChange={() => setShowPassword(!showPassword)}
            /> Passwort anzeigen
          </label>
          {passwordError && <p style={{ color: 'red' }}>{passwordError}</p>}
        </div>
        <select name="role" value={form.role} onChange={handleRoleChange}>
          <option value="admin">admin</option>
          <option value="muntazim">muntazim</option>
          <option value="NMA(read-only)">NMA(read-only)</option>
	  <option value="MA-HN">MA-HN</option>
        </select>
        {/* Bereich-Auswahl nur für NMA(read-only) und muntazim */}
        {(form.role === 'NMA(read-only)' || form.role === 'muntazim') && (
          <select value={selectedBereich} onChange={handleBereichChange} required={form.role !== 'admin'}>
            <option value="">Bereich wählen</option>
            {bereiche.map(b => (
              <option key={b.id} value={b.id}>
                {b.name} (Leiter: {b.leiter})
              </option>
            ))}
          </select>
        )}
        {/* Abteilungs-Auswahl nur für muntazim */}
        {form.role === 'muntazim' && selectedBereich && (
          <select name="department_id" value={form.department_id} onChange={handleAbteilungChange} required>
            <option value="">Abteilung wählen</option>
            {abteilungen.map(a => (
              <option key={a.id} value={a.id}>
                {a.name} (Leiter: {a.leiter})
              </option>
            ))}
          </select>
        )}
        {/* ID Nummer ist nur für Nicht-Admins Pflicht */}
        <input
  	  name="idNumber"
  	  value={form.idNumber}
  	  onChange={handleChange}
  	  placeholder="ID Nummer"
  	  required={form.role !== "admin"}
  	  type="text"
  	  pattern="\d{5}"
  	  inputMode="numeric"
  	  maxLength={5}
  	  onInput={e => {
    	    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5);
  	  }}
	/>

              <button type="submit"style={{ background: "#1976D2", color: "#fff" }}>Benutzer anlegen</button>
    </form>
    {message && <p>{message}</p>}

    {userRole === 'admin' && (
      <>
        <h3>Benutzer-Import (Excel/CSV)</h3>
        <input type="file" accept=".xlsx, .csv" onChange={handleFileUpload} />
        {importMsg && importMsg.summary && (
          <div>
            <p>{importMsg.summary}</p>
            {importMsg.failedEntries && importMsg.failedEntries.length > 0 && (
              <div>
                <h4>Fehlgeschlagene Datensätze:</h4>
                <ul>
                  {importMsg.failedEntries.map((entry, idx) => (
                    <li key={idx}>
                      {JSON.stringify(entry)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

	{/* --- NEU: Benutzertabelle und Bearbeiten-Formular --- */}
	{showUserTable && (
  	 <>

          <h3>Alle Benutzer</h3>
          <table>
            <thead>
              <tr>
                <th>Benutzername</th>
                <th>Rolle</th>
                <th>Abteilung</th>
                <th>ID Nummer</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {userList.map(user => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.role}</td>
                  <td>{user.department_id}</td>
                  <td>{user.idNumber}</td>
                  <td>
                    <button onClick={() => setEditUser({ ...user, password: '' })}>Bearbeiten</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {editUser && (
  <form onSubmit={handleEditUser} style={{ marginTop: 20, border: '1px solid #ccc', padding: 10 }}>
    <h4>Benutzer bearbeiten: {editUser.username}</h4>
    <label>
      Benutzername:
      <input
        value={editUser.username}
        onChange={e => setEditUser({ ...editUser, username: e.target.value })}
      />
    </label>
    <label>
      Rolle:
      <select value={editUser.role} onChange={e => setEditUser({ ...editUser, role: e.target.value })}>
        <option value="admin">admin</option>
        <option value="muntazim">muntazim</option>
        <option value="NMA(read-only)">NMA(read-only)</option>
        <option value="MA-HN">MA-HN</option>
      </select>
    </label>
    <label>
      Abteilung:
      <input value={editUser.department_id || ''} onChange={e => setEditUser({ ...editUser, department_id: e.target.value })} />
    </label>
    <label>
      ID Nummer:
      <input value={editUser.idNumber || ''} onChange={e => setEditUser({ ...editUser, idNumber: e.target.value })} />
    </label>
    <label>
      Neues Passwort (optional):
      <input type="password" value={editUser.password || ''} onChange={e => setEditUser({ ...editUser, password: e.target.value })} />
    </label>
    <button type="submit" style={{ background: "#1976D2", color: "#fff" }}>Speichern</button>
    <button type="button" onClick={() => setEditUser(null)} style={{ background: "#FF9800", color: "#fff" }}>Abbrechen</button>
  </form>
 )}

</>
 )}

 </>
)}

      <p style={{fontSize: "small"}}>Die Datei muss die Spalten <b>username, password, department_id, role, idNumber</b> enthalten.</p>
    </div>
  );
};

export default UserAdmin;