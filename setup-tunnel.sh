#!/bin/bash

# Script per configurare il tunnel Cloudflare per TWAINE
# Dominio: twaine.golinelli.ai
# Porta locale: 3000

echo "🚀 Configurazione Tunnel Cloudflare per TWAINE"
echo "=============================================="
echo ""

# Step 1: Login a Cloudflare (se non già fatto)
echo "📝 Step 1: Verifica autenticazione Cloudflare..."
if [ ! -f ~/.cloudflared/cert.pem ]; then
    echo "⚠️  Non sei autenticato. Esegui il login:"
    echo "   cloudflared login"
    echo ""
    echo "Questo aprirà il browser per autorizzare cloudflared."
    exit 1
else
    echo "✅ Autenticazione già presente"
fi

# Step 2: Crea il tunnel (se non esiste)
echo ""
echo "🔧 Step 2: Creazione tunnel 'twaine-tunnel'..."
if cloudflared tunnel list | grep -q "twaine-tunnel"; then
    echo "✅ Tunnel 'twaine-tunnel' già esistente"
else
    cloudflared tunnel create twaine-tunnel
    echo "✅ Tunnel 'twaine-tunnel' creato"
fi

# Step 3: Ottieni l'ID del tunnel
TUNNEL_ID=$(cloudflared tunnel list | grep "twaine-tunnel" | awk '{print $1}')
echo ""
echo "📋 Tunnel ID: $TUNNEL_ID"

# Step 4: Configura il DNS
echo ""
echo "🌐 Step 3: Configurazione DNS..."
echo "Esegui questo comando per configurare il DNS:"
echo ""
echo "  cloudflared tunnel route dns twaine-tunnel twaine.golinelli.ai"
echo ""
read -p "Vuoi eseguirlo ora? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cloudflared tunnel route dns twaine-tunnel twaine.golinelli.ai
    echo "✅ DNS configurato"
else
    echo "⚠️  Ricordati di configurare il DNS manualmente!"
fi

# Step 5: Istruzioni finali
echo ""
echo "✅ Configurazione completata!"
echo ""
echo "📌 Per avviare il tunnel, usa uno di questi comandi:"
echo ""
echo "   Opzione 1 - Con file di configurazione:"
echo "   cloudflared tunnel --config cloudflare-tunnel.yml run twaine-tunnel"
echo ""
echo "   Opzione 2 - Comando diretto:"
echo "   cloudflared tunnel run twaine-tunnel"
echo ""
echo "   Opzione 3 - Usa lo script start-tunnel.sh:"
echo "   ./start-tunnel.sh"
echo ""
echo "🎯 Il tuo sito sarà accessibile su: https://twaine.golinelli.ai"
echo ""
