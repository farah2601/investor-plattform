# Assets Directory

## Signaturer

For at signaturer skal vises korrekt, legg følgende filer i denne mappen:

- `signature-david.png` - Original signatur for David
- `signature-david-white.png` - Hvit versjon av David's signatur
- `signature-farax.png` - Original signatur for Farax
- `signature-farax-white.png` - Hvit versjon av Farax's signatur

### Generere hvite versjoner

Hvis du har de originale PNG-filene, kan du bruke `process_signatures.py` scriptet for å generere de hvite versjonene:

```bash
cd ../scripts
python process_signatures.py
```

Scriptet vil automatisk prosessere `signature-david.png` og `signature-farax.png` og lage de hvite versjonene i `assets/` mappen.
