#!/bin/bash
#
# Script di disinstallazione per i servizi systemd di twAIne
# Uso: sudo ./uninstall-systemd.sh
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="twaine"
SYSTEMD_DIR="/etc/systemd/system"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  twAIne Systemd Service Uninstaller${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}ERROR: Questo script deve essere eseguito come root${NC}"
    echo -e "${YELLOW}Usa: sudo $0${NC}"
    exit 1
fi

# Check if services are installed
if [ ! -f "$SYSTEMD_DIR/twaine-backend.service" ] && [ ! -f "$SYSTEMD_DIR/twaine-frontend.service" ]; then
    echo -e "${YELLOW}I servizi twAIne non sembrano essere installati${NC}"
    exit 0
fi

# Confirm uninstall
echo -e "${YELLOW}Questa operazione rimuoverà i servizi systemd di twAIne${NC}"
echo -e "${YELLOW}I file del progetto e le build NON verranno rimossi${NC}"
echo ""
read -p "Continuare? (s/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
    echo -e "${BLUE}Operazione annullata${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}[1/5]${NC} Fermando servizi..."
systemctl stop twaine.service 2>/dev/null || true
systemctl stop twaine-frontend.service 2>/dev/null || true
systemctl stop twaine-backend.service 2>/dev/null || true
echo -e "      ${GREEN}✓${NC} Completato"

echo -e "${GREEN}[2/5]${NC} Disabilitando avvio automatico..."
systemctl disable twaine.service 2>/dev/null || true
systemctl disable twaine-frontend.service 2>/dev/null || true
systemctl disable twaine-backend.service 2>/dev/null || true
echo -e "      ${GREEN}✓${NC} Completato"

echo -e "${GREEN}[3/5]${NC} Rimuovendo file .service..."
rm -f "$SYSTEMD_DIR/twaine.service"
rm -f "$SYSTEMD_DIR/twaine-backend.service"
rm -f "$SYSTEMD_DIR/twaine-frontend.service"
echo -e "      ${GREEN}✓${NC} Completato"

echo -e "${GREEN}[4/5]${NC} Ricaricando systemd daemon..."
systemctl daemon-reload
echo -e "      ${GREEN}✓${NC} Completato"

echo -e "${GREEN}[5/5]${NC} Resettando servizi falliti..."
systemctl reset-failed 2>/dev/null || true
echo -e "      ${GREEN}✓${NC} Completato"

echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}✓ Disinstallazione completata!${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo -e "${YELLOW}Note:${NC}"
echo -e "  - I file del progetto sono ancora in /home/ale/GIT/twaine"
echo -e "  - Le build (dist/) sono ancora presenti"
echo -e "  - Il file .env.local è ancora presente"
echo ""
echo -e "${YELLOW}Per reinstallare i servizi:${NC}"
echo -e "  sudo ./install-systemd.sh"
echo ""

exit 0
