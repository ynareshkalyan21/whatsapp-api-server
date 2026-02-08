# Deploying WhatsApp API Server (Baileys) on AWS EC2

This guide will walk you through deploying the WhatsApp API server to AWS EC2 and testing it with `curl`.

---

## 1. Prerequisites

- An **AWS account**
- AWS EC2 instance running **Amazon Linux 2** or **Ubuntu 20.04+**
- Installed:
  - **Node.js** (v20+ recommended)
  - **npm**
  - **Git**
- SSH access to your EC2 instance
- `auth_info_baileys/` credentials folder from your local environment (if you want to keep the logged-in session without scanning QR again)

---

## 2. Launch EC2 Instance

1. Go to AWS EC2 Console → **Launch Instance**
2. Choose **Amazon Linux 2** or **Ubuntu Server 20.04+**
3. Choose instance type: **t2.micro** (Free Tier Eligible)
4. Configure:
   - Allow inbound rules for **port 3000** (Custom TCP)
   - Allow inbound **SSH (port 22)** for your IP
5. Launch with a key pair and download the `.pem` file.

---

## 3. Connect to EC2 via SSH

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ec2-user@<EC2_PUBLIC_IP>
# For Ubuntu AMI, replace ec2-user with ubuntu
```

---

## 4. Install Node.js and Git on EC2

For Amazon Linux 2:
```bash
sudo yum update -y
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs git
```

For Ubuntu:
```bash
sudo apt update -y
sudo apt install -y nodejs npm git
```

---

## 5. Clone the Repository

```bash
git clone https://github.com/ynareshkalyan21/whatsapp-api-server.git
cd whatsapp-api-server
npm install
```

---

## 6. Transfer Credentials (if avoiding QR re-scan)

From your local machine:
```bash
scp -i your-key.pem -r auth_info_baileys ec2-user@<EC2_PUBLIC_IP>:/home/ec2-user/whatsapp-api-server/
```

---

## 7. Start the Server

```bash
node index.js
```

Or use **PM2** for production:
```bash
sudo npm install -g pm2
pm2 start index.js --name whatsapp-api
pm2 save
pm2 startup
```

**Stopping PM2 process:**
To stop the server when running via PM2:
```bash
pm2 stop whatsapp-api    # Stop the process
pm2 delete whatsapp-api  # Remove from PM2 list (optional)
pm2 list                 # Verify it's stopped
```

---

## 8. Testing API with `curl`

**Send Message Example:**
```bash
curl -X POST http://<EC2_PUBLIC_IP>:3000/send-message \
-H "Content-Type: application/json" \
-d '{"number": "+919876543210", "message": "Hello from AWS EC2 WhatsApp API!"}'
```

Expected Response:
```json
{
  "success": true,
  "message": "Message sent"
}
```

---

## 9. Changing WhatsApp Account

If you want to change the WhatsApp account linked to the API server:

1. **Stop the server**:
   - If running directly:  
     ```bash
     pkill -f "node index.js"
     ```
   - If using PM2:  
     ```bash
     pm2 stop whatsapp-api
     pm2 delete whatsapp-api
     ```

2. **Delete the existing auth_info_baileys directory**:
   ```bash
   rm -rf auth_info_baileys
   ```

3. **Restart the server to get a new QR code**:
   ```bash
   node index.js
   ```
   Scan the displayed QR using the new WhatsApp account:
   - Open WhatsApp → **Settings** → **Linked Devices** → **Link a Device**
   - Scan the QR

4. After linking, the API server will use the new account for all messages.


## 10. Limitations & Avoiding Ban

Using Baileys is **not** an official WhatsApp Business API and connects as a normal WhatsApp Web client. This means:

- **Not for bulk or spam messaging** — WhatsApp can detect spam-like behavior and may ban the number.
- Send messages only to users who have **opted-in** or have contacted you first.
- Avoid sending too many messages in a short time (rate-limit your requests).
- Avoid identical template-style messages to many recipients.
- Do not use for unsolicited marketing.
- Keep the session running on a stable internet connection — frequent reconnects may raise flags.
- Always keep WhatsApp Web active on the same number when testing.

By following these precautions, the risk of being blocked is minimized, but **there is no absolute guarantee**, as these are WhatsApp’s anti-spam measures.

**Recommended daily sending range for safety:**
- For new accounts: Limit to **50-100 messages/day** initially.
- For warmed-up accounts (active for weeks with consistent usage): Up to **500 messages/day** spread throughout the day.
- Always distribute sending times and avoid bursts.

## 11. Pulling Updates & Redeploying

To update your API server with the latest changes from GitHub:

1. **SSH into your EC2 instance**  
   ```bash
   ssh -i your-key.pem ec2-user@<EC2_PUBLIC_IP>
   ```
   *(Use `ubuntu` instead of `ec2-user` if you’re on Ubuntu AMI)*

2. **Navigate to your project directory**  
   ```bash
   cd whatsapp-api-server
   ```

3. **Pull the latest code**  
   ```bash
   git pull origin main
   ```

4. **Install new dependencies** (only if `package.json` changes)  
   ```bash
   npm install
   ```

5. **Restart the server**:
   - If running directly:  
     ```bash
     pkill -f "node index.js"
     node index.js
     ```
   - If using PM2:  
     ```bash
     pm2 stop whatsapp-api
     pm2 delete whatsapp-api
     pm2 start index.js --name whatsapp-api
     pm2 save
     ```

**Short redeploy (PM2 only, no dependency changes):**
```bash
git pull origin main && pm2 restart whatsapp-api
```

---

## 12. Security Notes
- Never commit `auth_info_baileys/` to public repositories.
- Use **AWS Security Groups** to restrict API access.
- Use HTTPS with a reverse proxy (Nginx + SSL) for production.

---

**Your WhatsApp API server is now deployed and operational on AWS EC2!**