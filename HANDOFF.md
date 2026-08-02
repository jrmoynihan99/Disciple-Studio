# Setting up the Lead Console

Everything you need to get `/leads` running on your machine and on
`disciple.studio`. Follow it top to bottom — about 30 minutes, most of it waiting
on uploads.

**What you are setting up.** The console shows 15,274 churches. That data is a bit big and contains real contact details (that might not be great to expose on a public github repo like Disciple Studio), so it lives in cloud storage (Cloudflare R2) and the repo holds only a small receipt naming which build to serve. You will upload the data to *your own* Cloudflare account once, and after
that it just works.

---

## Before you start

| you need | check with | notes |
|---|---|---|
| **Node 24** | `node --version` | must be v24 or newer. The build scripts run TypeScript directly, which older Node cannot do. |
| **npm 11** | `npm --version` | comes with Node 24. |
| **Git** | `git --version` | |
| A **Cloudflare** account | | free; step 3 sets it up |
| A **Vercel** account | | for hosting; step 7 |

If `node --version` shows v20 or v22, install Node 24 from
[nodejs.org](https://nodejs.org) before going further. Nothing below will work
otherwise, and the error messages will not point at the version.

---

## 1. Get the code

```bash
git clone https://github.com/Peashooter8890/Disciple-Studio.git
cd Disciple-Studio
npm install
```

---

## 2. Get the church data

**Download `disciple-studio-leads-package.zip`** from the Google Drive folder
shared with you. It is about **68 MB**.

Optional but worth 10 seconds — check it downloaded intact. In PowerShell:

```powershell
Get-FileHash disciple-studio-leads-package.zip -Algorithm SHA256
```

It should print:

```
8b51b10113db3268856952d71633ed9b0a6055d6cbb8c8259aeef11c59b555cd
```

**Extract it into `data/leads/incoming/`** inside the repo. That folder does not
exist yet — create it. When you are done you should have:

```
Disciple-Studio/
  data/
    leads/
      incoming/
        disciple-studio-leads-package/
          MANIFEST.json
          index.json.gz
          records.ndjson.gz
          logos-thumb.tar
          dev-only/
```

The folder name does not matter — the build finds any folder containing a
`MANIFEST.json`. Nesting it one level deeper by accident is fine too. What is
**not** fine is the five items sitting loose directly in `data/leads/`; they must
be under `incoming/`.

> This data is real: names, emails and phone numbers for 15,274 churches. It is
> already excluded from git, so you cannot commit it by accident. Please delete
> the Google Drive copy once step 5 succeeds.

---

## 3. Set up Cloudflare R2

You are creating **two** storage buckets and one access key.

### Create the buckets

1. Sign in at [dash.cloudflare.com](https://dash.cloudflare.com).
2. In the **left sidebar**, click **Storage & Databases**.
3. Click **R2 Object Storage**.
4. **Activate R2.** The free plan is generous but Cloudflare still asks for a
   credit card to enable it. You will not be charged at this size.
5. Click **+ Create Bucket**.
6. Name it **`disciple-studio-leads`**. Leave **Location** on *Automatic* and
   **Storage class** on *Standard*. Create it.
7. Go back to **Storage & Databases → R2 Object Storage**.
8. Click **+ Create Bucket** again.
9. Name it **`disciple-studio-logos`**. Again leave Location on *Automatic* and
   Storage class on *Standard*. Create it.
10. Go back to **Storage & Databases → R2 Object Storage**.

> **Why two buckets.** In R2, "make this public" is a setting on the whole
> bucket. Church records — names, emails, phone numbers — live in
> `disciple-studio-leads`, and that bucket must **never** be made public. Logo
> images live separately so they can be put on a CDN later without dragging the
> contact data along. The publish script refuses to run if both names are the
> same, so this is hard to get wrong.

### Copy your Account ID

11. Find the **Account Details** panel at the bottom of the R2 page.
12. Copy the value under **Account ID** and write it down. It is a long string of
    letters and numbers.

### Create the access key

13. In **Account Details**, click **{ } Manage** to the right of **API Tokens**.
14. Click **Create Account API Token**.
15. **Token name:** `leads-publish`
16. **Permission:** `Object Read & Write`
17. Under **Specify bucket(s)**, choose **Apply to specific buckets only**, then
    select both **`disciple-studio-leads`** and **`disciple-studio-logos`**.
18. Leave **TTL** as *Forever*.
19. Click **Create Account API Token**.
20. Copy **both** the **Access Key ID** and the **Secret Access Key**, and write
    them down.

> ⚠️ **The Secret Access Key is shown once and never again.** If you lose it you
> have to delete the token and make a new one. Copy it now.

---

## 4. Create `.env.local`

In the repo root, copy `.env.example` to a new file called **`.env.local`**, then
fill in the blanks. `.env.local` is excluded from git, so your secrets stay on
your machine.

```bash
cp .env.example .env.local
```

What to put in each:

| variable | value |
|---|---|
| `STUDIO_USER` | `admin` (or anything you like) |
| `STUDIO_PASSWORD` | **pick a password.** This is what protects the whole console — without it every page returns 401. |
| `LEADS_ID_SECRET` | **any long random string**, 32+ characters. See the note below. |
| `R2_ACCOUNT_ID` | the Account ID from step 12 |
| `R2_BUCKET_DATA` | `disciple-studio-leads` |
| `R2_BUCKET_LOGOS` | `disciple-studio-logos` |
| `R2_ACCESS_KEY_ID` | the Access Key ID from step 20 |
| `R2_SECRET_ACCESS_KEY` | the Secret Access Key from step 20 |
| `BLOB_READ_WRITE_TOKEN` | your Vercel Blob token — see step 7. Leave blank for now if you have not made one. |

> **Set `LEADS_ID_SECRET` now, even though the app runs without it.** If it is
> blank, the app falls back to using `STUDIO_PASSWORD` to identify users — which
> means the day anyone changes the password, every saved batch becomes
> unreachable. Setting it now costs nothing; setting it later loses work.

---

## 5. Build and publish the data

Two commands. The first prepares the data locally, the second uploads it.

```bash
npm run leads:pack
```

Takes about 10 seconds. You should see:

```
records/            15274 records · 256 shards · 29.0 MB · sha256 verified
index.json.gz       15274 rows · 2.6 MB
logos-thumb/        14254 files
                    p1-7f297a94e41f5d9b
```

`sha256 verified` means every one of the 15,274 records matched its expected
checksum — if the download had been corrupted, this would have stopped here.

Then:

```bash
npm run leads:publish
```

This uploads 14,511 files to Cloudflare and takes **about 5 minutes**. You can
preview what it will do first with `npm run leads:publish -- --dry-run`.

When it finishes:

```
verified     257 in disciple-studio-leads · 14,254 in disciple-studio-logos
receipt      data/leads/published.json → p1-7f297a94e41f5d9b
```

It re-checks the buckets afterwards and refuses to declare success unless every
file really arrived.

You can now **delete the Google Drive copy** of the data.

---

## 6. Check it works

```bash
npm run dev
```

Open **http://localhost:3000/leads** and sign in with the username and password
from `.env.local`. You should see **15,274 churches**.

That is reading from the local copy on your disk. To confirm Cloudflare is
serving it — which is what production will do — add this line to `.env.local` and
restart:

```
LEADS_DATASET_SOURCE=r2
```

Then visit **http://localhost:3000/api/leads/dataset/current**. It should say:

```json
{"publish_id":"p1-7f297a94e41f5d9b","n_churches":15274,"source":"r2"}
```

`"source":"r2"` is the confirmation. Click into a church and check its logo
loads — that proves both buckets are working.

Remove the line again afterwards; reading from disk is faster while developing.

---

## 7. Put it on Vercel

1. Import the repo as a Vercel project.
2. **Create a Blob store** for the demo pages and export batches — these are
   separate from the church data and still live on Vercel. Project → **Storage** →
   **Create Database** → **Blob** → set access **Private**. On the environments
   screen, **tick Development** as well as Production and Preview, or the token
   will not appear locally.
3. Copy `BLOB_READ_WRITE_TOKEN` from Project → **Settings** → **Environment
   Variables** into your local `.env.local` too.
4. Add **every variable from step 4** under **Production** in Vercel's
   Environment Variables. Same names, same values.
5. Deploy.

`data/leads/published.json` is already committed and already names the build you
published, so the corpus works on the first deploy with no extra step.

---

## 8. When new church data arrives

The scraper will send a new package. Same two commands:

1. Put the new folder in `data/leads/incoming/` (any name).
2. `npm run leads:pack`
3. `npm run leads:publish`
4. Commit the one-line change to `data/leads/published.json` and deploy.

Old data is never overwritten — each publish gets its own storage prefix — so a
bad publish cannot break the running site. Logos are only uploaded if they have
actually changed, so later publishes take seconds rather than minutes.

---

## If something goes wrong

**`no package under .../data/leads/incoming`**
The zip is in the wrong place. It lists the folders it did find — check the
layout in step 2.

**`missing R2_ACCOUNT_ID, ...`**
`.env.local` is missing values, or is not in the repo root.

**`R2 403 listing disciple-studio-leads`**
The access key is wrong, or it was not given permission on both buckets. Redo
steps 13–20.

**`... is not in this R2 bucket`**
`npm run leads:publish` has not been run against *this* Cloudflare account, or it
did not finish. Run it again — it skips whatever already uploaded.

**Every page returns 401**
`STUDIO_PASSWORD` is not set. The app deliberately fails closed rather than
serving church data without a password.

**`npm run leads:pack` says "already packed"**
That is fine — it means nothing changed. Use `npm run leads:pack -- --force` to
rebuild anyway.

**Tests:** `npm run verify` runs lint, type checking and 250+ tests. It needs
step 5 to have run first, because the tests read the real data.

---

## Two things not to change without reading first

- **Never make `disciple-studio-leads` public.** It holds real contact details
  for 15,274 congregations. The logos bucket is the one that can safely go on a
  CDN.
- **Never commit the church data.** `data/leads/.gitignore` blocks everything in
  that folder except four small files, deliberately. This repository is public.
