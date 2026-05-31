# Docker Deployment / Docker-Bereitstellung

[**Deutsch**](#de-deutsch) | [**English**](#en-english)

---

<a name="de-deutsch"></a>

## Deutsch

### Schnellstart

```bash
docker compose up -d
```

Die App ist dann unter `http://localhost:3002` erreichbar (Port 3000 im Container, 3002 am Host).

### Image bauen

```bash
docker compose build
```

### Umgebungsvariablen

| Variable | Pflicht | Beschreibung | Standardwert |
|----------|---------|--------------|--------------|
| `DATABASE_URL` | Ja | Pfad zur SQLite-Datei | `file:/app/data/dev.db` |
| `CORS_ORIGIN` | Nein | Erlaubte CORS-Origin | `http://localhost:3002` |
| `NODE_ENV` | Nein | Umgebung | `production` |
| `PORT` | Nein | Server-Port | `3000` |
| `HOSTNAME` | Nein | Server-Bind-Adresse | `0.0.0.0` |

### Persistente Daten

| Volume | Container-Pfad | Zweck |
|--------|---------------|-------|
| `app-data` | `/app/data` | SQLite-Datenbank |
| `app-uploads` | `/app/public/uploads` | Hochgeladene Bilder |

### Befehle

```bash
# Starten
docker compose up -d

# Stoppen
docker compose down

# Logs anzeigen
docker compose logs -f web

# Nach Code-Änderungen neu bauen
docker compose build --no-cache
docker compose up -d

# Shell-Zugang
docker compose exec web sh
```

### Sicherung (Backup)

```bash
# Datenbank sichern
docker compose exec web cat /app/data/dev.db > backup.db

# Uploads sichern
docker run --rm -v forgeIdeasBookEditor_app-uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz -C /data .
```

### Fehlerbehebung

**Container startet nicht:**
```bash
docker compose logs web
```

**Datenbank zurücksetzen:**
```bash
docker compose down
docker volume rm forgeIdeasBookEditor_app-data
docker compose up -d
```

---

<a name="en-english"></a>

## English

### Quick Start

```bash
docker compose up -d
```

The app will be available at `http://localhost:3002` (port 3000 inside container, 3002 on host).

### Build the Image

```bash
docker compose build
```

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | SQLite file path | `file:/app/data/dev.db` |
| `CORS_ORIGIN` | No | CORS origin URL | `http://localhost:3002` |
| `NODE_ENV` | No | Environment mode | `production` |
| `PORT` | No | Server port | `3000` |
| `HOSTNAME` | No | Server bind address | `0.0.0.0` |

### Persistent Data

| Volume | Container Path | Purpose |
|--------|---------------|---------|
| `app-data` | `/app/data` | SQLite database |
| `app-uploads` | `/app/public/uploads` | User-uploaded images |

### Commands

```bash
# Start
docker compose up -d

# Stop
docker compose down

# View logs
docker compose logs -f web

# Rebuild after code changes
docker compose build --no-cache
docker compose up -d

# Shell access
docker compose exec web sh
```

### Backup

```bash
# Backup database
docker compose exec web cat /app/data/dev.db > backup.db

# Backup uploads
docker run --rm -v forgeIdeasBookEditor_app-uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz -C /data .
```

### Troubleshooting

**Container won't start:**
```bash
docker compose logs web
```

**Reset database:**
```bash
docker compose down
docker volume rm forgeIdeasBookEditor_app-data
docker compose up -d
```
