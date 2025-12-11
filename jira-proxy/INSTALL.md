# Jira Proxy Installation Guide

This proxy server runs on localhost:6904 and forwards Jira API requests to bypass CORS restrictions.

## Installation Steps

### 1. Install Dependencies

From the `jira-proxy` directory:

```bash
cd /home/arm/jira-proxy
npm install
```

### 2. Test the Server Manually (Optional)

```bash
npm start
```

You should see:
```
🚀 Jira CORS Proxy Server running on http://127.0.0.1:6904
📝 Privacy: No data is collected or stored
🔒 All requests are forwarded directly to Jira
```

Test it's working:
```bash
curl http://127.0.0.1:6904
```

Press Ctrl+C to stop.

### 3. Install as Systemd Service

Copy the service file to systemd:

```bash
sudo cp /home/arm/jira-proxy/jira-proxy.service /etc/systemd/system/jira-proxy.service
```

Ensure www-data user has access to the directory:

```bash
sudo chown -R www-data:www-data /home/arm/jira-proxy
```

Reload systemd and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable jira-proxy
sudo systemctl start jira-proxy
```

### 4. Check Service Status

```bash
sudo systemctl status jira-proxy
```

You should see "active (running)" in green.

View logs:
```bash
sudo journalctl -u jira-proxy -f
```

## Management Commands

```bash
# Start service
sudo systemctl start jira-proxy

# Stop service
sudo systemctl stop jira-proxy

# Restart service
sudo systemctl restart jira-proxy

# View status
sudo systemctl status jira-proxy

# View logs (live)
sudo journalctl -u jira-proxy -f

# View recent logs
sudo journalctl -u jira-proxy -n 50

# Disable auto-start on boot
sudo systemctl disable jira-proxy

# Enable auto-start on boot
sudo systemctl enable jira-proxy
```

## Troubleshooting

### Service won't start

Check logs:
```bash
sudo journalctl -u jira-proxy -n 100
```

Common issues:
1. Node.js not installed or wrong path
2. Dependencies not installed (`npm install`)
3. Port 6904 already in use
4. Permission issues

### Check if port is in use

```bash
sudo lsof -i :6904
```

### Verify Node.js path

```bash
which node
```

If it's not `/usr/bin/node`, update the `ExecStart` line in the service file.

### Permission issues

Ensure www-data owns the files:
```bash
sudo chown -R www-data:www-data /home/arm/jira-proxy
```

## Security Notes

- The proxy only listens on localhost (127.0.0.1), not accessible from outside
- No data is logged, collected, or stored
- All requests are forwarded directly to Jira
- Runs with limited privileges (www-data user)
- Uses systemd security features (NoNewPrivileges, PrivateTmp, etc.)

## Updating the Proxy

After making changes to `server.js`:

```bash
sudo systemctl restart jira-proxy
sudo journalctl -u jira-proxy -f
```
