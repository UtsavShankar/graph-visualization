# How to Set Up GitHub Secrets for Supabase

## The Problem

Your GitHub Pages deployment is failing because it doesn't have access to your Supabase credentials. The environment variables in your `.env` file are **only available locally** - GitHub Actions cannot see them because `.env` is in `.gitignore`.

## The Solution: GitHub Secrets

GitHub Secrets allow you to securely store sensitive information that GitHub Actions can access during the build process.

## Step-by-Step Instructions

### Step 1: Go to Repository Settings

1. Open your browser and go to: **https://github.com/UtsavShankar/graph-visualization**
2. Click the **Settings** tab (top right, next to Insights)
3. In the left sidebar, click **Secrets and variables**
4. Click **Actions**

Direct link: https://github.com/UtsavShankar/graph-visualization/settings/secrets/actions

### Step 2: Add First Secret (Supabase URL)

1. Click the green **"New repository secret"** button
2. In the **Name** field, enter exactly: `VITE_SUPABASE_URL`
3. In the **Secret** field, enter exactly: `https://segbdmjlsaubqzyickwk.supabase.co`
4. Click **"Add secret"**

### Step 3: Add Second Secret (Supabase Anon Key)

1. Click **"New repository secret"** again
2. In the **Name** field, enter exactly: `VITE_SUPABASE_ANON_KEY`
3. In the **Secret** field, paste your Supabase anon key from your `.env` file:
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlZ2JkbWpsc2F1YnF6eWlja3drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NjE0NDYsImV4cCI6MjA3NTEzNzQ0Nn0.IZ-dNJsqxUwUpNEuniq2hJQFcavjMVc1h4GMj6vfmUo
   ```
4. Click **"Add secret"**

### Step 4: Verify Secrets Are Set

After adding both secrets, you should see them listed on the page:
- ✅ `VITE_SUPABASE_ANON_KEY` (Updated X seconds/minutes ago)
- ✅ `VITE_SUPABASE_URL` (Updated X seconds/minutes ago)

**Note**: You won't be able to see the secret values after saving them (for security), but you can see that they exist.

### Step 5: Trigger a New Deployment

Once the secrets are set, you need to trigger a new build:

**Option 1: Push a commit (easiest)**
- Make any small change to your code (e.g., add a comment)
- Commit and push
- This will automatically trigger a new deployment

**Option 2: Manual workflow trigger**
1. Go to: https://github.com/UtsavShankar/graph-visualization/actions
2. Click on **"Deploy to GitHub Pages"** in the left sidebar
3. Click **"Run workflow"** button (top right)
4. Click the green **"Run workflow"** button in the dropdown
5. Wait for the deployment to complete (~1-2 minutes)

### Step 6: Verify It Works

1. Wait for the deployment to finish (green checkmark in Actions tab)
2. Visit your site: https://utsavshankar.github.io/graph-visualization/
3. Open browser console (F12) - you should NOT see "Missing Supabase environment variables"
4. Try adding an edge or deleting a node - should work now!

## How It Works

When you set GitHub Secrets, the deployment workflow in `.github/workflows/deploy.yml` injects them as environment variables during the build:

```yaml
- run: npm run build
  env:
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

Vite then embeds these values into your JavaScript bundle at build time, making them available in your deployed application.

## Troubleshooting

### I added the secrets but still get the error

1. **Make sure you triggered a new deployment** after adding the secrets
2. **Check the secret names are EXACTLY**:
   - `VITE_SUPABASE_URL` (not `SUPABASE_URL` or `VITE_SUPABASE_URL ` with a space)
   - `VITE_SUPABASE_ANON_KEY` (not `SUPABASE_ANON_KEY`)
3. **Clear your browser cache** - you might be seeing an old version of the site
4. **Check the deployment logs**: Go to Actions → latest run → build → "Run npm run build" - look for errors

### The secrets page says "You don't have access"

You need to be the repository owner or have admin permissions to add secrets.

### How do I update a secret?

1. Go to the secrets page
2. Click on the secret name
3. Click "Update secret"
4. Enter the new value
5. Click "Update secret"

## Security Notes

- ✅ **GitHub Secrets are encrypted** and only exposed during workflow runs
- ✅ **The anon key is safe to expose** in client-side code (it's designed for public use)
- ✅ **Never commit the service role key** (different from anon key) to git or GitHub Secrets for public repos
- ⚠️ **Don't share your service role key** - only use the anon/public key for client-side apps

## Summary Checklist

- [ ] Go to repository settings → Secrets and variables → Actions
- [ ] Add secret: `VITE_SUPABASE_URL` = `https://segbdmjlsaubqzyickwk.supabase.co`
- [ ] Add secret: `VITE_SUPABASE_ANON_KEY` = (your anon key)
- [ ] Verify both secrets appear in the list
- [ ] Trigger a new deployment (push a commit or manual trigger)
- [ ] Wait for deployment to complete
- [ ] Test the site - should work without errors!
