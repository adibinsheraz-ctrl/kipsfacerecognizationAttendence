# Kips College G-9 Face Recognition Attendance

Premium face attendance web app for Kips College G-9. Admins enroll people with multi angle face captures. The kiosk marks attendance with blink based liveness. Face embeddings are encrypted at rest. Attendance uses face only (no password for students).

## Where data is stored

All app data lives in a local **SQLite** database:

`prisma/dev.db`

That file holds:
- Admin accounts
- Enrolled people (name, roll, class, department)
- Encrypted face embeddings (matching vectors, not raw photo galleries)
- Attendance logs
- Recognition attempt logs
- Settings

When you enroll or edit someone, the face cache refreshes so the kiosk uses up to date faces.

## Stack

- Next.js (App Router) + Tailwind CSS
- Prisma + SQLite
- `@vladmandic/face-api` (browser detection + descriptors)
- JWT session auth for admins

## Quick start

```bash
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open http://localhost:3000

## Demo flow

1. Sign in at `/admin/login`
2. Enroll a person at People → Enroll (capture at least 3 angles)
3. Open `/kiosk`, blink once, get marked present
4. Review logs under Attendance and export CSV/Excel

## Credit

Developed by **Adi Bin Sheraz**

- Email: adi.binsheraz@gmail.com
- Instagram: [@adibinsheraz](https://instagram.com/adibinsheraz)
- Sites: [adi3d.vercel.app](https://adi3d.vercel.app) · [adisocial.vercel.app](https://adisocial.vercel.app)
