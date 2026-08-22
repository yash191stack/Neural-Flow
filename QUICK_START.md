# 🚀 NeuralFlow V3 - QUICK START GUIDE

## Prerequisites
- Node.js 16+ installed
- npm installed
- Port 3001 available for backend
- Port 5173 available for frontend

---

## 🎯 OFFICIAL STARTUP WORKFLOW (READ FIRST)

There is **ONE** official startup command for NeuralFlow:

```bash
./start.sh                # starts backend (:3001) + frontend (:5173)
./start.sh --backend-only # backend only (for terminal demos / API testing)
./start.sh --restart      # force-kill stale processes + restart backend
```

### What `./start.sh` does (idempotent — safe to run repeatedly)
1. Checks `http://localhost:3001/api/health`.
2. If **healthy** → prints `NeuralFlow already running on :3001 (PID XXXX)` and
   does **NOT** create a duplicate, **NOT** kill the healthy backend.
3. If **not healthy** → removes stale `backend.pid`, kills only **orphaned
   NeuralFlow** processes (`backend/src/server.js` / `backend/src/appNode.js`),
   then starts exactly one fresh backend.
4. Waits for `/api/health` to respond (max 30s), then starts the frontend.

> `npm run dev`, `node server.js`, or `nodemon server.js` are **development-only**
> alternatives. Do **NOT** run them alongside `./start.sh` for the same backend —
> the backend's built-in single-instance guard will exit a duplicate instance.

### REAL BharatBazaar (separate project)
Real BharatBazaar lives at `/Users/yash/Desktop/BharatBazaar/BharatBazaar/`
(ports **5001 / 5002 / 5003**) and is started **separately** with:

```bash
cd /Users/yash/Desktop/BharatBazaar/BharatBazaar
bash start-bb.sh          # starts all 3 real BB nodes on 5001-5003
```

NeuralFlow connects to it through `ExternalNodeAdapter` when the frontend
switches to **BharatBazaar / EXTERNAL**. It is never started by `./start.sh`.

### Port map (never change these)
| Port | Service |
|------|---------|
| 3001 | NeuralFlow backend (Express + WebSocket) |
| 4000 | NeuralFlow internal router proxy |
| 4001-4003 | NeuralFlow internal nodes (appNode.js) |
| 5001-5003 | REAL BharatBazaar nodes (separate project) |
| 5100 | NeuralFlow external router proxy |
| 5173 | Frontend (Vite dev server) |

---

## 🔧 Installation & Setup

### Step 1: Backend Setup
```bash
cd backend
npm install
```

### Step 2: Start Backend Server
```bash
node src/server.js
```

**✅ Success looks like:**
```
🧠 Training neural network...
🧠 Starting neural network training with 500 samples...
╔══════════════════════════════════════════════════════════════╗
║            🧠  NeuralFlow V3 Backend Server  🧠             ║
╠══════════════════════════════════════════════════════════════╣
║  Server: http://localhost:3001                              ║
║  WebSocket: ws://localhost:3001                             ║
║  Status: ONLINE                                             ║
╚══════════════════════════════════════════════════════════════╝
✅ Training complete! Error: 0.001301, Accuracy: 62.00%
✅ Neural network ready!
```

### Step 3: Frontend Setup (New Terminal)
```bash
cd frontend
npm install
```

### Step 4: Start Frontend Dev Server
```bash
npm run dev
```

**✅ Success looks like:**
```
  VITE v5.0.0  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 5: Open Browser
Navigate to: **http://localhost:5173**

---

## 🎮 First Demo

### 1. View Dashboard
- You'll see 3 server nodes (US, EU, Asia)
- Each node shows real-time metrics: latency, CPU, memory, errors
- All metrics animate (count-up effect)

### 2. Launch an Attack
- Scroll to "Attack Control Panel"
- Select **Target Node**: Node 1 (Testfire Bank)
- Select **Attack Type**: DDoS
- Set **Intensity**: 80%
- Click **"🚀 Launch Attack"**

### 3. Watch AI Respond
- Node 1 turns RED
- 3D visualization shows attack rings pulsing
- Within 0.2s, AI makes decision
- Toast notification: "AI rerouted traffic in 0.2s"
- Console shows feature attribution

### 4. View AI Insights
- Click **"AI Insights"** in sidebar
- See **Precision, Recall, F1 Score**
- View **Feature Importance** chart
- See which metrics drove the decision

### 5. Compare Manual vs AI
- Click **"Comparison"** in sidebar
- Click **"Start Comparison Demo"**
- Watch side-by-side:
  - **Manual**: 15 seconds (simulated human response)
  - **AI**: 0.2 seconds (automated)
- See the 97% improvement

---

## 🎯 Key Features to Demo

### Real Neural Network
- Open browser console (F12)
- Backend console shows: "✅ Training complete! Accuracy: 62.00%"
- This is REAL Brain.js training, not fake logic

### 3D Visualization
- Dashboard has 3D scene
- Nodes are actual Three.js spheres
- Animated connection beams
- Attack rings expand/fade
- Drag to rotate camera

### Explainable AI
- AI Insights page
- Feature attribution shows:
  - Latency Trend: 34%
  - Queue Size: 28%
  - Error Rate: 21%
  - CPU Usage: 12%
  - Memory: 5%
- This shows WHY the AI made each decision

### Real-Time Updates
- All metrics update every 2 seconds
- WebSocket connection (not polling)
- Auto-reconnect if disconnected
- Toast notifications for events

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 3001 is in use
netstat -ano | findstr :3001

# Kill process if needed
taskkill /PID <pid> /F

# Restart backend
node src/server.js
```

### Frontend build errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### WebSocket not connecting
- Check backend is running (console shows "ONLINE")
- Check firewall allows port 3001
- Try http://localhost:3001 in browser (should see server info)

### 3D scene not rendering
- Check Three.js version: should be 0.168.0
- Check browser supports WebGL
- Open console for errors

---

## 📊 Testing Checklist

- [ ] Backend starts without errors
- [ ] Neural network trains (shows accuracy %)
- [ ] Frontend builds without errors
- [ ] Browser shows dashboard at localhost:5173
- [ ] 3D scene renders with animated nodes
- [ ] Can launch attack (node turns red)
- [ ] Toast notifications appear
- [ ] AI Insights page shows metrics
- [ ] Comparison page works
- [ ] All 8 pages load successfully

---

## 🎓 For Presentation

### Opening Statement
"NeuralFlow V3 is an AI-powered network traffic management system that detects and responds to DDoS attacks 97% faster than manual intervention. It uses a real Brain.js neural network—not simulated logic—trained on 500 attack patterns with 9 input features."

### Key Points
1. **Real ML**: Console proof of neural network training
2. **0.2s Response**: Automated rerouting within 200ms
3. **Explainable AI**: Shows why each decision was made
4. **3D Visualization**: React Three Fiber with bloom effects
5. **Production-Ready**: ES6 modules, WebSocket, proper error handling

### Demo Flow (5 minutes)
1. Show backend console (neural network training) - **30s**
2. Open dashboard, explain metrics - **60s**
3. Launch attack, watch AI respond - **90s**
4. Show AI Insights (feature attribution) - **60s**
5. Run comparison demo (manual vs AI) - **60s**

---

## 🔥 Advanced Features

### Retrain Neural Network
```bash
# Send POST request to retrain
curl -X POST http://localhost:3001/api/retrain
```

### Export Events as CSV
- Go to Reports page
- Click "Export CSV"
- Opens download with all events

### Toggle AI/Manual Mode
- Top-right toggle in dashboard
- AI Mode: automatic responses
- Manual Mode: requires user confirmation

### View Real-Time Events
- Sidebar shows last 10 events
- Auto-scrolls as new events arrive
- Color-coded by type (red=alert, green=recovery, cyan=AI)

---

## 🚀 Production Deployment (Optional)

### Build Frontend
```bash
cd frontend
npm run build
```

### Deploy Backend
```bash
# Use PM2 for process management
npm install -g pm2
pm2 start src/server.js --name neuralflow-backend
```

### Environment Variables
Create `.env` file:
```
PORT=3001
NODE_ENV=production
WS_PORT=3001
```

---

## 📞 Support

If you encounter issues:
1. Check backend console for errors
2. Check browser console (F12)
3. Verify all dependencies installed
4. Ensure ports 3001 and 5173 are available

---

**Ready to demo!** 🎉

*NeuralFlow V3 - Built with Brain.js, React Three Fiber, and ❤️*
