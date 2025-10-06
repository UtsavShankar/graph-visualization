# Supabase Setup Guide for BookGraph

This guide will help you set up Supabase as your database for the BookGraph application.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - Name: `bookgraph-db` (or any name you prefer)
   - Database Password: Choose a strong password
   - Region: Choose the closest to your users
6. Click "Create new project"

## 2. Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

## 3. Set Up Environment Variables

1. Create a `.env` file in your project root (copy from `env.example`)
2. Add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## 4. Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `database-schema.sql` and paste it into the SQL editor
3. Click "Run" to execute the schema creation
4. This will create the tables and insert initial course data

## 5. Migrate Your Existing Data

1. Make sure your `.env` file is properly configured
2. Run the migration script to move your JSON data to Supabase:

```bash
npm run dev
```

3. Open your browser to the application
4. The migration will run automatically on first load
5. Check the browser console for migration progress

## 6. Test the Application

1. Start your development server: `npm run dev`
2. Open the application in your browser
3. You should see your data loaded from Supabase instead of the JSON file
4. Try adding a new book to test the database integration

## 7. Deploy to GitHub Pages

1. Build your application: `npm run build`
2. Commit and push your changes to GitHub
3. Set up GitHub Pages to deploy from your repository
4. Add your environment variables to your GitHub repository secrets (if needed)

## Database Schema

The database includes three main tables:

### Courses Table
- `id`: UUID primary key
- `name`: Course name (e.g., "AN1101")
- `color`: Hex color code for the course
- `created_at`: Timestamp

### Nodes Table
- `id`: Text primary key (slugified title)
- `title`: Book title
- `url`: Book URL
- `author`: Author name
- `year`: Publication year
- `color`: Node color (inherited from course)
- `tags`: Array of tags
- `course_id`: Foreign key to courses table
- `abstract`: Book abstract
- `notes`: Additional notes
- `created_at`, `updated_at`: Timestamps

### Edges Table
- `id`: Text primary key
- `source`: Source node ID
- `target`: Target node ID
- `relation`: Relationship type
- `weight`: Edge weight/thickness
- `created_at`: Timestamp

## Troubleshooting

### Common Issues

1. **Environment variables not loading**: Make sure your `.env` file is in the project root and variables start with `VITE_`

2. **Database connection errors**: Verify your Supabase URL and API key are correct

3. **Migration fails**: Check that the database schema was created successfully

4. **RLS (Row Level Security) issues**: The schema includes public access policies, but you may need to adjust them for production

### Security Considerations

For production deployment:
1. Consider implementing proper authentication
2. Review and adjust RLS policies
3. Use service role keys for server-side operations
4. Implement rate limiting

## Next Steps

1. Test all functionality (add, edit, delete books)
2. Verify data persistence across browser refreshes
3. Test the application with different browsers
4. Consider adding user authentication if needed
5. Set up automated backups for your Supabase database
