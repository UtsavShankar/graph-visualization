import React, { useState } from 'react';
import { migrateJsonData, loadJsonFromFile } from '../lib/migrate-json-data';

interface JsonMigrationButtonProps {
  onComplete: () => void;
}

export function JsonMigrationButton({ onComplete }: JsonMigrationButtonProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setResults(null);

    try {
      console.log('Loading JSON file...');
      const jsonData = await loadJsonFromFile(file);
      
      console.log('Starting migration...');
      const migrationResults = await migrateJsonData(jsonData);
      
      setResults(migrationResults);
      onComplete(); // Refresh the data
      
    } catch (err) {
      console.error('Migration failed:', err);
      setError(err instanceof Error ? err.message : 'Migration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-slate-700 rounded-lg p-4 bg-slate-900/50">
      <h3 className="text-lg font-semibold mb-3">JSON Data Migration</h3>
      <p className="text-sm text-slate-400 mb-4">
        Upload a JSON file to update existing nodes and add new ones. 
        This will preserve existing positions and relationships.
      </p>
      
      <div className="flex items-center gap-3">
        <label className="px-4 py-2 rounded-lg border border-sky-500/50 bg-sky-500/15 hover:bg-sky-500/25 cursor-pointer disabled:opacity-50">
          {loading ? 'Migrating...' : 'Upload JSON File'}
          <input
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            disabled={loading}
            className="hidden"
          />
        </label>
        
        {loading && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sky-500"></div>
        )}
      </div>

      {error && (
        <div className="mt-3 text-red-400 text-sm">
          Error: {error}
        </div>
      )}

      {results && (
        <div className="mt-4 p-3 bg-slate-800 rounded-lg">
          <h4 className="font-semibold mb-2">Migration Results:</h4>
          <div className="text-sm space-y-1">
            <div className="text-green-400">✓ Updated: {results.updated} nodes</div>
            <div className="text-blue-400">+ Created: {results.created} nodes</div>
            <div className="text-slate-400">- Skipped: {results.skipped} nodes</div>
            {results.errors.length > 0 && (
              <div className="text-red-400">
                ✗ Errors: {results.errors.length}
                <details className="mt-1">
                  <summary className="cursor-pointer">Show errors</summary>
                  <ul className="ml-4 mt-1 text-xs">
                    {results.errors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </details>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
