// frontend/src/App.js

import './App.css';

import React, { useState } from 'react';
import EmployeeForm from './components/EmployeeForm';
import Login from './components/Login';
import LogoutButton from './components/LogoutButton';
import UserAdmin from './components/UserAdmin';
import UserAreaInfo from './components/UserAreaInfo';
import EmployeeAdmin from './components/EmployeeAdmin';
import NMAView from './components/NMAView';
import MuntazimView from './components/MuntazimView';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!sessionStorage.getItem('token'));
  const [userRole, setUserRole] = useState(sessionStorage.getItem('role') || '');

  return (
    <div className="App">

      <div className="three-d-title">Hazri Nigrani Data Entry – Salana Ijtema 2025 MAD</div>
      {isLoggedIn && <LogoutButton setIsLoggedIn={setIsLoggedIn} setUserRole={setUserRole} />}
      {/* [NEU] UserAreaInfo ganz oben anzeigen */}
      {isLoggedIn && <UserAreaInfo />}
      {/* Admin-Ansicht */}
      {isLoggedIn && userRole === 'admin' && <UserAdmin />}
      {isLoggedIn && (userRole === 'admin' || userRole === 'MA-HN') && <EmployeeAdmin />}
      {isLoggedIn && userRole === 'NMA(read-only)' && <NMAView />}
      {isLoggedIn && userRole === 'muntazim' && <MuntazimView />}
      {isLoggedIn && !['admin', 'MA-HN', 'NMA(read-only)', 'muntazim'].includes(userRole) && (
   <EmployeeForm userRole={userRole} />
 )}

      {!isLoggedIn && <Login setIsLoggedIn={setIsLoggedIn} setUserRole={setUserRole} />}
    </div>
  );
}

export default App;