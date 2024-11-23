const express = require('express');
const router = express.Router();

// Middleware to check if user is logged in
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    }
    res.status(401).json({ error: 'Not authenticated' });
}

// Get all expenses for the authenticated user
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const expenses = await req.pool.query(
            `SELECT id, amount, category, date 
             FROM expenses 
             WHERE user_id = $1 
             ORDER BY date DESC`,
            [userId]
        );
        res.json(expenses.rows);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get monthly summary
router.get('/monthly-summary', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const summary = await req.pool.query(
            `SELECT 
                TO_CHAR(date, 'Mon YYYY') as month,
                SUM(amount) as total,
                COUNT(*) as count
             FROM expenses 
             WHERE user_id = $1 
             GROUP BY TO_CHAR(date, 'Mon YYYY')
             ORDER BY MIN(date) DESC
             LIMIT 12`,
            [userId]
        );
        res.json(summary.rows);
    } catch (error) {
        console.error('Error fetching monthly summary:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get category summary
router.get('/category-summary', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const summary = await req.pool.query(
            `SELECT 
                category,
                SUM(amount) as total,
                COUNT(*) as count
             FROM expenses 
             WHERE user_id = $1 
                AND date >= CURRENT_DATE - INTERVAL '30 days'
             GROUP BY category
             ORDER BY total DESC`,
            [userId]
        );
        res.json(summary.rows);
    } catch (error) {
        console.error('Error fetching category summary:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add expense
router.post('/', isAuthenticated, async (req, res) => {
    try {
        const { amount, category, date } = req.body;
        const userId = req.session.userId;
        if (!amount || !category || isNaN(amount)) {
            return res.status(400).json({ error: 'Invalid input' });
        }

        const result = await req.pool.query(
            `INSERT INTO expenses (user_id, amount, category, date) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, amount, category, date`,
            [userId, amount, category, date || new Date()]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding expense:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update expense
router.put('/:id', isAuthenticated, async (req, res) => {
    try {
        const { amount, category, date } = req.body;
        const expenseId = req.params.id;
        const userId = req.session.userId;

        if (!amount || !category || isNaN(amount)) {
            return res.status(400).json({ error: 'Invalid input' });
        }

        const result = await req.pool.query(
            `UPDATE expenses 
             SET amount = $1, category = $2, date = $3
             WHERE id = $4 AND user_id = $5 
             RETURNING id, amount, category, date`,
            [amount, category, date, expenseId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating expense:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete expense
router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const expenseId = req.params.id;
        const userId = req.session.userId;

        const result = await req.pool.query(
            'DELETE FROM expenses WHERE id = $1 AND user_id = $2 RETURNING id',
            [expenseId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;