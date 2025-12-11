#!/bin/bash

# Jira Proxy Server Installation Script
# This script installs and starts the Jira CORS proxy as a systemd service

set -e

echo "🚀 Installing Jira Proxy Server..."
echo ""

# Get the absolute path to the jira-proxy directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "📁 Proxy directory: $SCRIPT_DIR"
echo ""

# Install npm dependencies
echo "📦 Installing dependencies..."
cd "$SCRIPT_DIR"
npm install

echo ""
echo "✅ Dependencies installed"
echo ""

# Update the service file with the correct path
echo "📝 Configuring systemd service..."
TEMP_SERVICE="/tmp/jira-proxy-temp.service"
sed "s|/home/arm/jira-proxy|$SCRIPT_DIR|g" "$SCRIPT_DIR/jira-proxy.service" > "$TEMP_SERVICE"

# Copy service file to systemd
echo "🔧 Installing systemd service..."
sudo cp "$TEMP_SERVICE" /etc/systemd/system/jira-proxy.service
rm "$TEMP_SERVICE"

# Set permissions
echo "🔐 Setting permissions..."
sudo chown -R www-data:www-data "$SCRIPT_DIR"

# Reload systemd
echo "🔄 Reloading systemd..."
sudo systemctl daemon-reload

# Enable and start the service
echo "▶️  Starting service..."
sudo systemctl enable jira-proxy
sudo systemctl start jira-proxy

echo ""
echo "✅ Installation complete!"
echo ""
echo "📊 Service status:"
sudo systemctl status jira-proxy --no-pager -l

echo ""
echo "📝 Useful commands:"
echo "  View logs:    sudo journalctl -u jira-proxy -f"
echo "  Stop service: sudo systemctl stop jira-proxy"
echo "  Restart:      sudo systemctl restart jira-proxy"
echo ""
echo "🌐 The proxy is now running at http://localhost:6904"
echo ""
