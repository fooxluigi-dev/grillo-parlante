# 🦗 Grillo — App (Expo)

**Grillo** è l'app che trasforma lo screenshot di una prenotazione in un viaggio organizzato: estrae i dati dal screenshot con AI, genera itinerari personalizzati e parla con te in modo cinematografico.

> **App principale del progetto Grillo** — React Native / Expo SDK 57.

## ✨ Funzionalità

- 📸 **Upload prenotazione da screenshot** — il flusso principale: screenshot → OCR → parsing → itinerario
- 🤖 **AI integrata** — estrazione dati (hotel, date, ospiti) e generazione itinerari
- 💬 **Chat con l'assistente** — domande sul viaggio, risposte contestuali
- 🗺️ **Itinerario personalizzato** — basato su destinazione, hotel, ospiti e date reali
- 🔐 **Auth Supabase** — profili utente e viaggi salvati nel cloud
- 🌗 **Tema scuro** con accento dorato

## 🚀 Avvio

```bash
npm install
npm start          # Expo dev server (QR per il telefono)
npm run ios        # Simulatore iOS
npm run android    # Emulatore Android
npm run web        # Versione web
```

## 🔑 Variabili d'ambiente (`.env`)

| Variabile | Descrizione |
|:--|:--|
| `EXPO_PUBLIC_SUPABASE_URL` | URL del progetto Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Chiave anon Supabase (pubblica) |
| `EXPO_PUBLIC_API_URL` | Base URL del backend AI (proxy Vercel) |

## 🏗️ Architettura

```
grillo-app/
├── App.js                 # Entry point + navigazione
├── screens/               # Schermate (home, upload, dashboard, chat)
├── components/            # Componenti riutilizzabili
├── context/               # AuthContext (Supabase auth)
├── config/                # Configurazione
├── public/                # Statici web
└── supabase-schema.sql    # Schema database (profiles + trips)
```

**Pipeline screenshot → itinerario:**

```
Screenshot → readAsDataURL (raw, no canvas) → API parse-booking
  → GPT-4o vision (OCR primario) → OCR.space (fallback) → DeepSeek (JSON)
  → Dati strutturati → API itinerary → Itinerario personalizzato
```

## 🌐 Deploy

- **Repo GitHub**: `fooxluigi-dev/grillo-parlante`
- **Vercel**: push su `main` → auto-deploy su `grillo-parlante`
- Build web: `npm run build` (Expo export)

## 📦 Backend

Il backend API vive nel repo separato: [fooxluigi-dev/grillo-parlante-api](https://github.com/fooxluigi-dev/grillo-parlante-api)

## 📄 Licenza

Tutti i diritti riservati — Grillo © 2026.
