# docCollector

A Chrome extension that lets you collect content from multiple web pages as you browse and export them as Markdown or PDF. Built to solve the problem of documentation sites (like Salesforce Help) that use shadow DOM and are difficult for AI tools to access.

## Why This Exists

Many documentation sites render content in ways that make it hard to copy, scrape, or feed to AI tools. Instead of fighting with crawlers and shadow DOM, docCollector lets you browse naturally and collect the pages you actually need.

## Tech Stack

| Technology | Purpose | Rationale |
|------------|---------|-----------|
| Chrome Extension Manifest V3 | Extension platform | Current standard, required for Chrome Web Store |
| Chrome Side Panel API | Persistent UI | Stays open while browsing, perfect for collector pattern |
| Mozilla Readability | Content extraction | Battle-tested algorithm (powers Firefox Reader View) |
| jsPDF | PDF generation | Client-side PDF creation, no server needed |
| Turndown | HTML → Markdown | Clean, configurable HTML to Markdown conversion |
| JSZip | Zip bundling | Client-side zip creation for multi-file exports |
| Vanilla JS + CSS | UI | No framework needed for this scope, keeps it fast |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Chrome Browser                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐     ┌─────────────────────────────────┐   │
│  │   Side Panel    │     │         Active Tab              │   │
│  │                 │     │                                 │   │
│  │  ┌───────────┐  │     │  ┌───────────────────────────┐  │   │
│  │  │ Collection│  │     │  │     Content Script        │  │   │
│  │  │   List    │◄─┼─────┼──│  - Readability extraction │  │   │
│  │  └───────────┘  │     │  │  - Shadow DOM traversal   │  │   │
│  │                 │     │  │  - Content cleanup        │  │   │
│  │  ┌───────────┐  │     │  └───────────────────────────┘  │   │
│  │  │  Export   │  │     │                                 │   │
│  │  │  Options  │  │     └─────────────────────────────────┘   │
│  │  └───────────┘  │                                           │
│  │                 │     ┌─────────────────────────────────┐   │
│  │  ┌───────────┐  │     │      Service Worker            │   │
│  │  │  Preview  │  │     │  - Message routing             │   │
│  │  │   Modal   │──┼────►│  - Tab management              │   │
│  │  └───────────┘  │     │  - Export orchestration        │   │
│  │                 │     └─────────────────────────────────┘   │
│  └─────────────────┘                                           │
│                                                                 │
│  ┌─────────────────┐                                           │
│  │  Options Page   │  ← Extension settings (max pages, etc.)   │
│  └─────────────────┘                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Folder Structure

```
/docCollector
├── manifest.json           # Extension configuration (Manifest V3)
├── README.md
├── CLAUDE.md
│
├── /.github
│   └── /workflows
│       └── release.yml     # Auto version bump & release on push to master
│
├── /src
│   ├── /sidepanel
│   │   ├── sidepanel.html  # Side panel markup
│   │   ├── sidepanel.css   # Styles
│   │   └── sidepanel.js    # UI logic, collection management
│   │
│   ├── /options
│   │   ├── options.html    # Extension settings page
│   │   ├── options.css     # Settings styles
│   │   └── options.js      # Settings logic
│   │
│   ├── /content
│   │   └── extractor.js    # Content extraction (injected into pages)
│   │
│   ├── /background
│   │   └── service-worker.js  # Message routing, tab management
│   │
│   ├── /lib
│   │   ├── Readability.js  # Mozilla Readability (vendored)
│   │   ├── turndown.js     # HTML to Markdown (vendored)
│   │   ├── jspdf.umd.min.js # PDF generation (vendored)
│   │   └── jszip.min.js    # Zip creation (vendored)
│   │
│   └── /export
│       ├── markdown.js     # Markdown export logic
│       └── pdf.js          # PDF export logic
│
├── /icons
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
│
└── /docs
    └── /specs
        └── *.md            # Development specs
```

## Data Flow

### Adding a Page

```
1. User clicks "Add Current Page"
2. Side panel checks collection limit (max from settings)
3. Side panel sends message to service worker
4. Service worker injects content script into active tab
5. Content script:
   a. Clones document
   b. Traverses shadow DOMs, flattens into clone
   c. Runs Readability on clone
   d. Returns extracted content with title, URL, timestamp
6. Service worker relays content to side panel
7. Side panel adds to collection array, re-renders list
```

### Exporting

```
1. User selects format (Markdown/PDF) and output (Single/Separate)
2. User clicks "Export"
3. For each collected page, generate file with header:
   - Title
   - Source URL
   - Capture date/time
4. If single file:
   - Combine all with separators (page breaks for PDF, visual breaks for MD)
   - Download as single .md or .pdf
5. If separate files:
   - Create individual files
   - Bundle into zip
   - Download as .zip
6. If "Clear after export" setting is on, clear collection
```

## Page Header Format

Every exported page includes this header:

```
Title: Apex Triggers Overview
Source: https://help.salesforce.com/s/articleView?id=sf.apex_triggers.htm
Captured: 2024-01-15 14:32

[content follows]
```

For combined Markdown files, pages are separated by:
```
═══════════════════════════════════════════════════════════════════════════════

```

For combined PDF files, each page starts on a new PDF page.

## Extension Settings

Accessed via: Chrome extensions → docCollector → Details → Extension options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Max pages | Number | 20 | Maximum pages in collection before export required |
| Clear after export | Checkbox | ✓ On | Automatically clear collection after successful export |

## Code Conventions

### Naming

- Files: `kebab-case.js`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- CSS classes: `kebab-case`
- Message types: `UPPER_SNAKE_CASE` (e.g., `ADD_PAGE`, `EXTRACT_CONTENT`)

### Patterns

- Message passing uses `chrome.runtime.sendMessage` / `onMessage`
- Settings stored via `chrome.storage.sync`
- All async operations use async/await
- Content script extraction is a pure function (no side effects)
- Collection state lives in side panel only (session-based)

### Commits

This project uses [Conventional Commits](https://www.conventionalcommits.org/) to drive automatic versioning:

| Prefix | Version bump | Example |
|--------|-------------|---------|
| `fix:` | Patch (0.1.0 → 0.1.1) | `fix: handle empty page title` |
| `feat:` | Minor (0.1.0 → 0.2.0) | `feat: add CSV export format` |
| `feat!:` | Major (0.1.0 → 1.0.0) | `feat!: redesign settings API` |
| `chore:`, `docs:`, `refactor:`, etc. | Patch | `chore: update dependencies` |

On every push to `master`, a GitHub Actions workflow:
1. Scans commit messages since the last release tag
2. Determines the bump level (highest wins)
3. Increments the version in `manifest.json`
4. Creates a GitHub Release with a downloadable zip

## Install from Release

1. Go to the [Releases](../../releases) page
2. Download the `docCollector-vX.Y.Z.zip` from the latest release
3. Unzip the file
4. Open Chrome → `chrome://extensions/`
5. Enable **Developer mode** (top right)
6. Click **Load unpacked** and select the unzipped folder

## Running Locally

1. Clone the repository
2. Open Chrome → `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" → select the `docCollector` folder
5. Click the extension icon → "Open side panel"
6. Browse to any page, click "Add Current Page"

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Side panel vs popup | Side panel | Stays open while browsing; popup closes on click-away |
| Content extraction | Readability + shadow DOM walk | Readability is proven; shadow DOM walk handles modern sites |
| No persistence | Session only | Keeps it simple; collecting → exporting is a single workflow |
| Vendored libraries | Yes | Chrome extensions can't use CDNs; keeps it self-contained |
| No framework | Vanilla JS | Small scope, fast load, no build step needed |
| Export formats | MD or PDF | MD for AI/editing, PDF for sharing with humans |
| Separate files as zip | Always | Clean delivery, single download |
| Settings in options page | Yes | Keeps side panel UI clean, power user config separate |

## Browser Support

- **Chrome 114+** (Side Panel API requirement)
- **Edge 114+** (Chromium-based, should work)
- Firefox/Safari: Not supported (different extension APIs)

## Limitations

- Cannot extract content from browser-internal pages (`chrome://`, `chrome-extension://`)
- Some heavily JS-rendered SPAs may need a moment to load before extraction works
- PDFs have basic formatting (no images, just text with headers)
- Closed shadow DOMs (rare) may not be fully accessible
- Maximum 20 pages per collection (configurable in settings)
