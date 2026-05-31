# AI-Bucherstellung | AI Book Creation

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![pnpm](https://img.shields.io/badge/pnpm-10+-E82443?style=for-the-badge&logo=pnpm)](https://pnpm.io/)

[**Deutsch**](#de-deutsch) | [**English**](#en-english)

---

<a name="de-deutsch"></a>

## Deutsch

Ein KI-gestütztes Tool zur Planung, Erstellung und Verwaltung literarischer Projekte. Von der ersten Idee bis zum druckfertigen Manuskript.

### Hauptmerkmale

- **KI Story Wizard** -- Verwandle eine Idee in ein Konzept. Die KI stellt Fragen, um Plot-Löcher zu schließen.
- **Charakter-Management** -- Erstelle komplexe Charaktere mit KI-Unterstützung.
- **Premium Editor** -- Ablenkungsfreier Schreibbereich basierend auf TipTap.
- **Welterstellung** -- Verwalte Handlungspunkte und Welt-Elemente.
- **PDF-Export** -- Exportiere dein Buch in professionellem A4-Format.

---

<a name="en-english"></a>

## English

An AI-powered toolkit for planning, creating, and managing literary projects. From the first idea to a polished manuscript.

### Key Features

- **AI Story Wizard** -- Transform an idea into a concept. The AI asks questions to fill plot holes.
- **Character Management** -- Create complex characters with AI assistance.
- **Premium Editor** -- Distraction-free writing environment powered by TipTap.
- **World Building** -- Manage plot points and world elements.
- **PDF Export** -- Export your book in professional A4 format.

---

## Voraussetzungen / Prerequisites

- **Node.js** v20 oder höher
- **pnpm** 10+ (wird als Package Manager verwendet)
- **Turso CLI** (optional, für lokale Datenbank-Entwicklung)

pnpm installieren (falls nicht vorhanden):
```bash
npm install -g pnpm
```

---

## Installation

### 1. Repository klonen

```bash
git clone [your-repo-url]
cd forgeIdeasBookEditor
```

### 2. Dependencies installieren

```bash
pnpm install
```

### 3. Umgebungsvariablen einrichten

Die App benötigt eine `.env`-Datei im Verzeichnis `apps/web/`. Erstelle diese aus der Vorlage:

```bash
cp apps/web/.env.example apps/web/.env
```

Falls keine `.env.example` vorhanden ist, erstelle `apps/web/.env` mit folgendem Inhalt:

```env
# Datenbankpfad (relativ zum packages/db Verzeichnis)
DATABASE_URL="file:../../packages/db/dev.db"

# CORS Origin (optional, Standard: http://localhost:3001)
# CORS_ORIGIN="http://localhost:3001"
```

#### Verfügbare Umgebungsvariablen

| Variable | Pflicht | Beschreibung | Standardwert |
|----------|---------|--------------|--------------|
| `DATABASE_URL` | Ja | Pfad zur SQLite-Datenbank | -- |
| `CORS_ORIGIN` | Nein | Erlaubte CORS-Origin | `http://localhost:3001` |
| `NODE_ENV` | Nein | Umgebung (`development`, `production`, `test`) | `development` |

### 4. Datenbank einrichten

```bash
pnpm db:push
```

Dies erstellt die SQLite-Datenbank und synchronisiert das Prisma-Schema. Der Prisma-Client wird automatisch generiert.

### 5. Entwicklungsserver starten

```bash
pnpm dev
```

Die App ist unter `http://localhost:3001` erreichbar.

---

## KI-Konfiguration / AI Configuration

Die KI-Funktionen benötigen einen OpenAI-kompatiblen API-Endpunkt. Konfiguriere diesen in der App unter **Einstellungen** (`/settings`):

1. **API Endpoint** -- URL des KI-Providers (z.B. `https://api.openai.com/v1` oder `http://localhost:11434/v1` für Ollama)
2. **API Key** -- Dein API-Schlüssel
3. **Modell** -- Klicke auf "Modelle laden" um verfügbare Modelle vom Endpunkt abzurufen, oder gib einen Modellnamen manuell ein

### Unterstützte Provider

| Provider | Endpoint-URL | Beispiel-Modelle |
|----------|-------------|------------------|
| OpenAI | `https://api.openai.com/v1` | gpt-4o, gpt-4o-mini |
| Anthropic (via Proxy) | `https://api.anthropic.com/v1` | claude-3-5-sonnet |
| Ollama (lokal) | `http://localhost:11434/v1` | llama3, mistral |
| LM Studio (lokal) | `http://localhost:1234/v1` | beliebige GGUF-Modelle |
| OpenRouter | `https://openrouter.ai/api/v1` | diverse Modelle |

---

## Befehle / Commands

| Befehl | Beschreibung |
|--------|--------------|
| `pnpm install` | Alle Dependencies installieren |
| `pnpm dev` | Alle Dev-Server starten (Web auf Port 3001) |
| `pnpm dev:web` | Nur die Next.js App starten |
| `pnpm build` | Alle Workspaces bauen |
| `pnpm check-types` | TypeScript-Prüfung |
| `pnpm db:push` | Prisma-Schema auf DB anwenden |
| `pnpm db:generate` | Prisma-Client generieren |
| `pnpm db:studio` | Prisma Studio öffnen |
| `pnpm db:local` | Lokale SQLite via Turso dev starten |

---

## Projektstruktur / Project Structure

```text
.
├── apps/
│   └── web/                  # Next.js Web App (App Router)
│       ├── src/
│       │   ├── app/          # Seiten & API-Routen
│       │   ├── components/   # UI-Komponenten
│       │   └── lib/          # Hilfsfunktionen
│       ├── public/           # Statische Assets
│       └── .env              # Umgebungsvariablen (wird hier gespeichert!)
├── packages/
│   ├── db/                   # Prisma Schema & Datenbank-Client
│   │   ├── prisma/
│   │   │   ├── schema/       # Prisma-Schema-Dateien
│   │   │   └── generated/    # Generierter Prisma-Client
│   │   └── dev.db            # SQLite-Datenbank (lokal)
│   ├── env/                  # Zentrale Env-Validierung
│   └── config/               # Shared TypeScript-Konfiguration
└── pnpm-workspace.yaml       # Workspace-Konfiguration
```

---

## Häufige Probleme / Troubleshooting

### "no such table: global_settings"

Die Datenbank existiert noch nicht oder ist leer. Führe aus:
```bash
pnpm db:push
```

### Prisma Client Fehler nach Schema-Änderung

```bash
pnpm db:generate
```

### "Invalid environment variables"

Stelle sicher, dass `apps/web/.env` existiert und `DATABASE_URL` gesetzt ist. Siehe Abschnitt [Umgebungsvariablen einrichten](#3-umgebungsvariablen-einrichten).

### Port 3001 bereits beendet

Ändere den Port in `apps/web/package.json` im `dev`-Script oder stoppe den anderen Prozess.

---

Erstellt mit Liebe für die Autoren von Morgen.
