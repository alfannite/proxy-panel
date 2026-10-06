#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting ProxyPanel Pre-flight Checks...${NC}"

# Define required ports
REQUIRED_PORTS=(80 443 8080 3000)
CONFLICT=false

# Function to check if a port is in use
check_port() {
    local port=$1
    # We use ss or netstat to check if the port is in use. We redirect stderr to /dev/null to avoid noise.
    if command -v ss > /dev/null; then
        if ss -tuln | grep -q ":$port "; then
            return 0 # Port is in use
        fi
    elif command -v netstat > /dev/null; then
        if netstat -tuln | grep -q ":$port "; then
            return 0 # Port is in use
        fi
    else
        # If neither ss nor netstat is available, try lsof
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            return 0 # Port is in use
        fi
    fi
    return 1 # Port is free
}

echo "Checking required ports..."

for port in "${REQUIRED_PORTS[@]}"; do
    if check_port "$port"; then
        echo -e "${RED}[ERROR] Port $port is already in use by another service on your system.${NC}"
        CONFLICT=true
    else
        echo -e "${GREEN}[OK] Port $port is free.${NC}"
    fi
done

if [ "$CONFLICT" = true ]; then
    echo -e "\n${RED}========================================================================${NC}"
    echo -e "${RED}STARTUP ABORTED!${NC}"
    echo -e "${YELLOW}One or more required ports are currently in use by another application.${NC}"
    echo -e "${YELLOW}ProxyPanel requires ports 80 (HTTP), 443 (HTTPS), 8080 (Traefik UI),${NC}"
    echo -e "${YELLOW}3000 (Panel) to be entirely free.${NC}"
    echo -e "${YELLOW}Please stop the conflicting services (e.g., Apache, Nginx) and try again.${NC}"
    echo -e "${RED}========================================================================${NC}\n"
    exit 1
fi

echo -e "${GREEN}All ports are free! Proceeding with Docker Compose...${NC}\n"

# Run docker-compose
if docker compose version > /dev/null 2>&1; then
    docker compose up --build -d
else
    # Fallback for older docker-compose v1
    docker-compose up --build -d
fi

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}========================================================================${NC}"
    echo -e "${GREEN}SUCCESS! ProxyPanel is now running in the background.${NC}"
    echo -e "${GREEN}Access your panel at: http://<your-server-ip>:3000${NC}"
    echo -e "${GREEN}========================================================================${NC}\n"
else
    echo -e "\n${RED}[ERROR] Docker Compose failed to start the containers. Please check the logs above.${NC}\n"
    exit 1
fi
