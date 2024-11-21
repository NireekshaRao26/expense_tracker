// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

// Register Route
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await req.pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);
        res.redirect('/login.html');
    } catch (error) {
        console.error('Error in registration:', error);
        res.status(500).send('An error occurred during registration');
    }
});

// Login Route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await req.pool.query('SELECT * FROM users WHERE username = $1', [username]);

        if (user.rows.length > 0 && await bcrypt.compare(password, user.rows[0].password)) {
            req.session.userId = user.rows[0].id;
            res.redirect('/expenses.html');
        } else {
            res.status(401).send('Invalid credentials');
        }
    } catch (error) {
        console.error('Error in login:', error);
        res.status(500).send('An error occurred during login');
    }
});


router.post('/logout', (req, res) => {
    try {
        req.session.destroy(err => {
            if (err) {
                console.error('Error in logging out:', err);
                return res.status(500).send('An error occurred during logout');
            }
            res.redirect('/login.html'); 
        });
    } catch (error) {
        console.error('Error in logout:', error);
        res.status(500).send('An error occurred during logout');
    }
});


module.exports = router;
