FROM node:18-alpine

# Imposta la directory di lavoro
WORKDIR /app

# Copia i file package.json e package-lock.json (se presenti)
COPY package*.json ./

# Installa le dipendenze
RUN npm install

# Copia il resto del codice sorgente
COPY . .

# Espone la porta (deve corrispondere a quella usata dall'app)
EXPOSE 3000

# Avvia l'applicazione
CMD ["node", "app.js"]