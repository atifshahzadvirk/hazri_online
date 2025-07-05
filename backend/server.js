// backend/server.js

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fileUpload = require('express-fileupload'); // Datei-Upload Middleware
const authRoutes = require('./routes/auth');
const employeesRoutes = require('./routes/employees'); // NEU: Employees-Routen einbinden
const departmentsRoutes = require('./routes/departments'); // NEU


const app = express();

// --- Logging für alle Requests ---
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- Health-Endpoints ---
app.get('/health', (req, res) => {
  res.send('OK');
});
app.head('/health', (req, res) => {
  res.sendStatus(200);
});

app.use(cors());
app.use(bodyParser.json());
// Datei-Upload Middleware aktivieren - ("Entferne die globale Registrierung von express-fileupload:") 

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeesRoutes); // NEU: Employees-Routen aktivieren
app.use('/api/departments', departmentsRoutes); // NEU

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// --- Self-Ping, um das Backend wach zu halten ---
// Nur aktivieren, wenn ENABLE_SELF_PING in der .env auf "true" steht!
if (process.env.ENABLE_SELF_PING === 'true') {
  setInterval(() => {
    fetch('https://hazri-online.onrender.com/health').catch(() => {});
  }, 13 * 60 * 1000); // alle 13 Minuten
}


// Globales Error-Logging für Express
app.use((err, req, res, next) => {
  console.error('Globaler Fehler:', err);
  res.status(500).send('Interner Serverfehler');
});