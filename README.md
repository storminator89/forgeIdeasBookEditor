# 📖 AI-Bucherstellung | AI Book Creation

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![pnpm](https://img.shields.io/badge/pnpm-10+-E82443?style=for-the-badge&logo=pnpm)](https://pnpm.io/)

[**Deutsch**](#de-deutsch) | [**English**](#en-english)

---

<a name="de-deutsch"></a>
## 🇩🇪 Deutsch

Ein hochmodernes, KI-gestütztes Tool zur Planung, Erstellung und Verwaltung deiner literarischen Projekte. Von der ersten vagen Idee bis zum druckfertigen Manuskript unterstützt dich unsere Plattform mit intelligenten Assistenten und einem erstklassigen Schreib-Erlebnis.

### ✨ Hauptmerkmale

*   **🪄 KI Story Wizard**: Verwandle eine einfache Idee in ein tiefgreifendes Konzept. Die KI stellt dir gezielte Fragen, um Plot-Löcher zu schließen und Details auszuarbeiten.
*   **👥 Intelligentes Charakter-Management**: Erstelle komplexe Charaktere mit dem KI-Assistenten. Nutze Prompts wie "Mach sie mysteriöser" oder "Füge ein dunkles Geheimnis hinzu".
*   **📝 Premium Editor**: Ein ablenkungsfreier Schreibbereich basierend auf **TipTap**, optimiert für lange Manuskripte und strukturierte Planung.
*   **🌍 Konsistente Welterstellung**: Verwalte Handlungspunkte und Welt-Elemente in spezialisierten Modulen. Die KI behält den Überblick über deine gesamte Welt.
*   **📄 Hochwertiger PDF-Export**: Exportiere dein Buch in professionellem A4-Format, bereit für Lektoren oder den Eigenverlag.

---

<a name="en-english"></a>
## 🇺🇸 English

A state-of-the-art, AI-powered toolkit for planning, creating, and managing your literary projects. From the first spark of an idea to a polished manuscript, our platform supports you with intelligent assistants and a premium writing experience.

### ✨ Key Features

*   **🪄 AI Story Wizard**: Transform a simple spark into a deep concept. The AI asks targeted questions to fill plot holes and flesh out details.
*   **👥 Intelligent Character Management**: Create complex characters with the AI Assistant. Use prompts like "Make them more mysterious" or "Add a tragic backstory".
*   **📝 Premium Editor**: A distraction-free writing environment powered by **TipTap**, optimized for long manuscripts and structured planning.
*   **🌍 Consistent World Building**: Manage plot points and world elements in dedicated modules. The AI stays aware of your entire fictional universe.
*   **📄 High-Quality PDF Export**: Export your book in professional A4 format, ready for editors or self-publishing.

---

## 🛠 Tech Stack

| Frontend | Backend | Database | Tools |
| :--- | :--- | :--- | :--- |
| **Next.js 15 (App Router)** | **Next.js API Routes** | **Prisma ORM** | **pnpm Workspaces** |
| **React 19** | **Node.js 20+** | **SQLite** | **shadcn/ui** |
| **Tailwind CSS** | **OpenAI / Local LLM** | | **Lucide Icons** |

---

## 🚀 Erste Schritte / Getting Started

### Voraussetzungen / Prerequisites
*   **Node.js** (v20+)
*   **pnpm** (Recommended)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone [your-repo-url]
    cd bucherstellung
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Setup Database:**
    ```bash
    pnpm db:push
    ```

4.  **Run Development Server:**
    ```bash
    pnpm dev
    ```
    Access the app at `http://localhost:3001`.

---

## 🛠 Commands

| Command | Description |
| :--- | :--- |
| `pnpm install` | Install all dependencies |
| `pnpm dev` | Start development servers |
| `pnpm db:push` | Push Prisma schema to database |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm check-types` | Run TypeScript validation |

## 📁 Projektstruktur / Project Structure

```text
.
├── apps/
│   └── web/          # Next.js Web Application
├── packages/
│   ├── db/           # Prisma schema & Database Client
│   ├── env/          # Central Environment Configuration
│   └── config/       # Shared configurations (Linting, etc.)
└── public/
    └── uploads/      # Character images & Media
```

---

## ⚙️ KI-Konfiguration / AI Configuration

Gehe in der App zu den **Einstellungen** (`/settings`) / Navigate to **Settings** (`/settings`) in the app and configure:
*   **API Endpoint**: (e.g., OpenAI or Local LLM)
*   **API Key**: Your secret key
*   **Model Name**: (e.g., `gpt-4o`, `claude-3-5-sonnet`)

---

Erstellt mit ❤️ für die Autoren von Morgen. | Created with ❤️ for the authors of tomorrow.
