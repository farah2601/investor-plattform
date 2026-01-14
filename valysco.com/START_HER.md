# 🚀 Start Her - Steg-for-steg Guide

## Steg 1: Start Backend Server ✅

Backend serveren er nå startet! Den kjører på `http://localhost:3001`

## Steg 2: Test Backend

Åpne en ny terminal og test:

```powershell
curl http://localhost:3001/health
```

Du skal se: `{"ok":true}`

## Steg 3: Test Frontend Integrasjon

### Alternativ A: Bruk Eksempel Siden

1. **Åpne filen i nettleseren:**
   - Naviger til: `valysco.com/app/api-example.html`
   - Høyreklikk på filen → "Open with" → Velg nettleser (Chrome/Edge/Firefox)

2. **Test funksjonene:**
   - Klikk "Check Backend Health" - skal vise ✅
   - Test "Get Insights" med en Company UUID
   - Test "Get Investor Data" med en Investor Token

### Alternativ B: Åpne direkte i nettleser

1. **I nettleseren, gå til:**
   ```
   file:///C:/Users/david/OneDrive/valysco.com/valysco.com/app/api-example.html
   ```

2. **Eller dra filen** `api-example.html` inn i nettleseren

## Steg 4: Bruk i egne HTML-filer

Hvis du vil bruke API i dine egne filer, legg til dette i `<head>`:

```html
<script>
  window.BACKEND_URL = 'http://localhost:3001';
</script>
<script src="../api-integration.js"></script>
```

Deretter kan du bruke:

```javascript
// Eksempel: Hent insights
async function loadInsights() {
  const data = await window.ValyscoAPI.getInsights('company-uuid-here');
  console.log(data);
}
```

## 🛑 Stoppe Backend

For å stoppe backend serveren:
- Trykk `Ctrl+C` i terminalen hvor backend kjører
- Eller lukk terminalvinduet

## 🐛 Problemer?

### Backend starter ikke
- Sjekk at `.env` filen eksisterer i `mcp-server/`
- Sjekk at port 3001 ikke er opptatt
- Kjør `npm install` hvis det mangler avhengigheter

### CORS errors i nettleseren
- Sjekk at `CORS_ORIGIN=*` er satt i `mcp-server/.env`
- For statiske HTML-filer må CORS_ORIGIN være `*`

### Connection refused
- Sjekk at backend faktisk kjører
- Sjekk at `window.BACKEND_URL` er satt til `http://localhost:3001`

## 📚 Mer Hjelp

- Se `INTEGRATION_SETUP.md` for detaljert dokumentasjon
- Se `README_API_INTEGRATION.md` for API-detaljer
- Se `app/api-example.html` for komplett eksempel
