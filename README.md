# DSA Midterm Web Application

A responsive 60-item examination system with:

- Student registration using name, student ID, and section
- One attempt per student ID
- 150-minute countdown
- Automatic answer saving to Supabase
- Automatic grading for items 1–50
- Instructor grading for items 51–60
- Instructor dashboard at `/#admin`
- Responsive light and dark modes
- Vercel serverless API; the Supabase service-role key never reaches the browser

## Architecture

```text
Browser → Vercel Functions → Supabase PostgreSQL
```

The browser receives only an attempt ID and random recovery token. Vercel Functions validate that token, use the server-side Supabase service-role key, and enforce the exam workflow.

## Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor**.
3. Copy and run `supabase/schema.sql`.
4. Open **Project Settings → API** and copy:
   - Project URL
   - `service_role` key — never expose this value in frontend code or GitHub.

## Local setup

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
ADMIN_KEY=use-a-long-random-instructor-password
EXAM_DURATION_MINUTES=150
```

Install and sign in to the Vercel CLI, then run:

```bash
npm i -g vercel
vercel login
npm run dev
```

Open the local URL from the terminal. Instructor dashboard: `http://localhost:3000/#admin`.

## Deploy to Vercel

### GitHub method

```bash
git init
git add .
git commit -m "Build Supabase DSA midterm app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dsa-midterm-web.git
git push -u origin main
```

1. In Vercel, select **Add New → Project**.
2. Import the GitHub repository.
3. Keep Framework Preset as **Other**.
4. Add the four environment variables from `.env.example`.
5. Apply them to Production, Preview, and Development as needed.
6. Click **Deploy**.

Every later `git push` triggers a new Vercel deployment.

### CLI method

```bash
vercel
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add ADMIN_KEY
vercel env add EXAM_DURATION_MINUTES
vercel --prod
```

## Instructor workflow

1. Visit the deployed URL with `/#admin` appended.
2. Enter `ADMIN_KEY`.
3. Open a submitted attempt.
4. Review answers 51–60.
5. Enter a manual score from 0–50 and optional feedback.
6. Release the grade. The final result is objective score + manual score.

## Important security notes

- Do not add `.env` or `.env.local` to Git.
- Never rename the service-role variable with a client-visible prefix.
- Keep RLS enabled and browser roles revoked on `exam_attempts`.
- Rotate `ADMIN_KEY` and the Supabase service-role key if either is exposed.
- This starter uses a shared instructor key. For multiple instructors or stronger auditability, replace it with Supabase Auth and instructor roles.
- The student identity fields are not identity-proof authentication. For high-stakes exams, add institutional email login or an LMS SSO integration.

## Resetting attempts

Run `supabase/reset-demo.sql` only when intentionally deleting every attempt in a test environment.
