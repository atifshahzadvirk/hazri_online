// backend/server.js

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fileUpload = require('express-fileupload'); // Datei-Upload Middleware
const authRoutes = require('./routes/auth');
const employeesRoutes = require('./routes/employees'); // NEU: Employees-Routen einbinden
const departmentsRoutes = require('./routes/departments'); // NEU
const connection = require('./db');

const app = express();
app.use(cors());
app.use(bodyParser.json());
// Datei-Upload Middleware aktivieren - ("Entferne die globale Registrierung von express-fileupload:") 

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeesRoutes); // NEU: Employees-Routen aktivieren
app.use('/api/departments', departmentsRoutes); // NEU

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
