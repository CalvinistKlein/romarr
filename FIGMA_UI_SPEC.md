# 🎨 Romarr — 2015 Flat UI Design Specification (Figma Guide)

This specification defines a classic **2015-era flat Web UI** (inspired by early Sonarr/Radarr v2, Bootstrap 3 flat theme, Transmission Web, and classic *arr interfaces). 

> 🚫 **Design Rules for 2015 Aesthetic**:
> - **NO** floating cards or floating blur boxes.
> - **NO** glassmorphism, backdrops, or transparent frosted glass.
> - **NO** drop shadows (`box-shadow: none`), glow effects, or decorative multi-stop gradients.
> - **NO** heavy border radiuses (keep all corners crisp: `0px` to `3px` max).
> - **YES**: Solid flat colors, standard `1px solid` border dividers, classic top navbar, tabular data views, standard form controls, flat badge labels, and Bootstrap-style alert banners.

---

## 1. 2015 Design Tokens & Palette

### 1.1 Color Palette (Classic 2015 Dark / Neutral Flat)

| Token Name | Hex Code | Usage |
| :--- | :--- | :--- |
| **Page Background** | `#1A1D20` | Flat solid background for the entire page |
| **Navbar Background** | `#111315` | Solid top navigation header |
| **Panel Background** | `#22262A` | Standard content panels, table headers |
| **Input / Form Surface** | `#16181A` | Form inputs, dropdowns, search boxes |
| **Border Line (Divider)**| `#2D3238` | `1px solid` table borders and section rules |
| **Primary Blue (Action)**| `#337AB7` | Standard 2015 primary buttons, links, active tabs |
| **Primary Blue Hover** | `#286090` | Button hover state |
| **Success Green** | `#5CB85C` | "Downloaded" badge, active seeders, confirm actions |
| **Warning Orange** | `#F0AD4E` | "Wanted" badge, Europe region tag, alerts |
| **Danger Red** | `#D9534F` | "Missing", Japan region tag, delete actions |
| **Info / Cyan** | `#5BC0DE` | Target paths, Batocera directory tags |
| **Text Primary** | `#E6E6E6` | Main body text and titles |
| **Text Muted** | `#8C939D` | Help text, table column headers, timestamps |

### 1.2 Region Badge Styles (2015 Flat Rectangular Badges)

All badges use flat solid backgrounds with `2px` or `0px` border-radius:
- 🇺🇸 **USA / North America**: Background `#204D74`, Text `#BCE8F1`, Border `1px solid #337AB7`
- 🇪🇺 **Europe / PAL**: Background `#66512C`, Text `#FAEBCC`, Border `1px solid #8A6D3B`
- 🇯🇵 **Japan / NTSC-J**: Background `#6B2424`, Text `#EBCCD1`, Border `1px solid #A94442`
- 🈳 **Translations**: Background `#255625`, Text `#D6E9C6`, Border `1px solid #3C763D`
- 🌐 **World / Global**: Background `#3E444C`, Text `#D9D9D9`, Border `1px solid #4E555B`

### 1.3 Typography (System / Web-Safe 2015 Stack)

- **Primary Font**: `Helvetica Neue`, `Helvetica`, `Arial`, `sans-serif`
- **Monospace Font**: `Menlo`, `Monaco`, `Consolas`, monospace
- **Page Title**: `20px` / `Normal (400)` or `SemiBold (600)`
- **Section Heading**: `15px` / `Bold (700)` / `Border-bottom: 1px solid #2D3238`
- **Body & Tables**: `13px` / `Normal (400)` / `Line-height: 18px`
- **Small / Labels**: `11px` / `Bold (700)`

---

## 2. Layout & Shell Architecture (Figma Frame: 1440x900)

```text
+-----------------------------------------------------------------------------------------------+
| ROMARR   [Library] [Activity (2)] [Consoles] [Settings]       [Filter...]  [+ Add Game] [450GB] |
+-----------------------------------------------------------------------------------------------+
| PAGE CONTENT (Full width, flat rectangular layout with 1px border dividers)                   |
|                                                                                               |
+-----------------------------------------------------------------------------------------------+
| Target Structure: Batocera Linux Native (/roms/<system>)                 Romarr v1.0.0 (2015) |
+-----------------------------------------------------------------------------------------------+
```

### 2.1 Classic Top Navbar (Height: `50px`, Background: `#111315`, Border-Bottom: `1px solid #2D3238`)
- Left:
  - Brand: `ROMARR` (`16px Bold`, White text)
  - Navigation Links:
    - `Library` (Active: `#337AB7` solid background or underline)
    - `Activity (2)` (With red/blue count pill)
    - `Consoles`
    - `Settings`
- Right:
  - Search Input (`#16181A`, `1px solid #2D3238`, `radius: 3px`)
  - `+ Add Game` Button (`#337AB7`, `radius: 3px`, flat)
  - System Free Space: `Free: 450.2 GB`

---

## 3. Screen 1: Game Library (Dashboard)

### 3.1 Flat Filter Toolbar (Background: `#22262A`, Border: `1px solid #2D3238`, Height: `44px`)
- **Filter Row**:
  - `Filter Title:` Text input box
  - `Console:` `[All Consoles | SNES | PS2 | GameCube | Switch | GBA]`
  - `Region:` `[All Regions | USA | EUR | JPN | World | Translation]`
  - `Status:` `[All Statuses | Downloaded | Downloading | Wanted]`
  - View switch: `[Grid View] [Table View]`

### 3.2 Flat Game Poster Grid
- **Poster Box** (`Width: 160px`, `Border: 1px solid #2D3238`, Background: `#22262A`):
  - Image: 3:4 aspect ratio, flush inside border, no rounded corners.
  - Tag Strip:
    - `[SNES]` (Black flat label)
    - `[USA 🇺🇸]` (Blue flat badge)
  - Information Footer:
    - Title: `Chrono Trigger` (`12px Bold`, white)
    - Year / Developer: `1995 • Square` (`11px`, `#8C939D`)
    - Status Tag: `[DOWNLOADED]` (Green) or `[DOWNLOADING 45%]` (Blue) or `[WANTED]` (Yellow)
  - Actions Bar:
    - Flat button: `[Search Releases]` (`#337AB7`)
    - Flat button: `[Delete]` (`#D9534F`)

---

## 4. Screen 2: "Search Releases" Modal (Region Filter & Sorter)

> **Region Workflow**: Direct 2015 flat button group allowing instant sorting between American, Japanese, European releases.

```text
+-----------------------------------------------------------------------------------------------+
| Search Releases: Chrono Trigger (SNES)                                                    [X] |
+-----------------------------------------------------------------------------------------------+
| Region: [ All Regions ] [ USA / NTSC-U ] [ Europe / PAL ] [ Japan / NTSC-J ] [ Translation ]  |
| Sort:   [ Recommended (Region + Seeders) v ]                                                  |
+-----------------------------------------------------------------------------------------------+
| Region   | Format | Title                                | Indexer      | Size  | S / L | Action|
|----------|--------|--------------------------------------|--------------|-------|-------|-------|
| 🇺🇸 USA   | SFC    | Chrono Trigger (USA) (En,Fr,Es).sfc  | GazelleGames | 4.1MB | 42/3  | [Grab]|
| 🇪🇺 EUR   | SFC    | Chrono Trigger (Europe) (En,Fr).sfc  | TorrentLeech | 4.1MB | 19/2  | [Grab]|
| 🈳 TRANS | SFC    | Chrono Trigger (J) [T-En by AG].sfc  | RetroTorrents| 4.1MB | 35/2  | [Grab]|
| 🇯🇵 JPN   | SFC    | Chrono Trigger (Japan) (NTSC-J).sfc  | Nyaa         | 4.1MB | 14/0  | [Grab]|
+-----------------------------------------------------------------------------------------------+
```

### Specifications:
1. **Modal Header** (`#111315`, `Border-bottom: 1px solid #2D3238`, Padding: `12px 16px`):
   - Text: `Search Releases: Game Title (Console)` + `[X]` close button.
2. **Flat Button Group (Region Filter)**:
   - Group of flat connected buttons (`btn-group` style):
     - `[All Regions]`
     - `[🇺🇸 USA / North America]`
     - `[🇪🇺 Europe / PAL]`
     - `[🇯🇵 Japan / NTSC-J]`
     - `[🌐 World / Global]`
     - `[🈳 English Translation]`
   - Active button: Solid `#337AB7` with white text.
   - Inactive button: Solid `#16181A` with border `#2D3238`.
3. **Data Table (`table-bordered table-striped`)**:
   - Table Header (`#16181A` background, `#8C939D` uppercase text).
   - Rows with alternating slight row tint (`#22262A` / `#1E2125`).
   - Grab Button: Flat `#5CB85C` (Green) `[Download ROM]`.

---

## 5. Screen 3: "Add New Game" Catalog Modal

- **Header**: `Add New Game to Library`
- **Filter Row**:
  - Search input box: `[ Search game title...                         ] [ Search ]`
  - Target Console selector: `[ All Consoles v ]`
  - Preferred Region selector: `[ 🇺🇸 USA / North America v ]`
  - Checkbox: `[x] Auto-search indexers upon adding`
- **Results Table / Flat List**:
  - Each item: `48x64px` image, Title, Console tag, Year, Synopsis, `[+ Add Game]` button.

---

## 6. Screen 4: Activity & Download Queue

### 6.1 Active Downloads Table
- Columns: `Game`, `Release Filename`, `Region`, `Progress`, `Speed`, `ETA`, `Size`, `Actions`
- **Progress Bar**: Standard flat 2015 rectangular progress bar (`Height: 14px`, Background: `#16181A`, Fill: Solid `#337AB7`, text overlay `45%`).
- Action: `[Cancel]` (`#D9534F`).

### 6.2 Organization History Table
- Columns: `Game`, `Release Title`, `Region`, `Target Destination`, `Completed Date`

---

## 7. Screen 5: Settings & Region Hierarchy

### 7.1 Region Priority Hierarchy (Classic Reorder List)
- Bordered panel with reorder buttons:
  - `[1] 🇺🇸 USA / North America    [▲ Move Up] [▼ Move Down]`
  - `[2] 🇪🇺 Europe / PAL           [▲ Move Up] [▼ Move Down]`
  - `[3] 🇯🇵 Japan / NTSC-J         [▲ Move Up] [▼ Move Down]`
  - `[4] 🌐 World / Global         [▲ Move Up] [▼ Move Down]`
  - `[5] 🈳 English Translation    [▲ Move Up] [▼ Move Down]`

### 7.2 Service Panels (`panel panel-default`)
- **Prowlarr Configuration**: URL, API Key, `[Test Connection]` button.
- **qBittorrent Configuration**: Host URL, Username, Password, Category `romarr`, `[Test Connection]`.
- **Target ROM Storage**: Path `/roms`, OS Structure dropdown `[Batocera | RetroPie | Recalbox | ES-DE]`.
- **Save Button**: Flat `#337AB7` `[Save Settings]`.

---

## 8. Figma UI Checklist for 2015 Theme

- [ ] All `border-radius` set to `0px` or `3px`.
- [ ] All `box-shadow` and `drop-shadow` removed / set to `none`.
- [ ] No backdrop filters or translucent blurs.
- [ ] Solid border dividers (`1px solid #2D3238`).
- [ ] Clean tabular layouts and solid Bootstrap-style button groups.
