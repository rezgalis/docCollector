# CLAUDE.md — docCollector

Working document for development. Read this + README.md to get started.

## Spec Checklist

- [x] **SPEC-001**: Extension scaffold + side panel setup
- [x] **SPEC-002**: Content extraction engine
- [x] **SPEC-003**: Collection management UI
- [x] **SPEC-004**: Preview functionality
- [x] **SPEC-005**: Export engine (Markdown + PDF, single + multi-file)
- [x] **SPEC-006**: Options page (settings)
- [x] **SPEC-007**: Polish & error handling

## In Progress

All specs complete

## Workflow

1. Pick the next unchecked spec from the checklist
2. Read the spec file in `/docs/specs/`
3. Implement until all acceptance criteria pass
4. Verify using the spec's verification steps
5. Check off the spec in this file
6. Update README.md if architecture changed
7. Commit with message referencing spec
8. Repeat

## Rules

- **Always update this file** after completing work — don't just implement and forget
- **Always update README.md** if architecture, folder structure, or tech decisions change
- **Never leave commented-out code** — delete old code, don't comment it out
- **Never add "changelog" comments** in code — code reflects current state only
- **README and code should always reflect present state**, not history
- Git history is for history; files are for current truth

### Project-Specific Rules

- **Vendor libraries** — Copy Readability.js, Turndown.js, jsPDF, JSZip into `/src/lib/`. Don't reference CDNs.
- **No build step** — Keep it simple. No webpack, no transpilation.
- **Test on Salesforce Help** — This is the primary use case. Always verify extraction works there.
- **Test on shadow DOM sites** — Try GitHub, Salesforce Help, Lit element documentation.
- **Settings via chrome.storage.sync** — So they sync across devices.

## Notes

_Discoveries and gotchas will go here as development progresses._

- Readability.js needs a cloned document to avoid mutating the original
- Shadow DOM: use `element.shadowRoot` for open shadows; closed shadows are rare but exist
- Side Panel API requires `"side_panel"` permission in manifest
- Content scripts need `"scripting"` permission for programmatic injection
- Options page needs `"storage"` permission for chrome.storage.sync

## Quick Reference

### Load Extension
```
chrome://extensions/ → Developer mode → Load unpacked → select project folder
```

### Key Files
| File | Purpose |
|------|---------|
| `manifest.json` | Extension config |
| `src/sidepanel/sidepanel.js` | Main UI logic |
| `src/content/extractor.js` | Content extraction |
| `src/background/service-worker.js` | Message routing |
| `src/options/options.js` | Settings management |

### Message Types
| Message | Direction | Purpose |
|---------|-----------|---------|
| `ADD_PAGE` | sidepanel → service worker | Request extraction |
| `EXTRACT_CONTENT` | service worker → content script | Trigger extraction |
| `CONTENT_EXTRACTED` | content script → service worker → sidepanel | Return content |
| `GET_SETTINGS` | any → service worker | Fetch current settings |

### Settings Keys (chrome.storage.sync)
| Key | Type | Default |
|-----|------|---------|
| `maxPages` | number | 20 |
| `clearAfterExport` | boolean | true |

### Test URLs
- Salesforce Help: `https://help.salesforce.com/s/articleView?id=sf.admin_users.htm`
- GitHub (shadow DOM): `https://github.com`
- Lit docs: `https://lit.dev/docs/`

### Export Output Formats
| Format | Output | Filename |
|--------|--------|----------|
| MD + Single | `.md` file | `docCollector-2024-01-15.md` |
| MD + Separate | `.zip` with `.md` files | `docCollector-2024-01-15.zip` |
| PDF + Single | `.pdf` file | `docCollector-2024-01-15.pdf` |
| PDF + Separate | `.zip` with `.pdf` files | `docCollector-2024-01-15.zip` |
