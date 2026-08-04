# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Development server with nodemon auto-reload
npm start        # Production server

# Utility scripts
node scripts/migrate-package-index.js
node scripts/backfill-employee-users.js
```

No build, test, or lint scripts are configured.

## Architecture

**Node.js/Express backend** using ES modules (`"type": "module"`). Server-side rendered views via EJS. Serves as the admin panel and API for a digital namecard/business card platform ("mynamecard").

**Entry point**: `App.js`

**Tech stack**: Express, MongoDB/Mongoose, JWT auth, EJS templating, Stripe/PayPal payments, Telegram Bot, FCM push notifications, Multer file uploads, Swagger API docs.

## Directory Structure

| Directory | Purpose |
|-----------|---------|
| `Controllers/` | Business logic — class-based with static methods |
| `Models/` | Mongoose schemas (~57 collections) |
| `Routes/` | Express routes grouped by domain: Admin, User, Partner, Enterprise, Advertisement |
| `Middleware/` | Role-based auth middleware |
| `Views/` | EJS templates for admin dashboard UI |
| `Utils/` | Background jobs, email, Telegram bot, cron tasks |
| `Db/` | MongoDB connection setup |
| `Config.js` | Path and URL configuration |
| `Common.js` | Shared utilities: encryption, validation helpers, `setImageUrl()` |

## Auth System

Multi-role JWT authentication. Tokens are stored in the database for validation.

- `isUser` — Bearer token in Authorization header, validated against User collection
- `isAdmin` — Checks session, cookie, or Authorization header (priority order); validated against AdminToken collection
- `isEnterprise`, `isOperator`, `isPartner`, `isMaster` — similar pattern per role

## Key Patterns

**Controllers**: Class-based with static async methods.
```js
class UserController {
  static async Register(req, res) { ... }
}
```

**Validation**: `node-input-validator` with schema rules.
```js
let validator = new Validator(req.body, { email: "required|email" })
let matched = await validator.check()
```

**Image URLs**: Models use Mongoose getters (`setImageUrl()`) to construct full asset URLs from stored relative paths.

**Encryption**: AES-256-CTR in `Common.js` for data encryption; bcrypt for password hashing.

**Background jobs**: `node-cron` for membership expiry, ad config initialization. Telegram bot initialized at startup.

## Enterprise Module

Hierarchical user structure: User → EnterpriseAdmin → Operator → Employees. Credit-based system for operators. `EmployeeNamecard` model stores employee profile/template data.

## Payment Integrations

Stripe, PayPal, USDT, and Telegram Stars — each has separate models and controller logic. Payment status tracked in DB.

## Environment

Key `.env` variables: `DATABASE_URL`, `DBNAME`, `JWT_SECRET_KEY`, `ACCESS_TOKEN_LIFE`, `BASE_URL`, Stripe keys, Telegram bot token, FCM config.
