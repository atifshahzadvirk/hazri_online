import React from 'react';


const LogoutButton = ({ setIsLoggedIn, setUserRole }) => {
  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.clear();
    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          caches.delete(cacheName);
        });
      });
    }
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
    });
    if (setIsLoggedIn) setIsLoggedIn(false);
    if (setUserRole) setUserRole('');
    window.location.reload();
  };

  return (
  <button onClick={handleLogout}style={{ background: "#FF9800", color: "#fff" }}>
    Logout
  </button>
);
};

export default LogoutButton;
