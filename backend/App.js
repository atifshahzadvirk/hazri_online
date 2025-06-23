// backend/app.js
const express = require('express');
const app = express();

const authRouter = require('./routes/auth');
const employeesRouter = require('./routes/employees');

app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/employees', employeesRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));