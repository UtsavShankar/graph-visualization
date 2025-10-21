import { supabase } from './supabase';
import { createNode, updateNode, getNodes, getCourses } from './database';

interface JsonNode {
  id: string;
  title: string;
  url?: string;
  author?: string;
  year?: number;
  color?: string;
  tags: string[];
  abstract?: string;
  notes?: string;
}

interface JsonData {
  nodes: JsonNode[];
  edges: any[];
}

export async function migrateJsonData(jsonData: JsonData) {
  console.log('Starting JSON data migration...');
  
  try {
    // Get existing nodes and courses
    const [existingNodes, courses] = await Promise.all([
      getNodes(),
      getCourses()
    ]);
    
    console.log(`Found ${existingNodes.length} existing nodes`);
    console.log(`Found ${courses.length} courses`);
    
    // Create course mapping
    const courseMap = new Map();
    courses.forEach(course => {
      courseMap.set(course.name, course);
    });
    
    const results = {
      updated: 0,
      created: 0,
      skipped: 0,
      errors: []
    };
    
    // Process each node from JSON
    for (const jsonNode of jsonData.nodes) {
      try {
        const existingNode = existingNodes.find(n => n.id === jsonNode.id);
        
        if (existingNode) {
          // Update existing node
          console.log(`Updating existing node: ${jsonNode.id}`);
          
          // Find the course for this node
          const courseName = jsonNode.tags[0];
          const course = courseMap.get(courseName);
          
          if (!course) {
            console.warn(`Course not found for node ${jsonNode.id}: ${courseName}`);
            results.skipped++;
            continue;
          }
          
          // Prepare update data (only update fields that have changed)
          const updateData: any = {};
          
          if (jsonNode.url && (!existingNode.links || existingNode.links.length === 0)) {
            updateData.links = [jsonNode.url];
          }
          if (jsonNode.author && jsonNode.author !== existingNode.author) {
            updateData.author = jsonNode.author;
          }
          if (jsonNode.year && jsonNode.year !== existingNode.year) {
            updateData.year = jsonNode.year;
          }
          if (jsonNode.abstract && jsonNode.abstract !== existingNode.abstract) {
            updateData.abstract = jsonNode.abstract;
          }
          if (jsonNode.notes && jsonNode.notes !== existingNode.notes) {
            updateData.notes = jsonNode.notes;
          }
          
          // Update tags if they've changed
          const existingTags = existingNode.tags || [];
          const newTags = jsonNode.tags || [];
          if (JSON.stringify(existingTags.sort()) !== JSON.stringify(newTags.sort())) {
            updateData.tags = newTags;
            updateData.course_id = course.id;
            updateData.color = course.color;
          }
          
          // Only update if there are changes
          if (Object.keys(updateData).length > 0) {
            await updateNode(jsonNode.id, updateData);
            results.updated++;
            console.log(`Updated node ${jsonNode.id} with fields:`, Object.keys(updateData));
          } else {
            console.log(`No changes needed for node ${jsonNode.id}`);
            results.skipped++;
          }
          
        } else {
          // Create new node
          console.log(`Creating new node: ${jsonNode.id}`);
          
          // Find the course for this node
          const courseName = jsonNode.tags[0];
          const course = courseMap.get(courseName);
          
          if (!course) {
            console.warn(`Course not found for new node ${jsonNode.id}: ${courseName}`);
            results.errors.push(`Course not found: ${courseName}`);
            continue;
          }
          
          // Create new node data
          const newNodeData = {
            id: jsonNode.id,
            title: jsonNode.title,
            url: jsonNode.url,
            author: jsonNode.author,
            year: jsonNode.year,
            tags: jsonNode.tags,
            abstract: jsonNode.abstract,
            notes: jsonNode.notes,
            links: jsonNode.url ? [jsonNode.url] : [],
            details: {},
            course_id: course.id,
            color: course.color
          };
          
          await createNode(newNodeData);
          results.created++;
          console.log(`Created new node ${jsonNode.id}`);
        }
        
      } catch (error) {
        console.error(`Error processing node ${jsonNode.id}:`, error);
        results.errors.push(`Error with node ${jsonNode.id}: ${error.message}`);
      }
    }
    
    console.log('Migration completed:', results);
    return results;
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Helper function to load JSON from file
export async function loadJsonFromFile(file: File): Promise<JsonData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const jsonData = JSON.parse(reader.result as string);
        resolve(jsonData);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
