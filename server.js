const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const cors = require('cors');

const app = express();
app.use(express.json())
app.use(cors());
const PORT = process.env.PORT || 3000;





const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'root', 
    password: '', 
    database: 'colleges_db'
});

app.use(bodyParser.json());


function authenticateUser(req, res, next) {
    const { token } = req.headers;
    if (!token) {
        res.status(401).json({ error: 'Unauthorized: No token provided' });
        return;
    }
    const { role } = token;
    req.role = role;
    next();
}

function authorizeUser(role) {
    return (req, res, next) => {
        if (req.role !== role) {
            res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
            return;
        }
        next();
    };
}

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});


app.get('/students', authenticateUser, (req, res) => {
    const { role } = req;
    const { collegeId, section } = req.query;

    if (role === 'super_admin') {
       
        pool.query('SELECT * FROM students', (err, results) => {
            if (err) {
                console.error('Error fetching students:', err);
                res.status(500).json({ error: 'Error fetching students' });
                return;
            }
            res.json(results);
        });
    } else if (role === 'admin') {
        if (!collegeId) {
            res.status(400).json({ error: 'College ID is required for admin role' });
            return;
        }
        pool.query('SELECT * FROM students WHERE college_id = ?', [collegeId], (err, results) => {
            if (err) {
                console.error('Error fetching students:', err);
                res.status(500).json({ error: 'Error fetching students' });
                return;
            }
            res.json(results);
        });
    } else if (role === 'teacher') {
        if (!section) {
            res.status(400).json({ error: 'Section is required for teacher role' });
            return;
        }
        pool.query('SELECT * FROM students WHERE section = ?', [section], (err, results) => {
            if (err) {
                console.error('Error fetching students:', err);
                res.status(500).json({ error: 'Error fetching students' });
                return;
            }
            res.json(results);
        });
    } else if (role === 'student') {
        const { studentId } = req.query;
        if (!studentId) {
            res.status(400).json({ error: 'Student ID is required for student role' });
            return;
        }
        pool.query('SELECT * FROM students WHERE id = ?', [studentId], (err, results) => {
            if (err) {
                console.error('Error fetching student:', err);
                res.status(500).json({ error: 'Error fetching student' });
                return;
            }
            res.json(results);
        });
    } else {
        res.status(400).json({ error: 'Invalid role' });
    }
});


app.post('/students', authenticateUser, authorizeUser('super_admin'), (req, res) => {
    const { name, section, college_id } = req.body;
    pool.query('INSERT INTO students (name, section, college_id) VALUES (?, ?, ?)', [name, section, college_id], (err, result) => {
        if (err) {
            console.error('Error creating student:', err);
            res.status(500).json({ error: 'Error creating student' });
            return;
        }
        res.status(201).json({ message: 'Student created successfully' });
    });
});

app.put('/students/:id', authenticateUser, authorizeUser('super_admin'), (req, res) => {
    const studentId = req.params.id;
    const { name, section, college_id } = req.body;
    pool.query('UPDATE students SET name = ?, section = ?, college_id = ? WHERE id = ?', [name, section, college_id, studentId], (err, result) => {
        if (err) {
            console.error('Error updating student:', err);
            res.status(500).json({ error: 'Error updating student' });
            return;
        }
        res.json({ message: 'Student updated successfully' });
    });
});


app.delete('/students/:id', authenticateUser, authorizeUser('super_admin'), (req, res) => {
    const studentId = req.params.id;
    pool.query('DELETE FROM students WHERE id = ?', [studentId], (err, result) => {
        if (err) {
            console.error('Error deleting student:', err);
            res.status(500).json({ error: 'Error deleting student' });
            return;
        }
        res.json({ message: 'Student deleted successfully' });
    });
});

