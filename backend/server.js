const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(cors({
    origin: 'http://127.0.0.1:5500', // Origine consentita per il frontend
    methods: ['GET', 'POST'], // Metodi consentiti
}));

// Connetti al database SQLite
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Errore durante la connessione al database:', err.message);
    } else {
        console.log('Connesso al database SQLite.');
    }
});

// Creazione tabelle se non esistono
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT NOT NULL
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS passwords (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            website TEXT NOT NULL,
            username TEXT NOT NULL,
            password TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);
});

// Endpoint Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Errore del server.' });
        }
        if (!row) {
            return res.status(401).json({ error: 'Credenziali non valide.' });
        }
        res.status(200).json({ message: 'Login effettuato!', user: row });
    });
});

// Endpoint Registrazione
app.post('/register', (req, res) => {
    const { username, password, email } = req.body;
    const stmt = db.prepare('INSERT INTO users (username, password, email) VALUES (?, ?, ?)');
    stmt.run([username, password, email], function (err) {
        if (err) {
            if (err.code === 'SQLITE_CONSTRAINT') {
                return res.status(409).json({ error: 'Username già esistente.' });
            }
            return res.status(500).json({ error: 'Errore durante la registrazione.' });
        }
        res.status(201).json({ message: 'Utente registrato con successo!', userId: this.lastID });
    });
    stmt.finalize();
});

// Recupera le password salvate
app.get('/get-passwords/:userId', (req, res) => {
    const { userId } = req.params;
    db.all('SELECT * FROM passwords WHERE user_id = ?', [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Errore durante il recupero delle password.' });
        }
        res.status(200).json(rows);
    });
});

// Aggiungi una password
app.post('/add-password', (req, res) => {
    const { userId, website, username, password } = req.body;
    const stmt = db.prepare('INSERT INTO passwords (user_id, website, username, password) VALUES (?, ?, ?, ?)');
    stmt.run([userId, website, username, password], function (err) {
        if (err) {
            return res.status(500).json({ error: 'Errore durante il salvataggio della password.' });
        }
        res.status(201).json({ message: 'Password salvata con successo!' });
    });
    stmt.finalize();
});

// Avvia il server
app.listen(PORT, () => {
    console.log(`Server in esecuzione su http://localhost:${PORT}`);
});

// Endpoint per eliminare una password
app.delete('/delete-password/:id', (req, res) => {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM passwords WHERE id = ?');
    stmt.run(id, function (err) {
        if (err) {
            return res.status(500).json({ error: 'Errore durante l\'eliminazione della password.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Password non trovata.' });
        }
        res.status(200).json({ message: 'Password eliminata con successo!' });
    });
    stmt.finalize();
});
