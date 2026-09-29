# Romarr

Romarr is an automated video game ROM and ISO collection manager inspired by Radarr and Sonarr. It integrates with Prowlarr/Torznab indexers and download clients (such as qBittorrent) to search, download, extract, and automatically organize retro and modern games into destination folders compatible with Batocera, RetroPie, Recalbox, and ES-DE.

## Features

- **Web Interface**: Manage your game library, browse metadata, view cover art, and monitor active downloads.
- **Indexer Integration**: Query Prowlarr/Torznab indexers for releases with seeders, file size, format detection, and one-click grab.
- **Region Parsing & Prioritization**: Automatically classify releases by region (USA/NTSC-U, Europe/PAL, Japan/NTSC-J, World, and fan translation patches) and apply custom priority order.
- **Automated Organization & Extraction**: Move completed downloads to emulator-ready paths with support for `.zip`, `.7z`, and `.rar` unpacking and preferred formats (`.chd`, `.rvz`, `.iso`, etc.).
- **Target OS Compatibility**: Folder structures configurable for Batocera (`/userdata/roms/<system>/`), RetroPie (`/home/pi/RetroPie/roms/<system>/`), Recalbox, and ES-DE.
- **Download Monitoring**: Track progress, download speeds, ETA, and post-processing queue in real time.

## Quick Start (Docker Compose)

1. Clone repository:
   ```bash
   git clone https://github.com/CalvinistKlein/romarr.git
   cd romarr
   ```

2. Start service:
   ```bash
   docker compose up -d
   ```

3. Access dashboards:
   - Romarr Web UI: `http://localhost:8000`

### Volume Mounts

| Host Path | Container Path | Purpose |
| --- | --- | --- |
| `./config` | `/app/data` | Persistent SQLite database (`romarr.db`) and settings |
| `./roms` | `/roms` | Organized ROM target library |
| `./downloads` | `/downloads` | Shared download directory from download client |

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 20+ and npm

### Backend Setup
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

## Configuration

Navigate to **Settings** in the Romarr UI to configure:
1. **Prowlarr Integration**: Prowlarr URL and API key for indexer queries.
2. **Download Client**: qBittorrent Web UI URL, username, and password.
3. **Region Hierarchy**: Drag or reorder preferred regions (USA, EUR, JPN, WORLD, Translation).
4. **Target Structure**: Destination folder conventions (Batocera, RetroPie, Recalbox, ES-DE).

## AI Attribution

This project was developed with the assistance of AI tools (including Anthropic and Google DeepMind models) for code generation, architecture design, and documentation.

## License

MIT License.
