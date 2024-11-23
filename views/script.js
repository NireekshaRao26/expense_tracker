// DOM Elements
const expenseForm = document.getElementById('expenseForm');
const expensesList = document.getElementById('expensesList');
const monthlySummary = document.getElementById('monthlySummary');
const categorySummary = document.getElementById('categorySummary');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const closeBtn = document.querySelector('.close');

// API Base URL
const API_URL = '/expenses';

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadExpenses();
    loadMonthlySummary();
    loadCategorySummary();
    setDefaultDate();
});

expenseForm.addEventListener('submit', handleAddExpense);
editForm.addEventListener('submit', handleEditExpense);
closeBtn.addEventListener('click', () => editModal.style.display = 'none');

// Helper Functions
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

function formatAmount(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}

function validateExpenseData(data) {
    // Check amount is a valid number with up to 2 decimal places and greater than 0
    if (!data.amount || isNaN(data.amount) || data.amount <= 0 || !/^\d+(\.\d{1,2})?$/.test(data.amount)) {
        throw new Error('Please enter a valid amount with up to 2 decimal places');
    }

    // Check category is a non-empty string within 50 characters
    if (!data.category || data.category.trim() === '' || data.category.length > 50) {
        throw new Error('Please select a valid category');
    }

    // Check date is valid or set it to today's date if not provided
    if (data.date && isNaN(new Date(data.date).getTime())) {
        throw new Error('Please enter a valid date');
    }
    data.date = data.date || new Date().toISOString().split('T')[0]; // Defaults to today's date if not provided

    return true;
}


// API Calls
async function fetchApi(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            credentials: 'include'
        });
        
        if (response.status === 401) {
            alert('Please log in to continue');
            return;
        }

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'An error occurred');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        alert(error.message || 'An error occurred. Please try again.');
        throw error;
    }
}

// Event Handlers
async function handleAddExpense(e) {
    e.preventDefault();
    
    try {
        const formData = {
            amount: Number(document.getElementById('amount').value),
            category: document.getElementById('category').value.trim(),
            date: document.getElementById('date').value
        };

        // Validate form data
        validateExpenseData(formData);

        const response = await fetchApi('/', {
            method: 'POST',
            body: JSON.stringify(formData)
        });


        expenseForm.reset();
        setDefaultDate();
        await new Promise(resolve => setTimeout(resolve, 100));
        await refreshData();
        alert('Expense added successfully!');
    } catch (error) {
        alert(error.message || 'Failed to add expense');
    }
}

async function handleEditExpense(e) {
    e.preventDefault();
    
    try {
        const expenseId = document.getElementById('editId').value;
        const formData = {
            amount: Number(document.getElementById('editAmount').value),
            category: document.getElementById('editCategory').value,
            date: document.getElementById('editDate').value
        };

        // Validate form data
        validateExpenseData(formData);

        await fetchApi(`/${expenseId}`, {
            method: 'PUT',
            body: JSON.stringify(formData)
        });

        editModal.style.display = 'none';
        await new Promise(resolve => setTimeout(resolve, 100));
        await refreshData();
        alert('Expense updated successfully!');
    } catch (error) {
        alert(error.message || 'Failed to update expense');
    }
}

// Load Data Functions
async function loadExpenses() {
    try {
        const expenses = await fetchApi('/');
        renderExpenses(expenses);
    } catch (error) {
        expensesList.innerHTML = '<tr><td colspan="4">Failed to load expenses</td></tr>';
    }
}

async function loadMonthlySummary() {
    try {
        const summary = await fetchApi('/monthly-summary');
        renderMonthlySummary(summary);
    } catch (error) {
        monthlySummary.innerHTML = 'Failed to load monthly summary';
    }
}

async function loadCategorySummary() {
    try {
        const summary = await fetchApi('/category-summary');
        console.log("Fetched category summary:", summary);

        // Validate data
        if (!summary || !Array.isArray(summary)) {
            throw new Error('Invalid data format');
        }

        renderCategorySummary(summary);

        try {
            const chartCanvas = document.getElementById('categoryPieChart');
            if (chartCanvas) {
                renderPieChart(summary);
            }
        } catch (chartError) {
            console.error('Error rendering pie chart:', chartError);
        }

    } catch (error) {
        console.error('Category summary error:', error);
        categorySummary.innerHTML = 'Failed to load category summary';
    }
}
// Render Functions
function renderExpenses(expenses) {
    if (!expenses || !expenses.length) {
        expensesList.innerHTML = '<tr><td colspan="4">No expenses found</td></tr>';
        return;
    }

    expensesList.innerHTML = expenses.map(expense => `
        <tr>
            <td>${formatDate(expense.date)}</td>
            <td>${expense.category}</td>
            <td>${formatAmount(expense.amount)}</td>
            <td class="action-buttons">
                <button onclick="openEditModal(${JSON.stringify(expense).replace(/"/g, '&quot;')})" 
                        class="edit-btn">Edit</button>
                <button onclick="deleteExpense(${expense.id})" 
                        class="delete-btn">Delete</button>
            </td>
        </tr>
    `).join('');
}

function renderMonthlySummary(summary) {
    if (!summary || !summary.length) {
        monthlySummary.innerHTML = 'No monthly data available';
        return;
    }

    monthlySummary.innerHTML = summary.map(month => `
        <div>
            <strong>${month.month}:</strong> 
            ${formatAmount(month.total)} 
            (${month.count} expenses)
        </div>
    `).join('');
}

function renderCategorySummary(summary) {
    if (!summary || !summary.length) {
        categorySummary.innerHTML = 'No category data available';
        return;
    }

    categorySummary.innerHTML = summary.map(category => `
        <div>
            <strong>${category.category}:</strong> 
            ${formatAmount(category.total)} 
            (${category.count} expenses)
        </div>
    `).join('');
}

let categoryChart = null;

function renderPieChart(data) {
    const ctx = document.getElementById('categoryPieChart').getContext('2d');

    if (categoryChart) {
        categoryChart.destroy();
    }

    const chartData = {
        labels: data.map(item => item.category),
        datasets: [{
            data: data.map(item => item.total),
            backgroundColor: data.map(() => getRandomColor()),
            borderColor: data.map(() => '#fff'),
            borderWidth: 1
        }]
    };

    categoryChart = new Chart(ctx, {
        type: 'pie',
        data: chartData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(tooltipItem) {
                            const value = formatAmount(tooltipItem.raw);
                            return `${tooltipItem.label}: ${value}`;
                        }
                    }
                }
            }
        }
    });
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

async function deleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
        try {
            await fetchApi(`/${id}`, { method: 'DELETE' });
            
            await refreshData();
            alert('Expense deleted successfully!');
        } catch (error) {
            alert(error.message || 'Failed to delete expense');
        }
    }
}

function openEditModal(expense) {
    document.getElementById('editId').value = expense.id;
    document.getElementById('editAmount').value = expense.amount;
    document.getElementById('editCategory').value = expense.category;
    document.getElementById('editDate').value = expense.date.split('T')[0];
    editModal.style.display = 'block';
}

async function refreshData() {
    try {
        await Promise.all([
            loadExpenses().catch(err => console.error('Failed to load expenses:', err)),
            loadMonthlySummary().catch(err => console.error('Failed to load monthly summary:', err)),
            loadCategorySummary().catch(err => console.error('Failed to load category summary:', err))
        ]);
    } catch (error) {
        console.error('Error refreshing data:', error);
    }
}