# API Integration for Valysco.com

Dette dokumentet forklarer hvordan du bruker API-integrasjonen i `valysco.com` frontend.

## 📁 Filer

- `api-integration.js` - JavaScript utility for API-kall
- `app/api-example.html` - Eksempel side som viser hvordan API brukes
- `INTEGRATION_SETUP.md` - Detaljert setup guide

## 🚀 Rask Start

### 1. Start Backend

```bash
cd ../investor-plattform-main/mcp-server
npm install
npm run dev
```

### 2. Test i Browser

1. Åpne `app/api-example.html` i nettleseren
2. Sjekk at backend kjører ved å klikke "Check Backend Health"
3. Test API-kall med ekte data

## 💻 Bruk i egne HTML-filer

### Steg 1: Inkluder API utility

```html
<head>
  <script>
    // Sett backend URL
    window.BACKEND_URL = 'http://localhost:3001';
  </script>
  <script src="../api-integration.js"></script>
</head>
```

### Steg 2: Bruk API-funksjoner

```javascript
// Health check
async function checkBackend() {
  const isHealthy = await window.ValyscoAPI.checkBackendHealth();
  console.log('Backend healthy:', isHealthy);
}

// Get insights for a company
async function loadInsights(companyId) {
  try {
    const data = await window.ValyscoAPI.getInsights(companyId);
    console.log('Insights:', data.insights);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Get investor company data
async function loadInvestorData(token) {
  try {
    const data = await window.ValyscoAPI.getInvestorCompany(token);
    console.log('Company:', data.company);
    console.log('Insights:', data.company.latest_insights);
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

## 📡 Tilgjengelige API-funksjoner

### `checkBackendHealth()`
Sjekker om backend serveren kjører.

**Returns:** `Promise<boolean>`

### `getInsights(companyId)`
Henter AI-genererte innsikter for et selskap.

**Parameters:**
- `companyId` (string) - UUID for selskapet

**Returns:** `Promise<{ok: boolean, insights: string[], generatedAt: string|null}>`

### `getInvestorCompany(token)`
Henter bedriftsdata for investor-view basert på token.

**Parameters:**
- `token` (string) - Investor access token

**Returns:** `Promise<{company: object, linkMeta: object}>`

### `generateProfile(data)`
Genererer bedriftsprofil basert på input.

**Parameters:**
- `data` (object) - `{name?, industry?, website_url?, linkedin_urls?}`

**Returns:** `Promise<object>`

### `getMockData(companyId)`
Henter mock data for testing.

**Parameters:**
- `companyId` (string) - UUID for selskapet

**Returns:** `Promise<object>`

## 🔧 Konfigurasjon

### Backend URL

Sett `window.BACKEND_URL` før du inkluderer `api-integration.js`:

```javascript
// Development
window.BACKEND_URL = 'http://localhost:3001';

// Production
window.BACKEND_URL = 'https://your-backend.railway.app';
```

## 🐛 Troubleshooting

### CORS Errors

Hvis du får CORS-feil, sjekk at `CORS_ORIGIN` i backend `.env` er satt riktig:

```env
# For statiske HTML-filer (file://)
CORS_ORIGIN=*

# For Astro dev server
CORS_ORIGIN=http://localhost:4321

# For produksjon
CORS_ORIGIN=https://valysco.com
```

### Connection Refused

- Sjekk at backend kjører: `curl http://localhost:3001/health`
- Sjekk at `window.BACKEND_URL` er riktig satt
- Sjekk at port 3001 ikke er blokkert av firewall

### 401 Unauthorized

- Dette er for protected endpoints (`/tools/*`)
- De fleste frontend-endepunkter er public (`/api/*`)
- Du trenger `x-mcp-secret` header kun for protected endpoints

## 📚 Mer Informasjon

- Se `INTEGRATION_SETUP.md` for detaljert setup
- Se `../investor-plattform-main/mcp-server/API_DOCUMENTATION.md` for full API dokumentasjon
- Se `app/api-example.html` for komplett eksempel
