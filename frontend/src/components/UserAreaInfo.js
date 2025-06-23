// frontend/src/components/UserAreaInfo.js

import React, { useEffect, useState } from 'react';

const UserAreaInfo = () => {
  const [username, setUsername] = useState('');
  const [bereich, setBereich] = useState('');
  const [abteilung, setAbteilung] = useState('');

  useEffect(() => {
    // Username aus Token holen
    const token = sessionStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUsername(payload.username || '');
        // Bereich/Abteilung aus Session oder API holen
        // Hier als Beispiel: Annahme, dass Bereich/Abteilung im SessionStorage liegen könnten
        setBereich(sessionStorage.getItem('bereich') || '');
        setAbteilung(sessionStorage.getItem('abteilung') || '');
      } catch {
        setUsername('');
      }
    }
  }, []);

  return (
    <div style={{ marginBottom: 10 }}>
      <strong>Eingeloggt als:</strong> {username ? username : 'Unbekannt'}
      {bereich && <div><strong>Bereich:</strong> {bereich}</div>}
      {abteilung && <div><strong>Abteilung:</strong> {abteilung}</div>}
    </div>
  );
};

export default UserAreaInfo;