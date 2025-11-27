#!/bin/bash

# twAIne Service Installer Script
# This script installs the twAIne init.d service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: This script must be run as root${NC}"
    echo "Please run: sudo $0"
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="$(dirname "$SCRIPT_DIR")"
SERVICE_SCRIPT="$SCRIPT_DIR/twaine-service"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   twAIne Service Installer             ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo ""

# Check if service script exists
if [ ! -f "$SERVICE_SCRIPT" ]; then
    echo -e "${RED}Error: Service script not found at $SERVICE_SCRIPT${NC}"
    exit 1
fi

echo -e "${YELLOW}[1/6]${NC} Checking prerequisites..."

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Node.js found: $(node --version)"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} npm found: $(npm --version)"

echo ""
echo -e "${YELLOW}[2/6]${NC} Installing dependencies..."

# Install frontend dependencies
cd "$APP_DIR"
if [ ! -d "node_modules" ]; then
    echo "  Installing frontend dependencies..."
    sudo -u ale npm install
else
    echo -e "  ${GREEN}✓${NC} Frontend dependencies already installed"
fi

# Install backend dependencies
cd "$APP_DIR/server"
if [ ! -d "node_modules" ]; then
    echo "  Installing backend dependencies..."
    sudo -u ale npm install
else
    echo -e "  ${GREEN}✓${NC} Backend dependencies already installed"
fi

echo ""
echo -e "${YELLOW}[3/6]${NC} Building application..."

# Build backend
cd "$APP_DIR/server"
echo "  Building backend..."
sudo -u ale npm run build

echo ""
echo -e "${YELLOW}[4/6]${NC} Creating log directory..."
mkdir -p /var/log/twaine
chown -R ale:ale /var/log/twaine
echo -e "  ${GREEN}✓${NC} Log directory created at /var/log/twaine"

echo ""
echo -e "${YELLOW}[5/6]${NC} Installing service..."

# Copy service script to init.d
cp "$SERVICE_SCRIPT" /etc/init.d/twaine
chmod +x /etc/init.d/twaine
echo -e "  ${GREEN}✓${NC} Service script installed to /etc/init.d/twaine"

# Update rc.d to enable service on boot
if command -v update-rc.d &> /dev/null; then
    update-rc.d twaine defaults
    echo -e "  ${GREEN}✓${NC} Service enabled on boot (using update-rc.d)"
elif command -v chkconfig &> /dev/null; then
    chkconfig --add twaine
    chkconfig twaine on
    echo -e "  ${GREEN}✓${NC} Service enabled on boot (using chkconfig)"
else
    echo -e "  ${YELLOW}⚠${NC} Could not enable service on boot automatically"
    echo "    Please enable manually for your init system"
fi

echo ""
echo -e "${YELLOW}[6/6]${NC} Checking environment configuration..."

# Check for .env.local
if [ -f "$APP_DIR/.env.local" ]; then
    echo -e "  ${GREEN}✓${NC} Frontend environment file found"
else
    echo -e "  ${YELLOW}⚠${NC} Frontend .env.local not found"
    echo "    Please create $APP_DIR/.env.local with your API keys"
fi

# Check for server .env
if [ -f "$APP_DIR/server/.env" ]; then
    echo -e "  ${GREEN}✓${NC} Backend environment file found"
else
    echo -e "  ${YELLOW}⚠${NC} Backend .env not found"
    echo "    Please create $APP_DIR/server/.env if needed"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Installation Complete!               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo "You can now manage the twAIne service with:"
echo ""
echo -e "  ${BLUE}sudo service twaine start${NC}      - Start the service"
echo -e "  ${BLUE}sudo service twaine stop${NC}       - Stop the service"
echo -e "  ${BLUE}sudo service twaine restart${NC}    - Restart the service"
echo -e "  ${BLUE}sudo service twaine status${NC}     - Check service status"
echo -e "  ${BLUE}sudo service twaine logs backend${NC}  - View backend logs"
echo -e "  ${BLUE}sudo service twaine logs frontend${NC} - View frontend logs"
echo ""
echo "To start the service now, run:"
echo -e "  ${GREEN}sudo service twaine start${NC}"
echo ""
