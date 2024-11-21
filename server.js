const express = require('express');
const session = require('express-session');
const { Pool } = require('pg');
const authRoutes = require('./routes/auth');
require('dotenv').config();

const app = express();

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('views'));

// Session setup
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
}));

// Add `pool` to `req` in all routes
app.use((req, res, next) => {
    req.pool = pool;
    next();
});

// Use routes
app.use('/auth', authRoutes);


// Default route
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/register.html');
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
