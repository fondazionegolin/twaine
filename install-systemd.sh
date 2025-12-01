#!/bin/bash
#
# Script di installazione per i servizi systemd di twAIne
# Uso: sudo ./install-systemd.sh
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="twaine"
USER="ale"
GROUP="ale"

# Service files
BACKEND_SERVICE="$SCRIPT_DIR/twaine-backend.service"
FRONTEND_SERVICE="$SCRIPT_DIR/twaine-frontend.service"
MAIN_SERVICE="$SCRIPT_DIR/twaine.service"

# Install paths
SYSTEMD_DIR="/etc/systemd/system"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  twAIne Systemd Service Installer${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}ERROR: Questo script deve essere eseguito come root${NC}"
    echo -e "${YELLOW}Usa: sudo $0${NC}"
    exit 1
fi

# Check if service files exist
if [ ! -f "$BACKEND_SERVICE" ] || [ ! -f "$FRONTEND_SERVICE" ] || [ ! -f "$MAIN_SERVICE" ]; then
    echo -e "${RED}ERROR: File .service non trovati${NC}"
    echo -e "${YELLOW}Assicurati di essere nella directory corretta del progetto${NC}"
    exit 1
fi

# Check if services are already running
if systemctl is-active --quiet twaine-backend.service || systemctl is-active --quiet twaine-frontend.service; then
    echo -e "${YELLOW}Servizi già in esecuzione. Li fermo...${NC}"
    systemctl stop twaine-frontend.service 2>/dev/null || true
    systemctl stop twaine-backend.service 2>/dev/null || true
fi

echo -e "${GREEN}[1/6]${NC} Copiando file .service in $SYSTEMD_DIR..."
cp "$BACKEND_SERVICE" "$SYSTEMD_DIR/"
cp "$FRONTEND_SERVICE" "$SYSTEMD_DIR/"
cp "$MAIN_SERVICE" "$SYSTEMD_DIR/"
chmod 644 "$SYSTEMD_DIR/twaine-backend.service"
chmod 644 "$SYSTEMD_DIR/twaine-frontend.service"
chmod 644 "$SYSTEMD_DIR/twaine.service"
echo -e "      ${GREEN}✓${NC} Completato"

echo -e "${GREEN}[2/6]${NC} Verificando dipendenze del progetto..."
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
    echo -e "      ${YELLOW}→${NC} Installando dipendenze root..."
    cd "$SCRIPT_DIR"
    su -c "npm install" "$USER"
fi
if [ ! -d "$SCRIPT_DIR/server/node_modules" ]; then
    echo -e "      ${YELLOW}→${NC} Installando dipendenze server..."
    cd "$SCRIPT_DIR/server"
    su -c "npm install" "$USER"
fi
echo -e "      ${GREEN}✓${NC} Completato"

echo -e "${GREEN}[3/6]${NC} Verificando file .env.local..."
if [ ! -f "$SCRIPT_DIR/.env.local" ]; then
    echo -e "      ${YELLOW}⚠${NC} File .env.local non trovato!"
    echo -e "      ${YELLOW}→${NC} Assicurati di configurare le variabili d'ambiente prima di avviare i servizi"
else
    echo -e "      ${GREEN}✓${NC} File .env.local trovato"
fi

echo -e "${GREEN}[4/6]${NC} Ricaricando systemd daemon..."
systemctl daemon-reload
echo -e "      ${GREEN}✓${NC} Completato"

echo -e "${GREEN}[5/6]${NC} Abilitando servizi per avvio automatico..."
systemctl enable twaine-backend.service
systemctl enable twaine-frontend.service
systemctl enable twaine.service
echo -e "      ${GREEN}✓${NC} Completato"

echo -e "${GREEN}[6/6]${NC} Avviando servizi..."
systemctl start twaine.service

# Wait a moment for services to start
sleep 3

echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}✓ Installazione completata con successo!${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo -e "${YELLOW}Comandi disponibili:${NC}"
echo -e "  ${GREEN}Gestione completa:${NC}"
echo -e "    sudo systemctl start twaine          - Avvia tutti i servizi"
echo -e "    sudo systemctl stop twaine           - Ferma tutti i servizi"
echo -e "    sudo systemctl restart twaine        - Riavvia tutti i servizi"
echo -e "    sudo systemctl status twaine         - Stato del servizio principale"
echo ""
echo -e "  ${GREEN}Gestione backend:${NC}"
echo -e "    sudo systemctl start twaine-backend"
echo -e "    sudo systemctl stop twaine-backend"
echo -e "    sudo systemctl restart twaine-backend"
echo -e "    sudo systemctl status twaine-backend"
echo ""
echo -e "  ${GREEN}Gestione frontend:${NC}"
echo -e "    sudo systemctl start twaine-frontend"
echo -e "    sudo systemctl stop twaine-frontend"
echo -e "    sudo systemctl restart twaine-frontend"
echo -e "    sudo systemctl status twaine-frontend"
echo ""
echo -e "${YELLOW}Log dei servizi:${NC}"
echo -e "  sudo journalctl -u twaine-backend -f    - Log backend in tempo reale"
echo -e "  sudo journalctl -u twaine-frontend -f   - Log frontend in tempo reale"
echo -e "  sudo journalctl -u twaine-backend -n 50 - Ultimi 50 log backend"
echo ""
echo -e "${YELLOW}Altre operazioni:${NC}"
echo -e "  sudo systemctl disable twaine           - Disabilita avvio automatico"
echo -e "  sudo systemctl enable twaine            - Abilita avvio automatico"
echo ""

# Show current status
echo -e "${BLUE}Stato attuale dei servizi:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
systemctl status twaine-backend.service --no-pager -l || true
echo ""
systemctl status twaine-frontend.service --no-pager -l || true

exit 0
