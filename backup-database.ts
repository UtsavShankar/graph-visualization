#!/usr/bin/env tsx
/**
 * Supabase Database Backup Script
 * 
 * This script creates a backup of your Supabase PostgreSQL database using pg_dump.
 * 
 * Requirements:
 * - PostgreSQL client tools (pg_dump) installed on your system
 * - Database connection string from Supabase project settings
 * 
 * Usage:
 *   npm run backup
 *   OR
 *   tsx backup-database.ts
 * 
 * The backup will be saved as: backups/supabase-backup-YYYY-MM-DD-HH-MM-SS.sql
 */

import { writeFile, mkdir } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

// Get database URL from environment variables
// You can get this from: Supabase Dashboard > Project Settings > Database > Connection String
// Format: postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
const DATABASE_URL = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL or SUPABASE_DB_URL environment variable not set');
  console.error('\nTo get your database URL:');
  console.error('1. Go to your Supabase project dashboard');
  console.error('2. Navigate to Settings > Database');
  console.error('3. Copy the "Connection String" (URI mode)');
  console.error('4. Replace [YOUR-PASSWORD] with your database password');
  console.error('5. Add it to your .env file as: SUPABASE_DB_URL=postgresql://...');
  process.exit(1);
}

// Create backup directory if it doesn't exist
const BACKUP_DIR = join(process.cwd(), 'backups');

async function ensureBackupDir() {
  if (!existsSync(BACKUP_DIR)) {
    await mkdir(BACKUP_DIR, { recursive: true });
    console.log(`📁 Created backup directory: ${BACKUP_DIR}`);
  }
}

async function createBackup() {
  try {
    await ensureBackupDir();
    
    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const backupFile = join(BACKUP_DIR, `supabase-backup-${timestamp}.sql`);
    
    console.log('🔄 Starting database backup...');
    console.log(`📦 Backup file: ${backupFile}`);
    
    // Run pg_dump
    // Options:
    //   --clean: Include DROP statements before CREATE
    //   --if-exists: Use IF EXISTS for DROP statements (prevents errors)
    //   --no-owner: Don't include ownership commands
    //   --no-acl: Don't include access privileges
    //   --format=plain: Plain SQL format (human-readable)
    const { stdout, stderr } = await execAsync(
      `pg_dump "${DATABASE_URL}" --clean --if-exists --no-owner --no-acl --format=plain > "${backupFile}"`
    );
    
    if (stderr) {
      console.warn('⚠️  Warning:', stderr);
    }
    
    console.log('✅ Backup completed successfully!');
    console.log(`📁 Location: ${backupFile}`);
    console.log(`\n💡 To restore this backup, use:`);
    console.log(`   psql "${DATABASE_URL}" < "${backupFile}"`);
    
  } catch (error: any) {
    console.error('❌ Backup failed:', error.message);
    
    if (error.message.includes('pg_dump: command not found')) {
      console.error('\n📥 pg_dump is not installed. Install it using:');
      console.error('   Windows (with Chocolatey): choco install postgresql');
      console.error('   macOS (with Homebrew): brew install postgresql');
      console.error('   Linux (Ubuntu/Debian): sudo apt-get install postgresql-client');
      console.error('   Linux (Fedora/RHEL): sudo dnf install postgresql');
    } else if (error.message.includes('password authentication failed')) {
      console.error('\n🔐 Authentication failed. Please check your DATABASE_URL.');
      console.error('   Make sure your password is correctly URL-encoded if it contains special characters.');
    }
    
    process.exit(1);
  }
}

// Run the backup
createBackup();




