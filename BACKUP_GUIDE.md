# Supabase Database Backup Guide

This guide explains multiple methods for backing up your Supabase database.

## Method 1: Automated Backup Script (Recommended)
d
The easiest way to backup your database is using the included backup script.

### Setup

1. **Get your Database Connection String:**
   - Go to your [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Navigate to **Settings** > **Database**
   - Scroll down to **Connection String**
   - Copy the **URI** connection string
   - It looks like: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
   - Replace `[PASSWORD]` with your actual database password

2. **Add to your `.env` file:**
   ```bash
   SUPABASE_DB_URL=postgresql://postgres.[PROJECT-REF]:YOUR_PASSWORD@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```

3. **Install PostgreSQL Client Tools:**
   
   **Windows:**
   ```bash
   # Using Chocolatey
   choco install postgresql
   
   # Or download from: https://www.postgresql.org/download/windows/
   ```

   **macOS:**
   ```bash
   brew install postgresql
   ```

   **Linux (Ubuntu/Debian):**
   ```bash
   sudo apt-get update
   sudo apt-get install postgresql-client
   ```

   **Linux (Fedora/RHEL):**
   ```bash
   sudo dnf install postgresql
   ```

### Usage

Run the backup script:
```bash
npm run backup
```

Or directly:
```bash
tsx backup-database.ts
```

The backup will be saved to `backups/supabase-backup-YYYY-MM-DD-HH-MM-SS.sql`

### Restoring a Backup

To restore from a backup file:
```bash
psql "YOUR_DATABASE_URL" < backups/supabase-backup-2024-01-15T10-30-00.sql
```

Or using environment variable:
```bash
psql "$SUPABASE_DB_URL" < backups/supabase-backup-2024-01-15T10-30-00.sql
```

---

## Method 2: Supabase Dashboard (Manual)

Supabase provides built-in backup functionality in the dashboard.

### Creating a Backup

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Settings** > **Database**
4. Scroll to the **Backups** section
5. Click **Download Backup**
6. Choose the format:
   - **SQL Dump**: Full SQL backup (recommended)
   - **Custom Format**: Binary format (smaller, faster)
   - **Tar Archive**: Compressed backup

### Restoring from Dashboard

1. Go to **Settings** > **Database**
2. Click **Restore from Backup**
3. Select your backup file
4. Confirm the restore (⚠️ **Warning**: This will overwrite existing data!)

---

## Method 3: Supabase CLI

If you have Supabase CLI installed, you can use it for backups.

### Installation

```bash
# macOS/Linux
brew install supabase/tap/supabase

# Windows
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or npm
npm install -g supabase
```

### Usage

1. **Link your project:**
   ```bash
   supabase link --project-ref your-project-ref
   ```

2. **Create a backup:**
   ```bash
   supabase db dump -f backup.sql
   ```

3. **Restore from backup:**
   ```bash
   supabase db reset --db-url postgresql://... < backup.sql
   ```

---

## Method 4: Direct pg_dump Command

If you prefer using pg_dump directly:

### Basic Backup

```bash
pg_dump "YOUR_DATABASE_URL" > backup.sql
```

### Advanced Options

```bash
# Include schema only (no data)
pg_dump "YOUR_DATABASE_URL" --schema-only > schema-only.sql

# Include data only (no schema)
pg_dump "YOUR_DATABASE_URL" --data-only > data-only.sql

# Compressed backup
pg_dump "YOUR_DATABASE_URL" -F c -f backup.dump

# Custom format (faster restore)
pg_dump "YOUR_DATABASE_URL" -F c -f backup.dump

# Include specific tables only
pg_dump "YOUR_DATABASE_URL" -t courses -t nodes -t edges > specific-tables.sql
```

### Restore from pg_dump

```bash
# Plain SQL format
psql "YOUR_DATABASE_URL" < backup.sql

# Custom format
pg_restore -d "YOUR_DATABASE_URL" backup.dump
```

---

## Method 5: Automated Backups (Paid Plans)

If you're on a **Pro** plan or higher, Supabase offers automated daily backups:

1. Go to **Settings** > **Database**
2. Enable **Daily Backups**
3. Backups are retained for:
   - **Pro**: 7 days
   - **Team**: 14 days
   - **Enterprise**: Custom retention period

These backups are managed automatically and can be restored from the dashboard.

---

## Best Practices

### Regular Backups

1. **Schedule automated backups** using cron (Linux/macOS) or Task Scheduler (Windows):
   ```bash
   # Linux/macOS - Daily backup at 2 AM
   0 2 * * * cd /path/to/project && npm run backup
   ```

2. **Test your backups regularly** by restoring to a test environment

3. **Store backups securely:**
   - Use version control for schema backups (be careful with credentials!)
   - Store data backups in secure cloud storage (S3, Google Drive, etc.)
   - Encrypt sensitive backups

### Before Major Changes

Always backup before:
- Running migrations
- Restructuring database schema
- Bulk data operations
- Updating RLS policies

### Backup Retention

- **Daily backups**: Keep for 7-30 days
- **Weekly backups**: Keep for 1-3 months
- **Monthly backups**: Keep for 1 year
- **Schema-only backups**: Keep indefinitely (version controlled)

---

## Troubleshooting

### Error: "pg_dump: command not found"

**Solution**: Install PostgreSQL client tools (see Setup section above)

### Error: "password authentication failed"

**Solutions**:
1. Verify your database password is correct
2. URL-encode special characters in the password (e.g., `@` becomes `%40`)
3. Check if you're using the correct connection pooler port (5432 for direct, 6543 for pooler)

### Error: "Connection timeout"

**Solutions**:
1. Check if your IP is whitelisted in Supabase dashboard
2. Verify you're using the correct connection string (direct vs pooler)
3. Try using the pooler connection string instead

### Large Database Backups

For large databases:
- Use compressed format: `pg_dump -F c -f backup.dump`
- Use parallel jobs: `pg_dump -j 4 -F d -f backup_dir`
- Consider backing up specific tables only if full backup isn't needed

---

## Getting Your Connection String

1. **Supabase Dashboard**:
   - Settings > Database > Connection String
   - Copy the **URI** format
   - Replace `[YOUR-PASSWORD]` with your actual password

2. **Connection Pooler** (Recommended for backups):
   - Use port `6543` (session mode) for better connection handling
   - Format: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`

3. **Direct Connection**:
   - Use port `5432` for direct connection
   - May have connection limits on free tier

---

## Security Notes

⚠️ **Important Security Considerations**:

1. **Never commit backup files** containing data to version control
2. **Never commit connection strings** with passwords to version control
3. **Use environment variables** for sensitive information
4. **Encrypt backups** containing sensitive user data
5. **Secure backup storage**: Use encrypted storage solutions
6. **Rotate credentials** regularly

The `backups/` directory is already added to `.gitignore` to prevent accidental commits.

---

## Quick Reference

| Method | Difficulty | Speed | Best For |
|--------|-----------|-------|----------|
| Backup Script | Easy | Fast | Regular manual backups |
| Supabase Dashboard | Very Easy | Medium | One-time backups |
| Supabase CLI | Medium | Fast | Development workflows |
| pg_dump Direct | Medium | Fast | Advanced users |
| Automated (Paid) | Very Easy | Fast | Production (requires paid plan) |

---

## Questions?

- [Supabase Documentation](https://supabase.com/docs/guides/database/backups)
- [PostgreSQL Backup Documentation](https://www.postgresql.org/docs/current/backup.html)
- [Supabase Community](https://github.com/supabase/supabase/discussions)



