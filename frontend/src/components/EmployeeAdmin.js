//frontend/src/components/EmployeeAdmin.js

import './EmployeeAdmin.css';
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useTable, useSortBy, useFilters } from 'react-table';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Rollen-Layouts zuweisen (Pfad ggf. anpassen)
  const BADGE_LAYOUTS = {
  Muawin: '/assets/layout-muawin.jpeg',
  'Naib Muntazim': '/assets/layout-naibmuntazim.jpeg',
  Muntazim: '/assets/layout-muntazim.jpeg',
  NMA: '/assets/layout-nma.jpeg',
  // ggf. weitere Rollen ergänzen
};

const DIN_A6_MM = [148, 105]; // Breite x Höhe in mm (quer)


const EmployeeAdmin = () => {
  const [form, setForm] = useState({
    name: '',
    role: 'Muawin',
    bereich_id: '',      // <--- NEU
    department_id: '',
    idNumber: '',
    majlisName: ''
  });
  const [abteilungen, setAbteilungen] = useState([]);
  const [bereicheNMA, setBereicheNMA] = useState([]);
  const [message, setMessage] = useState('');
  const [importMsg, setImportMsg] = useState(null); 		//geändert: null statt {}  
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editMitarbeiter, setEditMitarbeiter] = useState(null);
  const [editForm, setEditForm] = useState({
  name: '',
  role: 'Muawin',
  bereich_id: '',
  department_id: '',
  idNumber: '',
  majlisName: ''
});
const editRef = React.useRef(null);

const [editMessage, setEditMessage] = useState('');

// Hilfsfunktion: Bild als ArrayBuffer laden
async function fetchImageAsArrayBuffer(url) {
  const response = await fetch(url);
  return await response.arrayBuffer();
}


const generateBadgesPDF = React.useCallback(async (mitarbeiterListe) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < mitarbeiterListe.length; i++) {
    const m = mitarbeiterListe[i];
    const page = pdfDoc.addPage(DIN_A6_MM);

    // Layout-Bild laden und einbinden
    const layoutUrl = BADGE_LAYOUTS[m.role] || BADGE_LAYOUTS['Muawin'];
    const imgBytes = await fetchImageAsArrayBuffer(layoutUrl);
    let img;
    if (layoutUrl.toLowerCase().endsWith('.png')) {
      img = await pdfDoc.embedPng(imgBytes);
    } else if (
      layoutUrl.toLowerCase().endsWith('.jpg') ||
      layoutUrl.toLowerCase().endsWith('.jpeg')
    ) {
      img = await pdfDoc.embedJpg(imgBytes);
    } else {
      throw new Error('Unbekanntes Bildformat für Layout: ' + layoutUrl);
    }

    page.drawImage(img, { x: 0, y: 0, width: DIN_A6_MM[0], height: DIN_A6_MM[1] });

    // Textfelder platzieren (Koordinaten anpassen!)
    page.drawText(m.B_Name || '', { x: 22, y: 41, size: 8, font, color: rgb(0, 0, 0) });
    page.drawText(m.idNumber || '', { x: 15, y: 27, size: 7, font, color: rgb(0, 0, 0) });
    page.drawText(m.abteilungsName || '', { x: 26, y: 34, size: 7, font, color: rgb(0, 0, 0) });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'ausweise.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}, []);

useEffect(() => {
  if (editMitarbeiter) {
    setEditForm({
      name: editMitarbeiter.name || '',
      role: editMitarbeiter.role || 'Muawin',
      bereich_id: '',
      department_id: '',
      idNumber: editMitarbeiter.idNumber || '',
      majlisName: editMitarbeiter.majlisName || ''
    });
    setAbteilungen([]);
  }
}, [editMitarbeiter]);


useEffect(() => {
  if (editForm.bereich_id) {
    const token = sessionStorage.getItem('token');
    fetch(`${process.env.REACT_APP_API_URL}/api/departments/abteilungen?bereichId=${editForm.bereich_id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setAbteilungen(Array.isArray(data) ? data : []))
      .catch(() => setAbteilungen([]));
  } else {
    setAbteilungen([]);
  }
}, [editForm.bereich_id]);



useEffect(() => {
  if (editMitarbeiter && editRef.current) {
    editRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}, [editMitarbeiter]);

const handleEditChange = (e) => {
  const { name, value } = e.target;
  if (name === "bereich_id") {
    setEditForm(prev => ({
      ...prev,
      bereich_id: value,
      department_id: ''
    }));
  } else {
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  }
};

const handleEditSubmit = async (e) => {
  e.preventDefault();
  setEditMessage('');
  const token = sessionStorage.getItem('token');
  let department_id = editForm.department_id;
  if (["SM", "MA", "SI"].includes(editForm.role)) {
    department_id = getDepartmentIdForRole(editForm.role);
    if (!department_id) {
      setEditMessage(`Fehler: Keine Abteilung vom Typ ${editForm.role} gefunden.`);
      return;
    }
  }
  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/employees/${editMitarbeiter.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ ...editForm, department_id })
  });

  // NEU: Falls printed_on gelöscht werden soll, extra Request schicken
  if (!editForm.printed_on) {
  fetch(`${process.env.REACT_APP_API_URL}/api/employees/${editMitarbeiter.id}/unprint`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });
}


  if (response.ok) {
    const result = await response.json();
    setEditMessage(result.message);
    setEditMitarbeiter(null);
    fetch(`${process.env.REACT_APP_API_URL}/api/employees/all`, {

      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setMitarbeiter(Array.isArray(data) ? data : []));
  } else {
    const errorText = await response.text();
    setEditMessage('Fehler beim Bearbeiten des Mitarbeiters: ' + errorText);
  }
};
  
  // NEU: Prüfen, ob SM, MA, SI schon existieren
  const existingRoles = mitarbeiter.reduce((acc, m) => {
    if (["SM", "MA", "SI"].includes(m.role)) acc[m.role] = true;
    return acc;
  }, {});
  // NEU: Prüfen, ob SM, MA, SI bereits existieren (außer dem aktuell bearbeiteten Mitarbeiter)
  const existingRolesEdit = mitarbeiter.reduce((acc, m) => {
  if (
    ["SM", "MA", "SI"].includes(m.role) &&
    (!editMitarbeiter || m.id !== editMitarbeiter.id)
  ) acc[m.role] = true;
  return acc;
 }, {});


  function DefaultColumnFilter({
    column: { filterValue, setFilter }
  }) {
    return (
      <input
        value={filterValue || ''}
        onChange={e => setFilter(e.target.value || undefined)}
        placeholder="Filter..."
        style={{ width: '90%' }}
      />
    );
  }

  const toggleSelect = React.useCallback((id) => {
  setSelectedIds(selectedIds => 
    selectedIds.includes(id)
      ? selectedIds.filter(sid => sid !== id)
      : [...selectedIds, id]
  );
}, []);

  const handlePrintBadge = React.useCallback(async (m) => {
  await generateBadgesPDF([m]);
  const token = sessionStorage.getItem('token');
  fetch(`${process.env.REACT_APP_API_URL}/api/employees/${m.id}/printed`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  setMessage('Ausweis wurde erneut exportiert und als gedruckt markiert.');
  // Mitarbeiterliste neu laden
  fetch(`${process.env.REACT_APP_API_URL}/api/employees/all`, {

    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => setMitarbeiter(Array.isArray(data) ? data : []));
}, [generateBadgesPDF]);



  const columns = React.useMemo(() => [
  {
    id: 'selection',
    Header: () => (
      <input
        type="checkbox"
        checked={selectedIds.length === mitarbeiter.length && mitarbeiter.length > 0}
        onChange={() =>
          setSelectedIds(selectedIds.length === mitarbeiter.length ? [] : mitarbeiter.map(m => m.id))
        }
      />
    ),
    accessor: 'select',
    disableFilters: true,
    Filter: null, // <--- explizit KEIN Filter!
    canFilter: false, // <--- Das ist entscheidend!
    disableSortBy: true, // <--- Das ist entscheidend für die Pfeile!
    Cell: ({ row }) => (
      <input
        type="checkbox"
        checked={selectedIds.includes(row.original.id)}
        onChange={() => toggleSelect(row.original.id)}
      />
    )
  },
  {
    Header: 'Name',
    accessor: 'name',
    Filter: DefaultColumnFilter // Filter bleibt aktiv
  },
  {
    Header: 'Rolle',
    accessor: 'role',
    disableFilters: true // Kein Filter
  },
  {
    Header: 'ID Nr.',
    accessor: 'idNumber',
    Filter: DefaultColumnFilter // Filter bleibt aktiv
  },
  {
    Header: 'B Name',
    accessor: 'B_Name',
    disableFilters: true // Kein Filter
  },
  {
    Header: 'B Majlis',
    accessor: 'B_Majlis',
    disableFilters: true // Kein Filter
  },
  {
    Header: 'Majlis',
    accessor: 'majlisName',
    disableFilters: true // Kein Filter
  },
  {
    Header: 'Bereich',
    accessor: 'bereichsName',
    Filter: DefaultColumnFilter // Filter bleibt aktiv
  },
  {
    Header: 'Abteilung',
    accessor: 'abteilungsName',
    disableFilters: true // Kein Filter
  },
  {
    Header: 'Erstellt am',
    accessor: 'created_at',
    disableFilters: true,
    Cell: ({ value }) => value ? new Date(value).toLocaleString() : ''
  },
  {
    Header: 'Erstellt von',
    accessor: 'created_by',
    disableFilters: true // Kein Filter
  },
  {
    Header: 'Aktionen',
    accessor: 'actions',
    disableFilters: true,
    Cell: ({ row }) => (
      <>
        <button onClick={() => startEdit(row.original)}style={{ background: "#1976D2", color: "#fff" }}>Bearbeiten</button>
        <button onClick={() => deleteEmployee(row.original.id)}style={{ background: "#e53935", color: "#fff" }}>Löschen</button>
	<button onClick={() => handlePrintBadge(row.original)}style={{ background: "#1976D2", color: "#fff" }}>Erneut drucken</button>
      </>
    )
  }
], [selectedIds, toggleSelect, mitarbeiter, handlePrintBadge]);


	//filteredMitarbeiter und zugehörige States entfernt

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    fetch(`${process.env.REACT_APP_API_URL}/api/departments/abteilungenAlle`, {

      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setAbteilungen(Array.isArray(data) ? data : []))
      .catch(() => setAbteilungen([]));
    fetch(`${process.env.REACT_APP_API_URL}/api/departments/bereiche`, {

      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setBereicheNMA(Array.isArray(data) ? data : []))
      .catch(() => setBereicheNMA([]));
    fetch(`${process.env.REACT_APP_API_URL}/api/employees/all`, {

      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setMitarbeiter(Array.isArray(data) ? data : []))
      .catch(() => setMitarbeiter([]));
  }, []);

    // NEU: Abteilungen nach Bereich laden
  useEffect(() => {
    if (form.bereich_id) {
      const token = sessionStorage.getItem('token');
      fetch(`${process.env.REACT_APP_API_URL}/api/departments/abteilungen?bereichId=${form.bereich_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setAbteilungen(Array.isArray(data) ? data : []))
        .catch(() => setAbteilungen([]));
    }
  }, [form.bereich_id]);

  // NEU: Funktion zum dynamischen Ermitteln der department_id für SM, MA, SI
  const getDepartmentIdForRole = (role) => {
    // Suche nach Typ, nicht nach Name!
    const entry = bereicheNMA.find(a => a.type === role);
    return entry ? entry.id : null;
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const {
  getTableProps, getTableBodyProps, headerGroups, rows, prepareRow,
} = useTable(
  { columns, data: mitarbeiter },
  useFilters,
  useSortBy
);

    const handleEmployeeSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    const token = sessionStorage.getItem('token');
    
    // Dynamisch department_id für SM, MA, SI ermitteln
    let department_id = form.department_id;
    if (["SM", "MA", "SI"].includes(form.role)) {
      department_id = getDepartmentIdForRole(form.role);
      if (!department_id) {
        setMessage(`Fehler: Keine Abteilung vom Typ ${form.role} gefunden.`);
        return;
      }
    }
    
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/employees`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ...form,
        department_id
      })
    });
    if (response.ok) {
      setMessage('Mitarbeiter erfolgreich angelegt!');
      // Vollständiges Formular-Reset
      setForm({
        name: '',
        role: 'Muawin',
        bereich_id: '',
        department_id: '',
        idNumber: '',
        majlisName: ''
      });
      // Abteilungen zurücksetzen
      setAbteilungen([]);
      
      // Liste neu laden
      fetch(`${process.env.REACT_APP_API_URL}/api/employees/all`, {

        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setMitarbeiter(Array.isArray(data) ? data : []));
    } else {
      const errorText = await response.text();
      setMessage('Fehler beim Anlegen des Mitarbeiters: ' + errorText);
    }
  };


// Mitarbeiter-Import (klassisch)
const handleFileUpload = (e) => {
  setImportMsg(null); // geändert: null statt ''
  const file = e.target.files[0];
  if (!file) return;

  const token = sessionStorage.getItem('token');
  const formData = new FormData();
  formData.append('file', file);

  fetch(`${process.env.REACT_APP_API_URL}/api/employees/import`, {

    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }, // KEIN Content-Type setzen!
    body: formData
  })
    .then(async res => {
      let result;
      try {
        result = await res.json();
      } catch {
        const text = await res.text();
        result = { summary: text || 'Unbekannter Fehler', failedEntries: [] };
      }
	setImportMsg(result);			//abgeändert
      // Liste neu laden
      fetch(`${process.env.REACT_APP_API_URL}/api/employees/all`, {

        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setMitarbeiter(Array.isArray(data) ? data : []));
    })
    .catch(error => {
      setImportMsg('Fehler beim Upload: ' + error.message);
    });
};


  // Import (alte Funktion entfernt)
  // Komplett-Import (alte Funktion entfernt)

  
// Komplett-Import (Bereiche/Abteilungen/Mitarbeiter)
const handleFullImport = (e) => {
  setImportMsg(null); // geändert: null statt ''
  const file = e.target.files[0];
  if (!file) return;

  const token = sessionStorage.getItem('token');
  const formData = new FormData();
  formData.append('file', file);

  fetch(`${process.env.REACT_APP_API_URL}/api/employees/import-full`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }, // KEIN Content-Type setzen!
    body: formData
  })
    .then(async res => {
      let result;
      try {
        result = await res.json();
      } catch {
        const text = await res.text();
        result = { summary: text || 'Unbekannter Fehler', failedEntries: [] };
      }
      setImportMsg(result); // geändert: immer das ganze Objekt speichern
      // Liste neu laden
      fetch(`${process.env.REACT_APP_API_URL}/api/employees/all`, {

        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setMitarbeiter(Array.isArray(data) ? data : []));
    })
    .catch(error => {
      setImportMsg('Fehler beim Upload: ' + error.message);
    });
};

  

  // Export-Button für Admin
  const handleExport = async () => {
    const token = sessionStorage.getItem('token');
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/employees/export`, {
    headers: { 'Authorization': `Bearer ${token}` }
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "mitarbeiter_export.xlsx";
    a.click();
    window.URL.revokeObjectURL(url);
  };

const handleFilteredExport = () => {
  const exportData = rows.map(row => ({
    Name: row.original.name,
    'B Name': row.original.B_Name,
    'B Majlis': row.original.B_Majlis,
    Rolle: row.original.role,
    'ID Nummer': row.original.idNumber,
    Majlis: row.original.majlisName,
    Bereich: row.original.bereichsName,
    Abteilung: row.original.abteilungsName,
    'Erstellt am': row.original.created_at ? new Date(row.original.created_at).toLocaleString() : '',
    'Erstellt von': row.original.created_by
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Mitarbeiter');
  XLSX.writeFile(workbook, 'gefilterte-mitarbeiter.xlsx');
};

  const handlePrintNewBadges = async () => {
  const toPrint = mitarbeiter.filter(m => !m.printed_on);
  if (toPrint.length === 0) {
    setMessage('Keine neuen Ausweise zum Drucken.');
    return;
  }
  await generateBadgesPDF(toPrint);
  // Nach dem Export: Backend-Update für printed_on
  const token = sessionStorage.getItem('token');
  for (const m of toPrint) {
    fetch(`${process.env.REACT_APP_API_URL}/api/employees/${m.id}/printed`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }

  setMessage(`${toPrint.length} Ausweise wurden exportiert und als gedruckt markiert.`);

  // Mitarbeiterliste neu laden (Refresh)
  fetch(`${process.env.REACT_APP_API_URL}/api/employees/all`, {

    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => setMitarbeiter(Array.isArray(data) ? data : []));
};

  
  const deleteEmployee = async (id) => {
  const token = sessionStorage.getItem('token');
  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/employees/${id}`, {

    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (response.ok) {
  const result = await response.json();
  setEditMessage(result.message);
} else {
  const errorText = await response.text();
  setEditMessage('Fehler beim Löschen des Mitarbeiters: ' + errorText);
}


  // Liste immer neu laden, damit der Stand korrekt ist!
  fetch(`${process.env.REACT_APP_API_URL}/api/employees/all`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => setMitarbeiter(Array.isArray(data) ? data : []));
};

const deleteSelected = async () => {
  const token = sessionStorage.getItem('token');
  let success = 0;
  for (const id of selectedIds) {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/employees/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) success++;
  }
  fetch(`${process.env.REACT_APP_API_URL}/api/employees/all`, {

    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => setMitarbeiter(Array.isArray(data) ? data : []));
  setSelectedIds([]);
  setEditMessage(`${success} Mitarbeiter erfolgreich gelöscht!`);
};

 const unprintSelected = async () => {
  if (
    !window.confirm(
      `Möchten Sie wirklich alle ${selectedIds.length} ausgewählten Datensätze als "nicht gedruckt" markieren?`
    )
  ) {
    return;
  }
  const token = sessionStorage.getItem('token');
  let success = 0;
  for (const id of selectedIds) {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/employees/${id}/unprint`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) success++;
  }
  fetch(`${process.env.REACT_APP_API_URL}/api/employees/all`, {

    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => setMitarbeiter(Array.isArray(data) ? data : []));
  setSelectedIds([]);
  setEditMessage(`${success} Mitarbeiter als "nicht gedruckt" markiert!`);
};

  const startEdit = (m) => {
  setEditMitarbeiter(m);
  setEditMessage('');
  setEditForm({
    name: m.name || '',
    role: m.role || 'Muawin',
    bereich_id: '',
    department_id: '',
    idNumber: m.idNumber || '',
    majlisName: m.majlisName || ''
  });
  setAbteilungen([]);
};


  return (
    <div>
      <h2>Mitarbeiterverwaltung (nur Admin)</h2>
      <div className="badge-print-area">
  <h3>Ausweise drucken</h3>
  <button onClick={handlePrintNewBadges}
  style={{ background: "#1976D2", color: "#fff" }}
  >Print new badges</button>
  {/* Optional: weitere Buttons/Funktionen */}
</div>
      <h3>Einzelnen Mitarbeiter anlegen</h3>
      <form onSubmit={handleEmployeeSubmit}>
        <input name="name" value={form.name} onChange={handleChange} placeholder="Name" required />

<select name="role" value={form.role} onChange={handleChange}>
  <option value="Muawin">Muawin</option>
  <option value="Naib Muntazim">Naib Muntazim</option>
  <option value="Muntazim">Muntazim</option>
  <option value="NMA">NMA</option>
  <option value="SI" disabled={existingRoles["SI"]}>SI</option>
  <option value="MA" disabled={existingRoles["MA"]}>MA</option>
  <option value="SM" disabled={existingRoles["SM"]}>SM</option>
</select>

{/* Rollen mit Bereich+Abteilung: Muawin, Naib Muntazim, Muntazim */}
{["Muawin", "Naib Muntazim", "Muntazim"].includes(form.role) && (
  <>
    <select
      name="bereich_id"
      value={form.bereich_id}
      onChange={e => setForm({ ...form, bereich_id: e.target.value, department_id: '' })}
      required
    >
      <option value="">Bereich wählen</option>
      {bereicheNMA
        .filter(b => b.type === "NMA")
        .map(b => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
    </select>
    {form.bereich_id && abteilungen.length > 0 && (
      <select
        name="department_id"
        value={form.department_id}
        onChange={handleChange}
        required
      >
        <option value="">Abteilung wählen</option>
        {abteilungen.map(a => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
    )}
    {form.bereich_id && abteilungen.length === 0 && (
      <div style={{ color: "red" }}>Keine Abteilung im gewählten Bereich vorhanden!</div>
    )}
  </>
)}

{/* Rolle NMA: Nur Bereich */}
{form.role === "NMA" && (
  <select
    name="department_id"
    value={form.department_id}
    onChange={handleChange}
    required
  >
    <option value="">Bereich wählen</option>
    {bereicheNMA
      .filter(b => b.type === "NMA")
      .map(b => (
        <option key={b.id} value={b.id}>{b.name}</option>
      ))}
  </select>
)}

{/* Rollen MA, SI, SM: Kein Dropdown */}
{["MA", "SI", "SM"].includes(form.role) && (
  <></>
)}
        <input name="idNumber" value={form.idNumber} onChange={handleChange} placeholder="ID Nummer" required />
        <input name="majlisName" value={form.majlisName} onChange={handleChange} placeholder="Majlisname" required />
        <button type="submit"style={{ background: "#1976D2", color: "#fff" }}>Mitarbeiter anlegen</button>
      </form>
      {message && <p>{message}</p>}

      <h3>Mitarbeiter-Import (Excel/CSV)</h3>
      <input type="file" accept=".xlsx, .csv" onChange={handleFileUpload} />
      <h3>Komplett-Import Bereiche/Abteilungen/Mitarbeiter (Excel/CSV)</h3>
      <input type="file" accept=".xlsx, .csv" onChange={handleFullImport} />
     {importMsg && importMsg.summary && (
  <div>
    <p>{importMsg.summary}</p>
    {importMsg.failedEntries && importMsg.failedEntries.length > 0 && (
      <div>
        <h4>Fehlgeschlagene Datensätze:</h4>
        <ul>
          {importMsg.failedEntries.map((entry, idx) => (
            <li key={idx}>
              {(entry.row.name || entry.row.Mitarbeitername)}: {entry.reason}
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
)}

{importMsg && <pre>{JSON.stringify(importMsg, null, 2)}</pre>}


      <p style={{fontSize: "small"}}>Die Datei für den klassischen Import muss die Spalten <b>name, role, department_id, idNumber, majlisName</b> enthalten.<br/>
      Die Datei für den Komplett-Import muss die Spalten <b>Bereichsname, Abteilungsname, Mitarbeitername, Rolle, IDNummer, Majlisname, ParentTyp</b> enthalten. <br/>
      <i>Hinweis zu ParentTyp: Bei "SI" muss Bereichsname leer sein. Bei "MA" kann Bereichsname gefüllt oder leer sein.</i></p>
      <button onClick={handleExport}style={{ background: "#1976D2", color: "#fff" }}>Komplett Export MA als Excel</button>
      <button onClick={handleFilteredExport}style={{ background: "#1976D2", color: "#fff" }}>Export Mitarbeiterliste &#8595;</button>
      	
      <h3>Mitarbeiterliste</h3>
      <table className="employee-table" {...getTableProps()}>
  <thead>
  {headerGroups.map(headerGroup => (
    <tr {...headerGroup.getHeaderGroupProps()}>
      {headerGroup.headers.map(column => (
        <th {...column.getHeaderProps(column.getSortByToggleProps())}>
          {column.render('Header')}
          <span>
            {column.isSorted
              ? column.isSortedDesc
                ? ' 🔽'
                : ' 🔼'
              : ''}
          </span>
          {/* Filter nur anzeigen, wenn nicht disableFilters */}
          {!column.disableFilters && column.canFilter ? (
            <div>{column.render('Filter')}</div>
          ) : null}
        </th>
      ))}
    </tr>
  ))}
</thead>
  <tbody {...getTableBodyProps()}>
    {rows.map(row => {
      prepareRow(row);
      return (
        <tr {...row.getRowProps()}>
          {row.cells.map(cell => <td {...cell.getCellProps()}>{cell.render('Cell')}</td>)}
        </tr>
      );
    })}
  </tbody>
</table>
	{selectedIds.length > 0 && (
  <button onClick={deleteSelected}
  style={{ marginLeft: 8, background: "#e53935", color: "#fff" }}
  >Ausgewählte löschen
  </button>
	)}
  {selectedIds.length > 0 && (
  <>
    <button
  onClick={unprintSelected}
  style={{ marginLeft: 8, background: "#1976D2", color: "#fff" }}
  >Als nicht gedruckt markieren
  </button>

   </>
 )}
	    {editMessage && (
  		<p style={{ color: editMessage.startsWith('Fehler') ? 'red' : 'green', marginTop: '1em' }}>
    		{editMessage}
  		</p>
	    )}
            {editMitarbeiter && (
        <div style={{ marginBottom: "2em" }} ref={editRef}>
          <h3>Mitarbeiter bearbeiten</h3>
          <form onSubmit={handleEditSubmit}>
            <input name="name" value={editForm.name} onChange={handleEditChange} placeholder="Name" required />
            <select name="role" value={editForm.role} onChange={handleEditChange}>
              <option value="Muawin">Muawin</option>
              <option value="Naib Muntazim">Naib Muntazim</option>
              <option value="Muntazim">Muntazim</option>
              <option value="NMA">NMA</option>
              <option value="SI" disabled={existingRolesEdit["SI"]}>SI</option>
              <option value="MA" disabled={existingRolesEdit["MA"]}>MA</option>
              <option value="SM" disabled={existingRolesEdit["SM"]}>SM</option>
            </select>

            {/* Rollen mit Bereich+Abteilung: Muawin, Naib Muntazim, Muntazim */}
            {["Muawin", "Naib Muntazim", "Muntazim"].includes(editForm.role) && (
              <>
                <select
                  name="bereich_id"
                  value={editForm.bereich_id}
                  onChange={e => setEditForm({ ...editForm, bereich_id: e.target.value, department_id: '' })}
                  required
                >
                  <option value="">Bereich wählen</option>
                  {bereicheNMA
                    .filter(b => b.type === "NMA")
                    .map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>
                {editForm.bereich_id && abteilungen.length > 0 && (
                  <select
                    name="department_id"
                    value={editForm.department_id}
                    onChange={handleEditChange}
                    required
                  >
                    <option value="">Abteilung wählen</option>
                    {abteilungen.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                )}
                {editForm.bereich_id && abteilungen.length === 0 && (
                  <div style={{ color: "red" }}>Keine Abteilung im gewählten Bereich vorhanden!</div>
                )}
              </>
            )}

            {/* Rolle NMA: Nur Bereich */}
            {editForm.role === "NMA" && (
              <select
                name="department_id"
                value={editForm.department_id}
                onChange={handleEditChange}
                required
              >
                <option value="">Bereich wählen</option>
                {bereicheNMA
                  .filter(b => b.type === "NMA")
                  .map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
              </select>
            )}

            {/* Rollen MA, SI, SM: Kein Dropdown */}
            {["MA", "SI", "SM"].includes(editForm.role) && (
              <></>
            )}

            <input name="idNumber" value={editForm.idNumber} onChange={handleEditChange} placeholder="ID Nummer" required />
            <input name="majlisName" value={editForm.majlisName} onChange={handleEditChange} placeholder="Majlisname" required />
	    
            <button type="submit"style={{ background: "#1976D2", color: "#fff" }}>Speichern</button>
            <button type="button" onClick={() => { setEditMitarbeiter(null); setEditMessage(''); }}style={{ background: "#FF9800", color: "#fff" }}>	  	    Abbrechen</button>
          </form>
        </div>
      )}

    </div>
  );
};

export default EmployeeAdmin;