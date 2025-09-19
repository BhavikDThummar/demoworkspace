# 🌍 Environment Configuration Guide

This document explains the **environment files structure, purpose, and usage** for the `bomdemoapi` application.  
It ensures **secure handling of secrets** and provides a **clear workflow for development, production, and onboarding.**

---

## 📁 Root Level Environment Files

**Location:** `apps/bomdemoapi/`

| File               | Purpose                           | Usage                                             | Git Status                   | Contains                             |
| ------------------ | --------------------------------- | ------------------------------------------------- | ---------------------------- | ------------------------------------ |
| `.env`             | Personal development environment  | Your local overrides & secrets during development | ❌ Ignored (in `.gitignore`) | Real credentials (DB URLs, API keys) |
| `.env.example`     | Documentation template            | Reference for new developers                      | ✅ Committed                 | Placeholder values & comments        |
| `.env.development` | Team-shared development defaults  | Loaded when `NODE_ENV=development`                | ✅ Committed                 | Safe dev URLs, debug flags           |
| `.env.production`  | Production configuration template | Reference for production deployment               | ✅ Committed                 | Empty placeholders (no secrets)      |

---

## 📁 TypeScript Environment Modules

**Location:** `apps/bomdemoapi/src/environments/`

| File                  | Purpose                                      | Usage                                        | Key Features                                                   |
| --------------------- | -------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| `environment.ts`      | Development environment configuration module | Imported during `nx serve bomdemoapi`        | Type-safe access, fallback defaults, value parsing             |
| `environment.prod.ts` | Production environment configuration module  | Imported during `nx build bomdemoapi` (prod) | Strict validation, no fallbacks, production-optimized settings |

---

## ⚡ Loading Priority & Flow

Environment variables are loaded in the following order (highest to lowest priority):

```mermaid
graph TD
    A[.env.local (optional)] --> B[.env]
    B --> C{NODE_ENV}
    C -->|development| D[.env.development]
    C -->|production| E[.env.production]
    D --> F[environment.ts]
    E --> G[environment.prod.ts]
```

- **.env.local** → optional local overrides (if present)
- **.env** → your personal developer secrets
- **.env.development / .env.production** → shared defaults based on `NODE_ENV`
- **environment.ts / environment.prod.ts** → TypeScript config objects used in the app

---

## 🎯 Usage Scenarios

### 🧑‍💻 Development Workflow

```bash
nx serve bomdemoapi
# Loads: .env → .env.development → environment.ts
```

### 🚀 Production Deployment

```bash
NODE_ENV=production nx build bomdemoapi
# Loads: real production environment variables → environment.prod.ts
```

### 👥 Team Onboarding

```bash
cp .env.example .env
# Then customize .env with your local database credentials
```

---

## 🔒 Security Model

- **`.env`** – Contains your actual secrets (database passwords, API keys) → **Never committed**
- **`.env.example`** – Safe to share (placeholder values only)
- **`.env.development`** – Safe team defaults for development
- **`.env.production`** – Template for deployment environments (contains no real secrets)

This multi-layered approach gives you:

✅ Security of sensitive data  
✅ Flexibility for multiple environments  
✅ A smooth onboarding experience for new developers

---

## 📌 Tips

- Always **create/update `.env.example`** when you add new environment variables.
- Keep `.env` files **out of version control** (`.gitignore` protected).
- Ensure **deployment platform sets production secrets** via environment variables.

---

> **Note:** This documentation applies specifically to `apps/bomdemoapi/` inside the Nx workspace.
