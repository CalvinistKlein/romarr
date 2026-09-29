# 🎮 Romarr

**Romarr** is a Radarr / Sonarr-style automated collection manager for video game ROMs and ISO disc images. It integrates with **Prowlarr** / **Torznab** indexers and download clients (like **qBittorrent**), and automatically sorts, unpacks, and organizes downloaded games into native folder structures for **Batocera**, **RetroPie**, **Recalbox**, or **ES-DE**.

---

## ✨ Features

- 🔍 **Radarr / Sonarr-Style Web UI**: Search for games with rich cover art, screenshots, release years, developers, genres, and platform filters.
- 🌍 **Region Sorting & Filtering**:
  - Filter releases directly by **USA / North America (NTSC-U)**, **Europe (PAL)**, **Japan (NTSC-J)**, **World / Global**, or **English Fan Translations (`[T-En]`)**.
  - Customizable **Region Priority Hierarchy** in Settings (e.g., automatically prefer USA releases over Europe and Japan).
- 📦 **Prowlarr & Torznab Indexer Support**: Live interactive release search with seeder count, file size, quality format (`.chd`, `.rvz`, `.iso`, `.nsp`, `.zip`), and 1-click grabbing.
- 🕹️ **Batocera & RetroPie Native Organization**:
  - Automatically moves and renames ROMs into clean directories:
    - Batocera: `/userdata/roms/<system>/` (e.g. `snes`, `psx`, `ps2`, `n64`, `gamecube`, `switch`, `megadrive`)
    - RetroPie: `/home/pi/RetroPie/roms/<system>/` (e.g. `snes`, `psx`, `ps2`, `gc`, `wii`)
  - Auto-extracts `.zip`, `.7z`, and `.rar` archives when appropriate, keeping optimal formats like `.chd` (PS1/PS2/Dreamcast/Saturn) and `.rvz` (GameCube/Wii).
- ⚡ **Background Queue & Download Monitor**: Live download speed, progress bar, ETA, and automatic post-processing upon completion.
- 🐳 **Dockerized Deployment**: Single-container build or unified `docker-compose.yml` with Prowlarr and qBittorrent included.

---

## 🚀 Quick Start with Docker Compose

1. Clone or navigate to the repository:
   ```bash
   cd Romarr_Redo
   ```

2. Start Romarr along with Prowlarr and qBittorrent:
   ```bash
   docker compose up -d
   ```

3. Access the web dashboards:
   - **Romarr UI**: [http://localhost:8000](http://localhost:8000)
   - **Prowlarr**: [http://localhost:9696](http://localhost:9696)
   - **qBittorrent**: [http://localhost:8080](http://localhost:8080) *(Default user/pass: `admin` / `adminadmin`)*

---

## 📁 Directory Structure & Volume Mounts

In `docker-compose.yml`:
- `./roms:/roms` ➔ Mount to your Batocera or RetroPie ROMs storage.
- `./downloads:/downloads` ➔ Shared download directory where qBittorrent saves files.
- `./config:/app/data` ➔ Persistent database (`romarr.db`) and user settings.

---

## 🛠️ Local Development

### 1. Backend (FastAPI + SQLite)
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

### 2. Frontend (React + Vite + Tailwind CSS)
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ⚙️ Configuration & Region Preferences

In **Romarr Settings**:
1. **Prowlarr Integration**: Enter your Prowlarr URL (e.g., `http://prowlarr:9696`) and API Key.
2. **Download Client**: Set qBittorrent Web UI URL and credentials.
3. **Region Priority**: Reorder your preferred regions (`USA`, `EUR`, `JPN`, `WORLD`, `TRANSLATION`) using the **Move Up / Move Down** controls.
4. **Target Structure**: Choose between **Batocera**, **RetroPie**, **Recalbox**, or **ES-DE**.
