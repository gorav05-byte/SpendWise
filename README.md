# SpendWise - Personal Expense Management System

SpendWise is a full-stack web application for tracking income and expenses, setting monthly budgets,
viewing analytics and printing monthly reports. Everything runs **locally on your computer**: no cloud
database, no external APIs, no CDN links and no internet connection needed after `npm install`.

## Technology

| Part | Technology |
| --- | --- |
| Frontend | HTML5, CSS3, vanilla JavaScript, Chart.js (installed with npm and served locally) |
| Backend | Node.js, Express.js, REST API |
| Authentication | JWT stored in an HTTP-only cookie, passwords hashed with bcryptjs |
| Database | SQLite through better-sqlite3 (file is created automatically) |
| Validation | express-validator (server) plus form checks in the browser |
| Config | dotenv |

## Quick start

You need **Node.js 18 or newer** (the current LTS version is recommended). Check with `node -v`.

```bash
# 1. open a terminal inside the SpendWise folder
cd SpendWise

# 2. install dependencies (needs internet, only this one time)
npm install

# 3. start the app
npm start
```

Then open **http://localhost:3000** in your browser, click **Get Started**, and create an account.

On the first start SpendWise automatically:

- creates the `database/spendwise.db` file and all tables,
- generates a random `JWT_SECRET` and saves it in a `.env` file (you can also copy `.env.example` to `.env` and edit it yourself).

### Optional: demo data

The app starts empty. If you want sample data for a demo, run this **yourself**:

```bash
npm run seed
```

It creates a demo user with six months of sample transactions and budgets:

- Email: `demo@spendwise.com`
- Password: `Demo@1234`

### Reset the database

Stop the server (Ctrl + C), then:

```bash
npm run reset-db
npm start
```

`reset-db` deletes the SQLite file. A fresh empty database is created on the next start.

## Features

- **Authentication**: register, login (optional Remember me), logout, protected pages and API, login persists after refresh.
- **Dashboard**: welcome message, total income / expenses / balance, monthly budget progress, savings overview,
  income vs expenses chart, category chart, monthly summary, recent transactions and recent activity.
- **Income** and **Expenses**: add, edit, delete, search, filter by category and date, sort by date / amount / title, pagination.
- **Budgets**: overall monthly budget and category budgets, progress bars, remaining amount,
  warnings at 75%, 90% and 100% (calculated from your real expense records).
- **Transactions**: income and expenses together with search, type / category / date filters, sorting and pagination.
- **Analytics**: income, expense and savings analysis, monthly trends, category analysis, income vs expense comparison, budget overview.
- **Reports**: monthly report with income, expense, savings and category-wise summaries. Use **Print / Save as PDF**
  (your browser's print dialog, choose "Save as PDF").
- **Settings**: update name, change password, currency (INR / USD / EUR), light / dark mode (saved per user), logout.

## Project structure

```
SpendWise/
├── public/                   Frontend (served as static files)
│   ├── *.html                One page per screen (login, dashboard, income, ...)
│   ├── css/                  style.css (shared), dashboard.css (pages, print), auth.css
│   ├── js/                   common.js (shared helpers), crud-page.js (income/expenses),
│   │                         one script per page
│   └── vendor/               (Chart.js is served from node_modules/chart.js/dist at /vendor)
├── server/
│   ├── app.js                Express app, page protection, API mounting
│   ├── config/               env.js, schema.js (tables), database.js, constants.js
│   ├── middleware/auth.js    JWT cookie handling, requireAuth
│   ├── routes/               auth, dashboard, income, expenses, budgets,
│   │                         transactions, analytics, reports, settings
│   └── utils/                validation, dates, CRUD factory, budget and statistics calculations
├── scripts/                  seed.js (optional demo data), reset-db.js
├── database/                 spendwise.db is created here automatically
├── .env.example
├── package.json
└── README.md
```

## Database tables

`users`, `incomes`, `expenses`, `budgets`, `settings`. Every financial row has a `user_id` foreign key
(`ON DELETE CASCADE`), indexes on `(user_id, date)` and `(user_id, category)`, and `budgets` has a unique
constraint on `(user_id, category, month, year)`. The "Overall" budget uses the category name `Overall`.

## REST API (all except auth need a login cookie)

| Method | URL | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login (sets HTTP-only cookie) |
| POST | `/api/auth/logout` | Logout (clears cookie) |
| GET | `/api/auth/me` | Current user, settings, category lists |
| GET | `/api/dashboard` | Dashboard numbers and chart data |
| GET / POST | `/api/income`, `/api/expenses` | List (search, filters, sort, pages) / create |
| PUT / DELETE | `/api/income/:id`, `/api/expenses/:id` | Update / delete |
| GET / POST | `/api/budgets` | Budgets with progress for `?month=&year=` / create |
| PUT / DELETE | `/api/budgets/:id` | Update / delete |
| GET | `/api/transactions` | Combined history |
| GET | `/api/analytics?months=3\|6\|12\|all` | Analytics data |
| GET | `/api/reports/monthly?month=YYYY-MM` | Monthly report data |
| GET / PUT | `/api/settings` | Currency and theme |
| PUT | `/api/settings/profile`, `/api/settings/password` | Name / password |

## Security notes

- Passwords are hashed with bcryptjs; plain-text passwords are never stored or returned.
- The JWT lives in an HTTP-only, SameSite=Lax cookie, so browser JavaScript cannot read it. The secret is in `.env`.
- Every record query includes `user_id = <logged-in user>`, so one user can never read, edit or delete another user's data
  (a wrong id simply returns "not found").
- All SQL uses parameterized queries. All input is validated on the server. Text is escaped when it is displayed.
- A basic limit blocks repeated failed logins (10 per 15 minutes per IP + email).
- Security headers and a strict Content-Security-Policy are set (no inline scripts, no external resources).
- For real deployment you would also use HTTPS and set `NODE_ENV=production` so the cookie is marked `secure`.

## Troubleshooting

- **`npm install` fails on `better-sqlite3`**: use an LTS version of Node.js (18, 20 or 22) so a prebuilt binary is downloaded.
  On Windows you can otherwise install "Desktop development with C++" from Visual Studio Build Tools.
- **Port 3000 already in use**: set `PORT=3001` in `.env` and open http://localhost:3001.
- **Charts say "Chart library not found"**: run `npm install` (Chart.js is read from `node_modules/chart.js`) and restart.
- **Forgot the demo password**: run `npm run reset-db`, then `npm run seed`.

## Manual test checklist

1. Register a user; try the same email again (error shown).
2. Login with a wrong password (error), then with the right one (dashboard opens).
3. Add, edit and delete an income; add, edit and delete an expense.
4. Create an Overall budget and a Food budget for the current month; add expenses and watch the bars and warnings (75% / 90% / 100%).
5. Check Transactions (search, filters, sorting, pages), Analytics and Dashboard charts.
6. Refresh the page: you stay logged in. Click Logout: opening `/dashboard.html` redirects to login.
7. Register a second user: the first user's records are not visible.
8. Settings: change name, password, currency and theme; open Reports and use Print / Save as PDF.
