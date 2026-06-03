require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const sleepRoutes = require('./routes/sleep');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect DB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', sleepRoutes);

// Health check
app.get('/', (req, res) => res.json({ status: 'SleepAI Pro API Running ✅', version: '2.0.0' }));

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🌙 SleepAI Pro Backend running on http://localhost:${PORT}`);
  console.log(`📊 API ready at http://localhost:${PORT}/api`);
});
