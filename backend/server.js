const express = require('express');
const cors = require('cors');
const path = require('path');
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: path.join(__dirname, '.env.local') });
}

const app = express();

// Middleware
app.use(express.json({ limit: '2mb' })); // la entrevista envía transcripción + CV en JSON
app.use(cors());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/optimize', require('./routes/optimize'));
app.use('/api/interview', require('./routes/interview'));
// app.use('/api/usage', require('./routes/usage'));
// app.use('/api/payments', require('./routes/payments'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
