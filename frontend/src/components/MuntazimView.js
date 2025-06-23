// frontend/src/components/MuntazimView.js


import React, { useState, useEffect } from 'react';
import './MuntazimView.css';
const MuntazimView = () => {
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [form, setForm] = useState({
    name: '',
    role: 'Muawin',
    idNumber: '',
    majlisName: ''
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const [editMitarbeiter, setEditMitarbeiter] = useState(null);
  const [message, setMessage] = useState('');
  
  const [editMessage, setEditMessage] = useState('');
  const editRef = React.useRef(null);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    fetch('http://localhost:5000/api/employees/meine-abteilung', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setMitarbeiter(Array.isArray(data) ? data : []))
      .catch(() => setMitarbeiter([]));
  }, []);

useEffect(() => {
  if (editMitarbeiter && editRef.current) {
    editRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}, [editMitarbeiter]);


  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEmployeeSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    const token = sessionStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/employees', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(form)
    });
    if (response.ok) {
      setMessage('Mitarbeiter erfolgreich angelegt!');
      fetch('http://localhost:5000/api/employees/meine-abteilung', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setMitarbeiter(Array.isArray(data) ? data : []));
      setForm({ name: '', role: 'Muawin', idNumber: '', majlisName: '' });
    } else {
      const errorText = await response.text();
      setMessage('Fehler beim Anlegen des Mitarbeiters: ' + errorText);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(selectedIds.includes(id)
      ? selectedIds.filter(sid => sid !== id)
      : [...selectedIds, id]);
  };

  const deleteEmployee = async (id) => {
  const token = sessionStorage.getItem('token');
  setEditMessage('');
  const response = await fetch(`http://localhost:5000/api/employees/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (response.ok) {
  const result = await response.json();
  setEditMessage(result.message);
} else {
  const errorText = await response.text();
  setEditMessage('Fehler beim Löschen: ' + errorText);
}

  fetch('http://localhost:5000/api/employees/meine-abteilung', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => setMitarbeiter(Array.isArray(data) ? data : []));
};

  const deleteSelected = async () => {
  const token = sessionStorage.getItem('token');
  for (const id of selectedIds) {
    await fetch(`http://localhost:5000/api/employees/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }
  // Jetzt die Tabelle immer per Fetch neu laden:
  fetch('http://localhost:5000/api/employees/meine-abteilung', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => setMitarbeiter(Array.isArray(data) ? data : []));
  setSelectedIds([]);
};


  const startEdit = (m) => {
	setEditMitarbeiter(m); setEditMessage('');
  };


  const handleEditChange = (e) => {
    setEditMitarbeiter({ ...editMitarbeiter, [e.target.name]: e.target.value });
  };

  const saveEdit = async () => {
  const token = sessionStorage.getItem('token');
  setEditMessage('');
  const response = await fetch(`http://localhost:5000/api/employees/${editMitarbeiter.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(editMitarbeiter)
  });
  // Immer nach dem Bearbeiten: Markierung entfernen
  await fetch(`http://localhost:5000/api/employees/${editMitarbeiter.id}/unprint`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (response.ok) {
  const result = await response.json();
  setEditMessage(result.message);
  setEditMitarbeiter(null);
  fetch('http://localhost:5000/api/employees/meine-abteilung', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => setMitarbeiter(Array.isArray(data) ? data : []));
} else {
  const errorText = await response.text();
  setEditMessage('Fehler beim Bearbeiten: ' + errorText);
}

};


  return (
    <div>
      <h2>Meine Abteilung – Mitarbeiterverwaltung</h2>
      {/* Mitarbeiter anlegen */}
      <form onSubmit={handleEmployeeSubmit}>
        <input name="name" value={form.name} onChange={handleChange} placeholder="Name" required />
        <select name="role" value={form.role} onChange={handleChange}>
          <option value="Muawin">Muawin</option>
          <option value="Naib Muntazim">Naib Muntazim</option>
        </select>
        <input name="idNumber" value={form.idNumber} onChange={handleChange} placeholder="ID Nummer" required />
        <input name="majlisName" value={form.majlisName} onChange={handleChange} placeholder="Majlisname" required />
        <button type="submit"style={{ background: "#1976D2", color: "#fff" }}>Mitarbeiter anlegen</button>
      </form>
      {message && <p>{message}</p>}

      <h3>Mitarbeiterliste</h3>
      <table className="employee-table" style={{ marginBottom: '4em' }}>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={selectedIds.length === mitarbeiter.length && mitarbeiter.length > 0}
                onChange={() => setSelectedIds(selectedIds.length === mitarbeiter.length ? [] : mitarbeiter.map(m => m.id))}
              />
            </th>
            <th>Name</th>
	    <th>B Name</th>
	    <th>B Majlis</th>
            <th>Rolle</th>
            <th>ID Nr.</th>
            <th>Majlis</th>            
            <th>Abteilung</th>
            <th>Erstellt am</th>            
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {mitarbeiter.map(m => (
            <tr key={m.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(m.id)}
                  onChange={() => toggleSelect(m.id)}
                />
              </td>
              <td>{m.name}</td>
	      <td>{m.B_Name}</td>
	      <td>{m.B_Majlis}</td>
              <td>{m.role}</td>
              <td>{m.idNumber}</td>
              <td>{m.majlisName}</td>              
              <td>{m.abteilungsName}</td>
              <td>{m.created_at ? new Date(m.created_at).toLocaleString() : ''}</td>
              <td>
                <button onClick={() => startEdit(m)}style={{ background: "#1976D2", color: "#fff" }}>Bearbeiten</button>
                <button onClick={() => deleteEmployee(m.id)}style={{ background: "#e53935", color: "#fff" }}>Löschen</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
	
      {selectedIds.length > 0 && (
        <button onClick={deleteSelected}>Ausgewählte löschen</button>
      )}
{editMessage && (
  	<p style={{ color: editMessage.startsWith('Fehler') ? 'red' : 'green', marginTop: '1em' }}>
    	{editMessage}
  	</p>
     )}

      {editMitarbeiter && (
        <div ref={editRef}>
          <h4>Mitarbeiter bearbeiten</h4>
          <input name="name" value={editMitarbeiter.name} onChange={handleEditChange} />
          <select name="role" value={editMitarbeiter.role} onChange={handleEditChange}>
            <option value="Muawin">Muawin</option>
            <option value="Naib Muntazim">Naib Muntazim</option>
          </select>
          <input name="idNumber" value={editMitarbeiter.idNumber} onChange={handleEditChange} />
          <input name="majlisName" value={editMitarbeiter.majlisName} onChange={handleEditChange} />
          <button onClick={saveEdit}>Speichern</button>
          <button onClick={() => { setEditMitarbeiter(null); setEditMessage(''); }}>Abbrechen</button>
        </div>
      )}
    </div>
  );
};

export default MuntazimView;