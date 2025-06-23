//frontend/src/components/NMAView.js

import React, { useEffect, useMemo, useState } from 'react';
import { useTable, useSortBy, useFilters } from 'react-table';
import './NMAView.css';

const NMAView = () => {
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [error, setError] = useState('');

  // Bereichsname für die Überschrift extrahieren
  const bereichsName = mitarbeiter.length > 0 ? mitarbeiter[0].bereichsName : '';

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    fetch('http://localhost:5000/api/employees/bereichs-mitarbeiter', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Fehler beim Laden');
        }
        return res.json();
      })
      .then(data => {
        // Flache Liste aller Mitarbeiter, Abteilungsname in jedes Objekt
        const flat = [];
        Object.entries(data).forEach(([abteilung, arr]) => {
          arr.forEach(m => flat.push({ ...m, abteilungsName: abteilung }));
        });
        setMitarbeiter(flat);
      })
      .catch(err => setError(err.message));
  }, []);

  const columns = useMemo(() => [
    { Header: 'Abteilung', accessor: 'abteilungsName', Filter: DefaultColumnFilter },
    { Header: 'Name', accessor: 'name', disableFilters: true, disableSortBy: true },
    { Header: 'ID Nr.', accessor: 'idNumber', disableFilters: true, disableSortBy: true },
    { Header: 'Majlis', accessor: 'majlisName', disableFilters: true, disableSortBy: true },
    { Header: 'B Name', accessor: 'B_Name', Filter: DefaultColumnFilter },
    { Header: 'B Majlis', accessor: 'B_Majlis', Filter: DefaultColumnFilter },

    
    { Header: 'Rolle', accessor: 'role', Filter: DefaultColumnFilter },

    	//"{ Header: 'Bereich', accessor: 'bereichsName', Filter: DefaultColumnFilter },"// entfernt

    { Header: 'Erstellt am', accessor: 'created_at', 
      Cell: ({ value }) => value ? new Date(value).toLocaleString() : '', Filter: DefaultColumnFilter },

    	//"{ Header: 'Erstellt von', accessor: 'created_by', Filter: DefaultColumnFilter },"// entfernt

  ], []);

  const {
    getTableProps, getTableBodyProps, headerGroups, rows, prepareRow,
  } = useTable(
    { columns, data: mitarbeiter, initialState: { sortBy: [{ id: 'abteilungsName', asc: true }] } },
    useFilters,
    useSortBy
  );

  return (
    <fieldset className="nma-table-fieldset">
      <legend>Mitarbeiter aller Abteilungen Ihres Bereichs {bereichsName && `: ${bereichsName}`}</legend>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <table {...getTableProps()} className="nma-table">
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
                  <div>{column.canFilter ? column.render('Filter') : null}</div>
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
      {rows.length === 0 && !error && <p>Keine Mitarbeiter gefunden.</p>}
    </fieldset>
  );
};

// Einfacher Textfilter für jede Spalte
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

export default NMAView;