#!/bin/bash

# Script per avviare il tunnel Cloudflare per TWAINE
# Assicurati di aver eseguito setup-tunnel.sh prima di usare questo script

echo "🚀 Avvio Tunnel Cloudflare per TWAINE"
echo "======================================"
echo ""
echo "🌐 Dominio: twaine.golinelli.ai"
echo "🔌 Porta locale: 3000"
echo ""
echo "⚠️  Assicurati che il server di sviluppo sia in esecuzione sulla porta 3000"
echo "   (usa: npm run dev)"
echo ""

# Avvia il tunnel
cloudflared tunnel --config cloudflare-tunnel.yml run twaine-tunnel
