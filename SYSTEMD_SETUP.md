# twAIne Systemd Service Setup

Questa guida spiega come installare e utilizzare i servizi systemd per gestire twAIne (frontend e backend).

## File Creati

- `twaine-backend.service` - Servizio systemd per il backend
- `twaine-frontend.service` - Servizio systemd per il frontend
- `twaine.service` - Servizio principale che gestisce entrambi
- `install-systemd.sh` - Script di installazione automatica
- `uninstall-systemd.sh` - Script di disinstallazione automatica

## Prerequisiti

- Sistema Linux con systemd (CachyOS, Arch, Ubuntu 16.04+, Debian 8+, etc.)
- Node.js e npm installati
- MongoDB installato e in esecuzione
- File `.env.local` configurato nella root del progetto
- Permessi sudo per l'installazione

## Installazione

### Installazione Automatica (Raccomandato)

```bash
sudo ./install-systemd.sh
```

Lo script installerà automaticamente i servizi e li avvierà.

### Installazione Manuale

Se preferisci installare manualmente:

```bash
# 1. Copia i file .service in /etc/systemd/system/
sudo cp twaine-backend.service /etc/systemd/system/
sudo cp twaine-frontend.service /etc/systemd/system/
sudo cp twaine.service /etc/systemd/system/

# 2. Imposta i permessi corretti
sudo chmod 644 /etc/systemd/system/twaine*.service

# 3. Ricarica systemd
sudo systemctl daemon-reload

# 4. Abilita i servizi per l'avvio automatico
sudo systemctl enable twaine-backend.service
sudo systemctl enable twaine-frontend.service
sudo systemctl enable twaine.service

# 5. Avvia i servizi
sudo systemctl start twaine.service
```

## Utilizzo

### Comandi Principali

**Gestione completa (frontend + backend):**

```bash
# Avviare tutti i servizi
sudo systemctl start twaine

# Fermare tutti i servizi
sudo systemctl stop twaine

# Riavviare tutti i servizi
sudo systemctl restart twaine

# Stato dei servizi
sudo systemctl status twaine
```

### Gestione Individuale

**Backend:**

```bash
sudo systemctl start twaine-backend
sudo systemctl stop twaine-backend
sudo systemctl restart twaine-backend
sudo systemctl status twaine-backend
```

**Frontend:**

```bash
sudo systemctl start twaine-frontend
sudo systemctl stop twaine-frontend
sudo systemctl restart twaine-frontend
sudo systemctl status twaine-frontend
```

### Avvio Automatico

```bash
# Abilitare avvio automatico al boot
sudo systemctl enable twaine

# Disabilitare avvio automatico
sudo systemctl disable twaine

# Verificare se è abilitato
sudo systemctl is-enabled twaine
```

## Monitoraggio e Log

### Visualizzare i Log

```bash
# Log backend in tempo reale
sudo journalctl -u twaine-backend -f

# Log frontend in tempo reale
sudo journalctl -u twaine-frontend -f

# Ultimi 50 log del backend
sudo journalctl -u twaine-backend -n 50

# Ultimi 50 log del frontend
sudo journalctl -u twaine-frontend -n 50

# Log di oggi
sudo journalctl -u twaine-backend --since today

# Log dell'ultima ora
sudo journalctl -u twaine-backend --since "1 hour ago"
```

### Filtrare i Log per Priorità

```bash
# Solo errori
sudo journalctl -u twaine-backend -p err

# Warning e superiori
sudo journalctl -u twaine-backend -p warning
```

### Stato Dettagliato

```bash
# Stato completo con log recenti
sudo systemctl status twaine-backend -l --no-pager

# Verificare se un servizio è attivo
sudo systemctl is-active twaine-backend

# Verificare se un servizio ha fallito
sudo systemctl is-failed twaine-backend
```

## Caratteristiche dei Servizi

### Backend (twaine-backend.service)

- **WorkingDirectory**: `/home/ale/GIT/twaine/server`
- **Comando**: `node dist/index.js`
- **Dipendenze**: network, mongodb
- **Build automatico**: Esegue `npm run build` prima dell'avvio
- **Restart**: Automatico dopo 10 secondi in caso di crash
- **Log**: journald con identificatore `twaine-backend`

### Frontend (twaine-frontend.service)

- **WorkingDirectory**: `/home/ale/GIT/twaine`
- **Comando**: `npm run preview` (modalità produzione Vite)
- **Dipendenze**: network, twaine-backend
- **Build automatico**: Esegue `npm run build` prima dell'avvio
- **Restart**: Automatico dopo 10 secondi in caso di crash
- **Log**: journald con identificatore `twaine-frontend`

### Sicurezza

Entrambi i servizi includono misure di sicurezza:
- `NoNewPrivileges=true` - Previene escalation privilegi
- `PrivateTmp=true` - Directory /tmp isolata
- `ProtectSystem=strict` - Filesystem di sistema read-only
- `ProtectHome=read-only` - Home directory read-only (eccetto WorkingDirectory)

## Troubleshooting

### Il servizio non si avvia

```bash
# 1. Controlla lo stato dettagliato
sudo systemctl status twaine-backend -l

# 2. Verifica i log per errori
sudo journalctl -u twaine-backend -n 50

# 3. Verifica che MongoDB sia in esecuzione
sudo systemctl status mongodb

# 4. Verifica che il file .env.local esista
ls -la /home/ale/GIT/twaine/.env.local

# 5. Verifica le dipendenze npm
cd /home/ale/GIT/twaine/server
npm install
```

### Il servizio si riavvia continuamente

```bash
# Verifica i log per vedere l'errore
sudo journalctl -u twaine-backend -f

# Ferma il servizio per debug
sudo systemctl stop twaine-backend

# Prova ad avviare manualmente
cd /home/ale/GIT/twaine/server
node dist/index.js
```

### Modificare la configurazione dei servizi

Se modifichi i file `.service`:

```bash
# 1. Ricarica systemd dopo le modifiche
sudo systemctl daemon-reload

# 2. Riavvia il servizio
sudo systemctl restart twaine-backend
```

### Reset di un servizio fallito

```bash
# Reset dello stato failed
sudo systemctl reset-failed twaine-backend

# Prova a riavviare
sudo systemctl start twaine-backend
```

### Problemi di permessi

```bash
# Verifica i permessi della directory di lavoro
ls -la /home/ale/GIT/twaine/

# Verifica l'ownership
stat /home/ale/GIT/twaine/server/dist/index.js

# Correggi se necessario (come utente ale)
cd /home/ale/GIT/twaine
npm run build
cd server
npm run build
```

## Disinstallazione

### Disinstallazione Automatica (Raccomandato)

```bash
sudo ./uninstall-systemd.sh
```

### Disinstallazione Manuale

```bash
# 1. Ferma i servizi
sudo systemctl stop twaine.service

# 2. Disabilita avvio automatico
sudo systemctl disable twaine-backend.service
sudo systemctl disable twaine-frontend.service
sudo systemctl disable twaine.service

# 3. Rimuovi i file .service
sudo rm /etc/systemd/system/twaine*.service

# 4. Ricarica systemd
sudo systemctl daemon-reload

# 5. Reset servizi falliti
sudo systemctl reset-failed
```

## Comandi Utili

```bash
# Lista di tutti i servizi twaine
systemctl list-units "twaine*"

# Verificare tutte le dipendenze
systemctl list-dependencies twaine.service

# Tempo di avvio del servizio
systemd-analyze blame | grep twaine

# Mostrare la configurazione effettiva del servizio
systemctl cat twaine-backend.service

# Modificare un servizio (apre editor)
sudo systemctl edit twaine-backend.service
```

## Note Importanti

- I servizi usano `journald` per i log (non file separati come init.d)
- I log vengono ruotati automaticamente da systemd
- Le variabili d'ambiente vengono caricate da `.env.local`
- Il frontend viene servito in modalità preview (produzione Vite)
- Entrambi i servizi si riavviano automaticamente in caso di crash
- MongoDB deve essere installato e configurato separatamente

## Differenze rispetto a init.d

### Vantaggi di systemd:

1. **Log centralizzati**: `journalctl` invece di file log separati
2. **Gestione dipendenze**: Systemd gestisce automaticamente l'ordine di avvio
3. **Restart automatico**: Configurazione nativa per il restart
4. **Sicurezza**: Più opzioni di sandboxing e isolamento
5. **Monitoraggio**: Migliori strumenti di monitoring integrati
6. **Performance**: Avvio parallelo dei servizi indipendenti
7. **Standard moderno**: Supportato da tutte le distribuzioni Linux recenti

### Comandi equivalenti:

| init.d | systemd |
|--------|---------|
| `service twaine start` | `systemctl start twaine` |
| `service twaine stop` | `systemctl stop twaine` |
| `service twaine restart` | `systemctl restart twaine` |
| `service twaine status` | `systemctl status twaine` |
| `tail -f /var/log/twaine/backend.log` | `journalctl -u twaine-backend -f` |
| `update-rc.d twaine defaults` | `systemctl enable twaine` |

## Configurazione Personalizzata

Per modificare le configurazioni (percorsi, utente, etc.):

1. Modifica i file `.service` nel progetto
2. Reinstalla con `sudo ./install-systemd.sh`

Oppure:

1. Modifica direttamente i file in `/etc/systemd/system/`
2. Esegui `sudo systemctl daemon-reload`
3. Riavvia i servizi

## Supporto

Per problemi o domande, controlla:
- I log con `journalctl`
- Lo stato dei servizi con `systemctl status`
- La documentazione systemd: `man systemd.service`
