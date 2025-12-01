#!/bin/bash

# Script per aggiornare la configurazione Cloudflare con TWAINE

echo "🔧 Aggiornamento Configurazione Cloudflare per TWAINE"
echo "====================================================="
echo ""

CONFIG_FILE="/etc/cloudflared/config.yml"
BACKUP_FILE="/etc/cloudflared/config.yml.backup.$(date +%Y%m%d_%H%M%S)"

# Verifica se il file di configurazione esiste
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ File di configurazione non trovato: $CONFIG_FILE"
    exit 1
fi

# Backup della configurazione attuale
echo "📦 Creazione backup della configurazione attuale..."
sudo cp "$CONFIG_FILE" "$BACKUP_FILE"
echo "✅ Backup creato: $BACKUP_FILE"
echo ""

# Copia la nuova configurazione
echo "📝 Aggiornamento configurazione..."
sudo cp cloudflare-config-update.yml "$CONFIG_FILE"
echo "✅ Configurazione aggiornata"
echo ""

# Configura il DNS per twaine.golinelli.ai
echo "🌐 Configurazione DNS per twaine.golinelli.ai..."
echo ""
echo "Esegui questo comando per configurare il DNS:"
echo ""
echo "  cloudflared tunnel route dns da5e18b5-7dba-447b-b0ef-c00da100b52a twaine.golinelli.ai"
echo ""
read -p "Vuoi eseguirlo ora? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cloudflared tunnel route dns da5e18b5-7dba-447b-b0ef-c00da100b52a twaine.golinelli.ai
    echo "✅ DNS configurato"
else
    echo "⚠️  Ricordati di configurare il DNS manualmente!"
fi

echo ""
echo "🔄 Riavvio del servizio cloudflared..."
echo ""
echo "Esegui uno di questi comandi per riavviare il tunnel:"
echo ""
echo "  Se usi systemd:"
echo "  sudo systemctl restart cloudflared"
echo ""
echo "  Se usi il tunnel manualmente:"
echo "  Ferma il processo corrente (Ctrl+C) e riavvialo"
echo ""
read -p "Vuoi riavviare il servizio ora? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo systemctl restart cloudflared
    echo "✅ Servizio riavviato"
    echo ""
    echo "Verifica lo stato con:"
    echo "  sudo systemctl status cloudflared"
else
    echo "⚠️  Ricordati di riavviare il servizio manualmente!"
fi

echo ""
echo "✅ Configurazione completata!"
echo ""
echo "📌 Prossimi passi:"
echo "   1. Avvia il server TWAINE: npm run dev"
echo "   2. Verifica che sia in esecuzione su http://localhost:3000"
echo "   3. Accedi a https://twaine.golinelli.ai"
echo ""
