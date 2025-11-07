# Deployment Guide

## 🚀 Quick Sharing Options

### Option 1: Deploy to Railway (Recommended - Free & Easy)

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy from GitHub**
   ```bash
   # Push your code to GitHub first
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

3. **Deploy on Railway**
   - Go to Railway dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will auto-detect Node.js and deploy
   - Your app will be live at `https://your-app-name.railway.app`

4. **Share the URL** with your team members!

---

### Option 2: Deploy to Render (Free Tier Available)

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create New Web Service**
   - Connect your GitHub repository
   - Settings:
     - **Build Command**: `npm run build`
     - **Start Command**: `npm start`
     - **Environment**: Node
   - Deploy!

3. **Share the URL** (e.g., `https://your-app.onrender.com`)

---

### Option 3: Deploy to Heroku

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Login and Deploy**
   ```bash
   heroku login
   heroku create your-app-name
   git push heroku main
   ```

3. **Share the URL** (e.g., `https://your-app-name.herokuapp.com`)

---

### Option 4: Share Locally with ngrok (Quick Testing)

**Best for quick demos or testing with team members on different networks**

1. **Install ngrok**
   - Download from [ngrok.com](https://ngrok.com/download)
   - Or: `npm install -g ngrok`

2. **Start your server**
   ```bash
   npm start
   ```

3. **Start ngrok tunnel**
   ```bash
   ngrok http 3000
   ```

4. **Share the ngrok URL**
   - You'll get a URL like: `https://abc123.ngrok.io`
   - Share this with your team members
   - They can access your local server through this URL

**Note**: Free ngrok URLs expire after 2 hours. For permanent sharing, use deployment options above.

---

### Option 5: Local Network Sharing (Same WiFi)

**Best if all team members are on the same network**

1. **Find your local IP address**
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `ip addr`
   - Example: `192.168.1.100`

2. **Start your server**
   ```bash
   npm start
   ```

3. **Share the URL**
   - Format: `http://YOUR_IP:3000`
   - Example: `http://192.168.1.100:3000`
   - Team members on the same network can access this

4. **Firewall Note**
   - You may need to allow port 3000 in Windows Firewall
   - Windows: Control Panel → Windows Defender Firewall → Allow an app

---

## 📝 Pre-Deployment Checklist

Before deploying, make sure:

- [ ] All dependencies are in `package.json`
- [ ] `npm start` works locally
- [ ] Port is set via `process.env.PORT` (for cloud services)
- [ ] No hardcoded localhost URLs
- [ ] `.gitignore` excludes `node_modules` and `dist`

---

## 🔧 Environment Variables

For cloud deployments, you may want to set:

- `PORT`: Server port (usually auto-set by hosting service)
- `NODE_ENV`: Set to `production` for production deployments

---

## 🐛 Troubleshooting

### Port Issues
- Cloud services usually set `PORT` automatically
- Make sure your code uses `process.env.PORT || 3000`

### Build Errors
- Ensure TypeScript compiles: `npm run build`
- Check that all dependencies are in `package.json`, not just `devDependencies`

### WebSocket Issues
- Ensure your hosting service supports WebSockets
- Railway, Render, and Heroku all support WebSockets

---

## 💡 Recommended Approach

**For Quick Demo**: Use **ngrok** (Option 4)
**For Team Sharing**: Use **Railway** or **Render** (Options 1 or 2)
**For Production**: Use **Railway** or **Heroku** (Options 1 or 3)

