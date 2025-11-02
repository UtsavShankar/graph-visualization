# Troubleshooting: Permissions Issue Fix

## Problem Identified

**Symptoms**: Add edge and delete node operations work for you but not for your friend.

**Root Cause**: Row Level Security (RLS) policies are not properly configured in your Supabase database.

## Why This Happens

1. Your app uses Supabase with anonymous access (no authentication required)
2. Supabase has RLS enabled on all tables by default
3. Without proper RLS policies, anonymous users can only READ data, not INSERT or DELETE
4. You likely have admin access when logged into Supabase dashboard, which bypasses RLS
5. Your friend accesses the site as a true anonymous user, subject to RLS restrictions

## Solution: Apply RLS Policies

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project (segbdmjlsaubqzyickwk)
3. Navigate to **SQL Editor** in the left sidebar

### Step 2: Apply RLS Policies

1. Open the file `supabase-rls-policies.sql` in this repository
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click **Run** or press `Ctrl+Enter`
5. You should see a success message

### Step 3: Verify Policies Are Active

1. Navigate to **Authentication > Policies** in your Supabase dashboard
2. Check that policies exist for these tables:
   - `courses` (should have 4 policies: SELECT, INSERT, UPDATE, DELETE)
   - `nodes` (should have 4 policies: SELECT, INSERT, UPDATE, DELETE)
   - `edges` (should have 4 policies: SELECT, INSERT, UPDATE, DELETE)

Alternative verification using SQL:
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('courses', 'nodes', 'edges')
ORDER BY tablename, cmd;
```

### Step 4: Test Anonymous Access

**Important**: Test as a true anonymous user, not while logged into Supabase!

1. **Log out** of your Supabase dashboard (or use incognito mode)
2. Visit your GitHub Pages site
3. Try to:
   - Add a new edge between nodes
   - Delete a node
4. Both operations should now work

## Understanding the Policies

The RLS policies in `supabase-rls-policies.sql` do the following:

```sql
-- Allow anyone to SELECT (read) data
FOR SELECT USING (true)

-- Allow anyone to INSERT (create) data
FOR INSERT WITH CHECK (true)

-- Allow anyone to UPDATE (modify) data
FOR UPDATE USING (true)

-- Allow anyone to DELETE data
FOR DELETE USING (true)
```

The `USING (true)` means "always allow" - perfect for a public application without user accounts.

## Security Considerations

### Current Setup (Public Access)
- ✅ Good for: GitHub Pages demo, educational projects, public knowledge graphs
- ⚠️ Risk: Anyone can modify or delete data
- 💡 Mitigation: Keep backups, use export functionality regularly

### If You Want to Restrict Access Later

You can modify the policies to require authentication:

```sql
-- Example: Only allow authenticated users to delete
DROP POLICY "Allow public delete to nodes" ON nodes;
CREATE POLICY "Allow authenticated delete to nodes" ON nodes
  FOR DELETE USING (auth.uid() IS NOT NULL);
```

## Common Issues

### Issue: Policies don't seem to work

**Check:**
1. RLS is enabled: `ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;`
2. Policies were created without errors
3. You're testing as an anonymous user (logged out of Supabase)

### Issue: "new row violates row-level security policy"

**Solution:** The `WITH CHECK (true)` clause is missing. Re-run the INSERT policy creation.

### Issue: Operations work locally but not on GitHub Pages

**Check:**
1. Environment variables are correctly set in `.env` locally
2. The build process includes environment variables
3. Both local and GitHub Pages point to the same Supabase database

## Next Steps After Applying Policies

1. ✅ Apply the RLS policies using `supabase-rls-policies.sql`
2. ✅ Test in incognito mode to verify anonymous access works
3. ✅ Ask your friend to test again
4. ✅ Monitor your Supabase database usage
5. 💡 Consider adding authentication later if needed
6. 💡 Set up regular data backups

## Quick Reference

- **Supabase Dashboard**: https://supabase.com/dashboard/project/segbdmjlsaubqzyickwk
- **SQL Editor**: Dashboard → SQL Editor
- **Policies View**: Dashboard → Authentication → Policies
- **RLS Policies File**: `supabase-rls-policies.sql` (in this repo)

## Environment Variables

Your `.env` file has been removed from git for security. Make sure you have a local `.env` file:

```bash
# .env (create this file locally)
VITE_SUPABASE_URL=https://segbdmjlsaubqzyickwk.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-key-here
```

**Note**: Never commit `.env` to git. It's now in `.gitignore`.

## Support

If you still experience issues after applying the policies:

1. Check browser console for error messages
2. Check Supabase logs in Dashboard → Logs
3. Verify the policies in Authentication → Policies
4. Test with the SQL verification query above
