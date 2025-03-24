// app.js
require('dotenv').config();


const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const hbs = require('hbs');
const axios = require('axios');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const DBMock = require('./db/DBmock.js');

const app = express();
const db = new DBMock();

// Crea il server HTTP e integra Socket.io
const server = http.createServer(app);
const io = new Server(server);
let connectedUsers = 0;

// Middleware per il body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware per la sessione
app.use(session({
  secret: 'ssshhhhh', // Cambiala con una chiave sicura in produzione
  resave: false,
  saveUninitialized: true,
}));

// Configurazione HBS
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));

app.use('/static', express.static(path.join(__dirname, 'public')));

// Middleware per controllo admin
function isAdmin(req, res, next) {
  if (req.session.loggedin && req.session.role === 'admin') {
    return next();
  } else {
    return res.render('error', { message: 'Accesso non autorizzato' });
  }
}

// Middleware per controllo user
function isUser(req, res, next) {
  if (req.session.loggedin && req.session.role === 'user') {
    return next();
  } else {
    return res.render('error', { message: 'Accesso non autorizzato' });
  }
}

hbs.registerHelper('neq', function (a, b) {
  return a !== b;
});

// Rotta principale
app.get('/', (req, res) => {
  if (req.session.loggedin) {
    // Se loggato, vai a home
    res.redirect('/home');
  } else {
    // Se non loggato, mostra landing page informativa
    res.render('landing');
  }
});

// Rotta GET per login
app.get('/login', (req, res) => {
  if (req.session.loggedin) {
    res.redirect('/home');
  } else {
    // Carichiamo la login page statica
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }
});

// Rotta POST per login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.getUserByUsername(username);
  if (user && user.password === password) {
    req.session.loggedin = true;
    req.session.name = user.nome;
    req.session.role = user.ruolo;
    req.session.userId = user.id;
    res.redirect('/home');
  } else {
    res.render('error', { message: 'Username e/o password errati!' });
  }
});

// Rotta GET per registrazione
app.get('/register', (req, res) => {
  if (req.session.loggedin) {
    return res.redirect('/home');
  }
  res.render('register');
});

// Rotta POST per registrazione
app.post('/register', (req, res) => {
  if (req.session.loggedin) {
    return res.redirect('/home');
  }
  const { nome, username, password } = req.body;

  // Verifica se username è già in uso
  const existingUser = db.getUserByUsername(username);
  if (existingUser) {
    return res.render('register', { message: 'Username già in uso, scegline un altro.' });
  }

  // Crea nuovo utente con ruolo user
  const newUser = db.createUser({ username, nome, ruolo: 'user', password });

  // Dopo la registrazione, logga automaticamente l'utente
  req.session.loggedin = true;
  req.session.name = newUser.nome;
  req.session.role = newUser.ruolo;
  req.session.userId = newUser.id;

  res.redirect('/home');
});

// Rotta logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.render('error', { message: 'Errore durante il logout.' });
    }
    res.redirect('/login');
  });
});

// Rotta home
app.get('/home', (req, res) => {
  if (req.session.loggedin) {
    if (req.session.role === 'admin') {
      res.render('admin/home', {
        name: req.session.name,
        role: req.session.role,
        message: req.session.message || ''
      });
    } else {
      // Passiamo userId per le notifiche in tempo reale
      res.render('user/home', {
        name: req.session.name,
        role: req.session.role,
        message: 'Bentornato, ' + req.session.name + '!',
        userId: req.session.userId
      });
    }
  } else {
    res.redirect('/login');
  }
});

// Rotta error
app.get('/error', (req, res) => {
  res.render('error', { message: 'Si è verificato un errore!' });
});

// Rotte admin
app.get('/admin/users', isAdmin, (req, res) => {
  const allUsers = db.getAllUsers();
  res.render('admin/users', { users: allUsers });
});

app.post('/admin/users/delete', isAdmin, (req, res) => {
  const userId = parseInt(req.body.userId);
  const result = db.deleteUser(userId);
  if (result) {
    // Notifica a tutti che è stato eliminato un utente
    io.emit('admin_notification', "Un utente è stato eliminato dall'admin.");
    res.redirect('/admin/users');
  } else {
    res.render('error', { message: 'Impossibile eliminare utente: non trovato.' });
  }
});

// Rotte user/passwords
app.get('/user/passwords', isUser, (req, res) => {
  const userId = req.session.userId;
  const userPasswords = db.getUserPasswords(userId);
  res.render('user/passwords', { passwords: userPasswords });
});

app.get('/user/passwords/add', isUser, (req, res) => {
  res.render('user/addPassword');
});

app.post('/user/passwords/add', isUser, (req, res) => {
  const userId = req.session.userId;
  const { nomeSito, userSito, passSito } = req.body;
  db.addPassword(userId, nomeSito, userSito, passSito);

  // Notifica solo a questo utente
  io.to(userId.toString()).emit('user_notification', `Hai aggiunto una nuova password per il sito ${nomeSito}.`);
  
  res.redirect('/user/passwords');
});

app.get('/user/passwords/edit/:id', isUser, (req, res) => {
  const userId = req.session.userId;
  const id = parseInt(req.params.id);
  const pwd = db.getPasswordByIdAndUser(id, userId);
  if (!pwd) {
    return res.render('error', { message: 'Password non trovata o accesso non autorizzato' });
  }
  res.render('user/editPassword', { password: pwd });
});

app.post('/user/passwords/edit/:id', isUser, (req, res) => {
  const userId = req.session.userId;
  const id = parseInt(req.params.id);
  const { nomeSito, userSito, passSito } = req.body;
  const updated = db.updatePassword(id, userId, { nomeSito, userSito, passSito });
  if (!updated) {
    return res.render('error', { message: 'Password non trovata o accesso non autorizzato' });
  }

  // Notifica all'utente della modifica (opzionale)
  io.to(userId.toString()).emit('user_notification', `Hai modificato la password per il sito ${nomeSito}.`);

  res.redirect('/user/passwords');
});

app.post('/user/passwords/delete', isUser, (req, res) => {
  const userId = req.session.userId;
  const id = parseInt(req.body.id);
  const result = db.deletePassword(id, userId);
  if (!result) {
    return res.render('error', { message: 'Password non trovata o accesso non autorizzato' });
  }

  // Notifica all'utente della cancellazione (opzionale)
  io.to(userId.toString()).emit('user_notification', "Hai eliminato una delle tue password.");

  res.redirect('/user/passwords');
});

// Filtro password via AJAX
app.get('/user/passwords/filter', isUser, (req, res) => {
  const userId = req.session.userId;
  const search = (req.query.search || '').toLowerCase();
  const userPasswords = db.getUserPasswords(userId);
  const filtered = userPasswords.filter(p => p.nomeSito.toLowerCase().includes(search));
  res.json({ passwords: filtered });
});

// API generazione password sicura
app.get('/api/generate-password', async (req, res) => {
  try {
    const apiUrl = 'https://api.api-ninjas.com/v1/passwordgenerator?length=16';
    const apiKey = '9/ul4PP9kls7pl+H9gO4Sw==7G4Mrv0z54Qe9Gok'; // La tua chiave API
    const response = await axios.get(apiUrl, {
      headers: {
        'X-Api-Key': apiKey
      }
    });

    if (response.status !== 200) {
      console.error('API Ninjas response not OK:', response.statusText);
      return res.status(500).json({ error: 'Errore nel recupero della password dall\'API esterna' });
    }

    const password = response.data.password || response.data.random_password || null;
    console.log('Password generata:', password);
    if (!password) {
      console.error('Password non trovata nella risposta API:', response.data);
      return res.status(500).json({ error: 'Password non trovata nella risposta API' });
    }

    res.json({ password: password });
  } catch (err) {
    console.error('Errore nella chiamata API Ninjas:', err.response ? err.response.data : err.message);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Swagger UI
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = JSON.parse(fs.readFileSync(path.join(__dirname, 'swagger.json'), 'utf-8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Gestione connessioni socket
io.on('connection', (socket) => {
  connectedUsers++;
  console.log(`Un utente si è connesso. Utenti connessi: ${connectedUsers}`);

  // Avvisa tutti i client (broadcast) che il numero di utenti connessi è cambiato
  io.emit('update_user_count', connectedUsers);

  // Se vuoi mantenere la logica di "join_user_room" per le notifiche personalizzate:
  socket.on('join_user_room', (userId) => {
    socket.join(userId.toString());
    // Puoi fare altre logiche di notifica qui
  });

  // Quando il client si disconnette
  socket.on('disconnect', () => {
    connectedUsers--;
    console.log(`Un utente si è disconnesso. Utenti connessi: ${connectedUsers}`);
    // Avvisa tutti i client del nuovo conteggio
    io.emit('update_user_count', connectedUsers);
  });
});

// Avvio del server
const port = 3000;
server.listen(port, () => {
  console.log(`Server avviato sulla porta ${port}`);
});


