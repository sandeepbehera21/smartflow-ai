# ⚡ SmartFlow AI

> **Stadium Intelligence System** — A real-time, intelligent crowd management ecosystem designed to revolutionize the attendee experience at large-scale sporting venues.

![SmartFlow AI Overview](https://img.shields.io/badge/Status-Live_Prototype-success) ![React](https://img.shields.io/badge/React-18-blue) ![Vite](https://img.shields.io/badge/Vite-5-purple)

**SmartFlow AI** is a comprehensive web prototype that functions as both a mobile-first app for stadium attendees, and a powerful live desktop dashboard for event organizers. It features a custom-built event simulator to generate realistic real-time crowd movement data.

---

## ✨ Key Features

### 1. 🔮 Predictive Crowd Flow Engine
- Real-time event phase simulation cycling through **Pre-Match**, **Live Match**, **Half-Time**, and **Post-Match**.
- Procedural crowd density generation for 19 distinct stadium zones.
- Automatic updates every 2 seconds, synced across the entire ecosystem.

### 2. 📍 Interactive Live Stadium Map
- Complete SVG digital twin of the stadium.
- Real-time heatmap coloring (green to red) indicating congestion.
- Immediate zone-details extraction on hover via interactive tooltips.

### 3. 👥 Intelligent Queue Management & AI Picks
- Accurate, dynamically-calculated wait times across all facilities (Entry Gates, Restrooms, Food Courts).
- Context-aware **AI Recommendations** engine, offering instantaneous, smart suggestions to attendees based on both current event phase and live congestion.

### 4. 🤖 FlowBot Assist
- Floating, interactive AI Assistant.
- Context-aware, natural language responses built contextually on live engine data.

### 5. 📊 Organizer Desktop Dashboard
- Extensive **Admin Control Panel** with global capacity stats.
- Auto-flagging of **High-Risk Zones** along with staff-deployment recommendations.
- Timeline Area Charts analyzing global average and absolute peak densities.
- Central system override for Emergency Broadasting/Evacuations.

---

## 🛠 Tech Stack

- **Frontend Core:** React (Vite)
- **Styling:** Custom Vanilla CSS (Premium Dark Mode with Glassmorphism)
- **Data Visualization:** Recharts, Custom SVG processing
- **Icons:** Lucide-React
- **Architecture:** Client-side mock AI simulation engine (`simulationEngine.js`) tightly integrated via React Hooks (`useSimulation.js`).

---

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js (v18+) installed on your machine.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sandeepbehera21/smartflow-ai.git
   cd smartflow-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **View the Application**
   Open your browser and navigate to `http://localhost:5173`. You can toggle between the **Attendee App** and **Admin Dashboard** in the top navigation bar.

---

## 🏗 Project Structure

```text
smartflow-ai/
├── src/
│   ├── components/       # Reusable React components (StadiumMap, Navbar, Chatbot, etc.)
│   ├── engine/           # 'simulationEngine.js' containing mock intelligence & event logic
│   ├── hooks/            # 'useSimulation.js' data subscriber
│   ├── pages/            # View Pages (AttendeePage, AdminDashboard)
│   ├── styles/           # CSS Architecture (global, layout, responsive, components)
│   ├── App.jsx           # Root layout and view routing
│   └── main.jsx          # React entry point
└── package.json
```

---

<div align="center">
  <i>Built to eliminate lines and accelerate flow. Enjoy the match!</i> ⚽🔥
</div>
