// db/DBMock.js
class DBMock {
    constructor() {
      this.users = [
        {
          id: 1,
          username: 'admin',
          nome: 'Amministratore',
          ruolo: 'admin',
          password: 'adminpass'
        },
        {
          id: 2,
          username: 'user1',
          nome: 'Utente Uno',
          ruolo: 'user',
          password: 'userpass'
        }
      ];
      this.passwords = [
        // Password example
        {
          id: 1,
          userId: 2,
          nomeSito: 'Example Site',
          userSito: 'exampleuser',
          passSito: 'password123'
        }
      ];
      this.nextId = 3;
    }
  
    getUserByUsername(username) {
      return this.users.find(user => user.username === username);
    }
  
    createUser({ username, nome, ruolo, password }) {
      if (!username || !nome || !ruolo || !password) {
        throw new Error('Tutti i campi sono obbligatori: username, nome, ruolo, password');
      }
      const newUser = {
        id: this.nextId++,
        username,
        nome,
        ruolo,
        password,
      };
      this.users.push(newUser);
      return newUser;
    }
  
    getAllUsers() {
      // Restituisce tutti gli utenti senza le password
      return this.users.map(({ id, username, nome, ruolo }) => ({ id, username, nome, ruolo }));
    }
  
    deleteUser(userId) {
      const index = this.users.findIndex(user => user.id === userId);
      if (index !== -1) {
        this.users.splice(index, 1);
        return true;
      }
      return false;
    }
  
    getUserPasswords(userId) {
      return this.passwords.filter(pwd => pwd.userId === userId);
    }
  
    addPassword(userId, nomeSito, userSito, passSito) {
      const newPassword = {
        id: this.nextId++,
        userId,
        nomeSito,
        userSito,
        passSito
      };
      this.passwords.push(newPassword);
      return newPassword;
    }
  
    getPasswordByIdAndUser(id, userId) {
      return this.passwords.find(pwd => pwd.id === id && pwd.userId === userId);
    }
  
    updatePassword(id, userId, { nomeSito, userSito, passSito }) {
      const pwd = this.getPasswordByIdAndUser(id, userId);
      if (pwd) {
        pwd.nomeSito = nomeSito;
        pwd.userSito = userSito;
        pwd.passSito = passSito;
        return true;
      }
      return false;
    }
  
    deletePassword(id, userId) {
      const index = this.passwords.findIndex(pwd => pwd.id === id && pwd.userId === userId);
      if (index !== -1) {
        this.passwords.splice(index, 1);
        return true;
      }
      return false;
    }
  }
  
  module.exports = DBMock;
  