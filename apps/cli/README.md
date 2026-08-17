# FuneralAcademy CLI

The official [FuneralAcademy](https://funeralacademy.app) CLI — deploy, manage, and operate your FuneralAcademy instance.

[Website](https://funeralacademy.app) | [Documentation](https://docs.learnhouse.app) | [GitHub](https://github.com/learnhouse/learnhouse)

<img width="915" height="871" alt="image" src="https://github.com/user-attachments/assets/957c6cea-3efb-4cab-a643-55df3ac4c6aa" />

## Quick Start

### One-line install

**macOS / Linux:**

```bash
curl -fsSL https://raw.githubusercontent.com/learnhouse/learnhouse/main/apps/cli/install.sh | bash
```

**Windows (PowerShell):**

```powershell
irm https://raw.githubusercontent.com/learnhouse/learnhouse/main/apps/cli/install.ps1 | iex
```

### Using npx

```bash
npx funeralacademy@latest setup
```

### Install a specific version

```bash
npx funeralacademy@1.0.0 setup
```

## Requirements

- **Node.js** >= 18
- **Docker**

## Commands

| Command | Description |
|---------|-------------|
| `funeralacademy setup` | Interactive setup wizard |
| `funeralacademy start` | Start all services |
| `funeralacademy stop` | Stop all services |
| `funeralacademy update` | Update to the latest version |
| `funeralacademy update --version <x.y.z>` | Update to a specific version |
| `funeralacademy logs` | Stream service logs |
| `funeralacademy config` | Show current configuration |
| `funeralacademy status` | Show service status |
| `funeralacademy health` | Run health checks |
| `funeralacademy backup` | Backup database |
| `funeralacademy restore <archive>` | Restore database from a backup |
| `funeralacademy deployments` | View deployments and set resource limits |
| `funeralacademy doctor` | Diagnose common issues |
| `funeralacademy shell` | Open a shell in a running container |
| `funeralacademy env` | Edit environment variables |
| `funeralacademy dev` | Start local development environment |

## Setup

The setup wizard walks through:

1. **Install directory** — where files are generated
2. **Domain** — hostname, port, HTTPS/SSL
3. **Database & Redis** — local (Docker) or external
4. **Organization** — name for your instance
5. **Admin account** — email and password
6. **Features** — AI, email, S3, OAuth, Unsplash

You can go back to any step, and edit from the summary before confirming.

## Updating

```bash
# Back up first
npx funeralacademy backup

# Update to latest
npx funeralacademy update

# Or a specific version
npx funeralacademy update --version 1.2.0
```

The update command pulls the new image, restarts services, and asks if you want to run database migrations. Check [docs.learnhouse.app](https://docs.learnhouse.app) for migration guides before proceeding.

## Generated Files

```
funeralacademy/
  docker-compose.yml       # Service definitions
  .env                     # Configuration
  funeralacademy.config.json   # CLI metadata
  extra/
    nginx.prod.conf        # Reverse proxy (or Caddyfile for auto-SSL)
```

## CI / Non-interactive Mode

All commands support non-interactive usage for CI pipelines:

```bash
# Setup without prompts
npx funeralacademy setup --ci \
  --name production \
  --domain example.com \
  --port 80 \
  --admin-email admin@example.com \
  --admin-password secretpass123

# Update with auto-migration
npx funeralacademy update --version 1.2.0 --migrate

# Update without migrations
npx funeralacademy update --no-migrate

# Setup without starting services
npx funeralacademy setup --ci --admin-password pass123 --no-start
```

## Testing

```bash
# Unit tests (no Docker required)
bun run test

# E2E tests (requires Docker)
bun run test:e2e

# All tests
bun run test:all
```

**Unit tests** cover template generation (docker-compose, .env, nginx, caddyfile) and config store operations.

**E2E tests** run the full lifecycle with real Docker containers: setup → start → status → health → doctor → stop → restart. They use `--ci` mode to run without prompts.

**Not yet tested:**
- Interactive commands (backup create/restore, env editor, shell, deployments scaling)
- `update` with actual version swap between two published images
- `update --migrate` with pending Alembic migrations
- `logs` (streams indefinitely)
- `dev` mode (requires full monorepo source)
- Multi-installation discovery (`findInstallDir` with multiple `~/.funeralacademy/*` entries)
- Error recovery (Docker daemon down, port conflicts, corrupted config)

## License

GPL-3.0
