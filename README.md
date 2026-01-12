# AI-Bucherstellung (Book-Creation)

Ein KI-gestütztes Tool zur Erstellung, Planung und Verwaltung von Buchprojekten. Von der ersten Idee bis zum fertigen Manuskript.

![Preview Placeholder](/public/uploads/preview.png)

## 🚀 Features

### 🪄 AI Story Wizard
- **Interaktive Ideenfindung:** Beschreibe deine Story-Idee und lass dir von der KI gezielte Fragen stellen, um das Konzept zu vertiefen.
- **Automatische Generierung:** Erstellt auf Knopfdruck Charaktere, Handlungspunkte (Plot Points) und Welt-Elemente, die perfekt aufeinander abgestimmt sind.

### 👥 Charakter-Management
- **KI-Charakter-Assistent:** Erstelle neue Charaktere oder verbessere bestehende mittels KI-Prompts ("Mach ihn mysteriöser", "Füge eine tragische Hintergrundgeschichte hinzu").
- **Kontext-Awareness:** Die KI berücksichtigt alle bestehenden Charaktere und den Buchkontext für maximale Konsistenz.
- **Visuelle Identität:** Foto-Upload für Charaktere und editierbare KI-Vorschauen.

### 📝 Editor & Planung
- **Rich Text Editor:** Ein moderner TipTap-basierter Editor für deine Kapitel.
- **Strukturierte Planung:** Verwalte Handlungspunkte und Welt-Elemente in eigenen Tabs.
- **Globale Einstellungen:** Zentrale Konfiguration für KI-Modelle und API-Keys (OpenAI-kompatibel).

## 🛠 Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS.
- **UI-Komponenten:** shadcn/ui, Lucide Icons.
- **Editor:** TipTap (Headless Framework).
- **Backend:** Next.js API Routes.
- **Datenbank:** Prisma ORM mit SQLite.
- **Infrastruktur:** pnpm Workspaces (Monorepo).

## 📁 Projektstruktur

- `apps/web`: Die Next.js Web-Applikation.
- `packages/db`: Prisma-Schema und Datenbank-Client.
- `public/uploads`: Speicherort für hochgeladene Charakter-Bilder.

## 🏁 Erste Schritte

### Voraussetzungen
- Node.js (v20+)
- pnpm

### Installation

1. Abhängigkeiten installieren:
   ```bash
   pnpm install
   ```

2. Datenbank einrichten:
   ```bash
   pnpm db:push
   ```

3. Entwicklungsserver starten:
   ```bash
   pnpm dev
   ```
   Die App ist dann unter `http://localhost:3001` erreichbar.

### KI Konfiguration

Gehe in der App zu den **Einstellungen** (/settings) und hinterlege:
- API-Endpunkt (z.B. OpenAI oder Local LLM)
- API-Key
- Modell-Name (z.B. gpt-4o)

## 📖 Nutzung

1. **Neues Buch:** Wähle zwischen "Manuell" oder dem "KI-Assistenten".
2. **Wizard:** Beantworte die Fragen der KI, um eine solide Basis für dein Buch zu schaffen.
3. **Schreiben:** Nutze den Editor und lass dich in den Tabs "Charaktere", "Handlung" und "Welt" von deinen Notizen inspirieren.

---
Erstellt mit ❤️ für Autoren.
