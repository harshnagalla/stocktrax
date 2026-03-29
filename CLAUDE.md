# StockTrax

## Package Manager

Use `yarn` (not npm).

## Data Sources

- **Primary:** Yahoo Finance (unofficial, no API key, unlimited)
- **Fallback:** Twelve Data API — key in `NEXT_PUBLIC_TWELVE_DATA_API_KEY` env var
- **Analysis:** Gemini API — key in `GEMINI_API_KEY` env var (server-side only)

## API Keys

All keys go in `.env.local`. Never commit `.env.local`.
- `NEXT_PUBLIC_` prefix = client-side accessible
- Without prefix = server-side only (API routes)
