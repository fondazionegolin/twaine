# twAIne Init.d Service

Questo script permette di gestire la piattaforma twAIne come un servizio di sistema usando init.d.

## Caratteristiche

- ✅ Avvio automatico all'avvio del sistema
- ✅ Gestione di frontend e backend
- ✅ Logging separato per ogni componente
- ✅ Comandi semplici per gestire il servizio
- ✅ Controllo dello stato dei servizi

## Installazione

### Prerequisiti

- Node.js e npm installati
- Accesso root (sudo)
- File di configurazione `.env.local` con le API keys

### Installazione Automatica

Esegui lo script di installazione:

```bash
sudo ./scripts/install-service.sh
```

Lo script eseguirà automaticamente:
1. Verifica dei prerequisiti (Node.js, npm)
2. Installazione delle dipendenze
3. Build dell'applicazione
4. Creazione della directory dei log
5. Installazione del servizio in `/etc/init.d/twaine`
6. Abilitazione del servizio all'avvio

### Installazione Manuale

Se preferisci installare manualmente:

```bash
# 1. Installa le dipendenze
npm install
cd server && npm install && cd ..

# 2. Build del backend
cd server && npm run build && cd ..

# 3. Crea la directory dei log
sudo mkdir -p /var/log/twaine
sudo chown -R ale:ale /var/log/twaine

# 4. Copia il servizio
sudo cp scripts/twaine-service /etc/init.d/twaine
sudo chmod +x /etc/init.d/twaine

# 5. Abilita il servizio all'avvio
sudo update-rc.d twaine defaults
# oppure su sistemi con chkconfig:
# sudo chkconfig --add twaine
# sudo chkconfig twaine on
```

## Utilizzo

### Avviare il servizio

```bash
sudo service twaine start
```

### Fermare il servizio

```bash
sudo service twaine stop
```

### Riavviare il servizio

```bash
sudo service twaine restart
```

### Controllare lo stato

```bash
sudo service twaine status
```

Output esempio:
```
twAIne Service Status:
=====================
Backend:  running (PID: 12345)
Frontend: running (PID: 12346)

Log files:
  Backend:  /var/log/twaine/backend.log
  Frontend: /var/log/twaine/frontend.log
```

### Visualizzare i log

Per il backend:
```bash
sudo service twaine logs backend
```

Per il frontend:
```bash
sudo service twaine logs frontend
```

Oppure visualizza direttamente i file di log:
```bash
tail -f /var/log/twaine/backend.log
tail -f /var/log/twaine/frontend.log
```

## Configurazione

### Porte

Il servizio utilizza le porte predefinite configurate nell'applicazione:
- Backend: porta configurata in `server/src/index.ts` (default: 3001)
- Frontend: porta configurata da Vite preview (default: 4173)

### Variabili d'ambiente

Assicurati di avere configurato i file di ambiente:

**Frontend** (`/home/ale/git/twaine/.env.local`):
```
GEMINI_API_KEY=your_gemini_api_key_here
FAL_API_KEY=your_fal_api_key_here
```

**Backend** (`/home/ale/git/twaine/server/.env`):
```
# Aggiungi qui le variabili d'ambiente del backend se necessarie
```

### Personalizzazione

Per modificare la configurazione del servizio, edita `/etc/init.d/twaine`:

```bash
sudo nano /etc/init.d/twaine
```

Variabili configurabili:
- `APP_DIR`: Directory dell'applicazione
- `USER`: Utente con cui eseguire il servizio
- `GROUP`: Gruppo con cui eseguire il servizio
- `LOG_DIR`: Directory dei log

Dopo aver modificato il file, riavvia il servizio:
```bash
sudo service twaine restart
```

## Risoluzione Problemi

### Il servizio non si avvia

1. Controlla i log:
   ```bash
   sudo service twaine logs backend
   sudo service twaine logs frontend
   ```

2. Verifica che le dipendenze siano installate:
   ```bash
   cd /home/ale/git/twaine
   npm install
   cd server && npm install
   ```

3. Verifica che il backend sia stato compilato:
   ```bash
   cd /home/ale/git/twaine/server
   npm run build
   ```

### Permessi negati

Assicurati che l'utente `ale` abbia i permessi corretti:
```bash
sudo chown -R ale:ale /home/ale/git/twaine
sudo chown -R ale:ale /var/log/twaine
```

### Il servizio non si ferma

Se il servizio non risponde al comando stop:
```bash
# Trova i PID
ps aux | grep node

# Termina manualmente i processi
sudo kill -9 <PID>

# Rimuovi i file PID
sudo rm -f /var/run/twaine-*.pid
```

## Disinstallazione

Per rimuovere il servizio:

```bash
# 1. Ferma il servizio
sudo service twaine stop

# 2. Disabilita l'avvio automatico
sudo update-rc.d -f twaine remove
# oppure su sistemi con chkconfig:
# sudo chkconfig twaine off
# sudo chkconfig --del twaine

# 3. Rimuovi il servizio
sudo rm /etc/init.d/twaine

# 4. (Opzionale) Rimuovi i log
sudo rm -rf /var/log/twaine
```

## Note

- Il servizio utilizza `npm run preview` per il frontend, che serve la versione di produzione
- I log vengono salvati in `/var/log/twaine/`
- I file PID vengono salvati in `/var/run/`
- Il servizio viene eseguito con l'utente `ale`

## Supporto

Per problemi o domande, consulta i log del servizio o verifica la configurazione dell'applicazione.
