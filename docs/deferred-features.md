# Deferred features

These shipped behind flags (or as unfinished UI) and were removed from the MVP `main` branch. Full source as of the split lives on `archive/pre-mvp-split`. Isolated branches:

| Branch | What it contains |
|---|---|
| `feature/odontogram` | Patient dental chart, API, settings notation, E2E |
| `feature/ai-notes` | Gemini “parse visit from text” + `/api/generate-notes` |
| `feature/ai-chat` | In-app clinic chat + `/api/chat` |
| `feature/messaging` | MSG91 WhatsApp/SMS APIs, send/history UI, spec |
| `feature/invoices` | Invoice/prescription PDF helpers + invoice number API |
| `feature/files-xrays` | Files tab + visit x-ray upload |
| `feature/logo-upload` | Clinic logo upload controls |
| `feature/patient-financials` | Patient detail Financials tab stub |

Schema tables (`patient_odontograms`, `patient_messages`) stay in `initializeDatabase()` so existing databases are unchanged. Re-introduce UI/API from the matching branch; do not drop those tables from main.

Take branches one at a time: rebase onto current `main`, finish the feature, add E2E, then merge.