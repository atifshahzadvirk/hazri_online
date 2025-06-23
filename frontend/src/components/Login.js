//frontend/src/components/Login.js

import React, { useState } from 'react';

const Login = ({ setIsLoggedIn, setUserRole }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
            const data = await response.json();
            // Token und Rolle jetzt im sessionStorage speichern
            sessionStorage.setItem('token', data.token);
            sessionStorage.setItem('role', data.role);
            // department_id aus Token extrahieren und speichern (für Muntazim)
            try {
                const payload = JSON.parse(atob(data.token.split('.')[1]));
                if (payload.department_id) {
                    sessionStorage.setItem('department_id', payload.department_id);
                }
            } catch {}
            if (setUserRole) setUserRole(data.role);
            setIsLoggedIn(true);
            // [NEU] Nach Login Seite neu laden, damit alle Komponenten den neuen Token nutzen
            window.location.reload();
        } else {
            setError('Login fehlgeschlagen');
        }
    };

    return (
        <form onSubmit={handleLogin}>
            <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
            />
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
            />
            <button type="submit"style={{ background: "#4CAF50", color: "#fff" }}>Login</button>
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </form>
    );
};

export default Login;