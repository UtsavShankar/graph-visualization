# BookGraph - Comprehensive Code Outline

**Last Updated:** After edge tooltip and viewport initialization updates  
**Purpose:** Reference document for understanding codebase structure and architecture

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Core Components](#core-components)
5. [Custom Hooks](#custom-hooks)
6. [Database Layer](#database-layer)
7. [Utilities & Helpers](#utilities--helpers)
8. [Data Flow](#data-flow)
9. [Key Patterns & Solutions](#key-patterns--solutions)
10. [Configuration](#configuration)

---

## Project Overview

**BookGraph** is a React + TypeScript web application for visualizing academic book collections as interactive graphs. It uses Cytoscape.js for graph visualization and Supabase (PostgreSQL) for data persistence.

### Tech Stack
- **Frontend:** React 19.1.1, TypeScript 5.8.3
- **Build Tool:** Vite 7.1.3
- **Styling:** Tailwind CSS 4.1.12
- **Graph Visualization:** Cytoscape.js 3.33.1 with fcose layout
- **Database:** Supabase (PostgreSQL)
- **Deployment:** GitHub Pages

### Key Features
- Interactive graph visualization with drag-and-drop
- Search and filter by tags/authors/titles
- Node (book) management: add, edit, delete
- Edge (connection) management: create, edit, delete
- World map background (always visible)
- Context menus for quick actions
- Real-time database sync

---

## Architecture

### High-Level Flow

```
main.tsx
  └─> App.tsx (loads data from Supabase)
       └─> ExploreView.tsx (main graph interface)
            ├─> useCytoscapeGraph (initializes graph)
            ├─> useEdgeCreation (edge creation mode)
            ├─> useNodeDeletion (node deletion mode)
            └─> Components (forms, menus)
```

### State Management
- **Local State:** React `useState` for UI state
- **Database State:** Supabase for persistent data
- **Graph State:** Cytoscape instance managed via refs
- **Refs Pattern:** Used extensively to avoid stale closures in event handlers

---

## File Structure

```
bookgraph/
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Main app component
│   ├── ExploreView.tsx             # Graph visualization view
│   ├── components/
│   │   ├── ContextMenu.tsx         # Node right-click menu
│   │   ├── EdgeContextMenu.tsx     # Edge right-click menu
│   │   ├── NodeForm.tsx            # Add/edit node form
│   │   └── EdgeNoteForm.tsx        # Edit edge note form
│   ├── hooks/
│   │   ├── useCytoscapeGraph.ts    # Graph initialization & events
│   │   ├── useEdgeCreation.ts       # Edge creation mode logic
│   │   └── useNodeDeletion.ts       # Node deletion mode logic
│   ├── lib/
│   │   ├── supabase.ts             # Supabase client & types
│   │   ├── database.ts             # Database operations (CRUD)
│   │   ├── utils.ts                # Utility functions
│   │   ├── positioning.ts          # Node position management
│   │   ├── cytoscape-styles.ts     # Graph styling
│   │   └── constants.ts            # App constants
│   └── seed/
│       └── book-graph-120.json      # Sample data
├── public/
│   └── world-map.svg               # World map background
├── package.json
├── vite.config.ts
└── .env                            # Environment variables
```

---

## Core Components

### 1. `main.tsx`
**Purpose:** Application entry point

**Key Actions:**
- Clears localStorage on load
- Renders App component with React StrictMode

**Dependencies:**
- React, ReactDOM
- App component
- index.css

---

### 2. `App.tsx`
**Purpose:** Main application component, data loading, routing

**Key Responsibilities:**
- Loads graph data and courses from Supabase
- Manages loading and error states
- Provides data to ExploreView

**Custom Hook:**
- `useSupabaseGraph()`: Manages data fetching and state

**State:**
- `graph`: { nodes, edges }
- `courses`: Course[]
- `loading`: boolean
- `error`: string | null
- `query`: string (search query)

**Functions:**
- `loadData()`: Fetches graph data and courses
- `refetch()`: Reloads data

---

### 3. `ExploreView.tsx`
**Purpose:** Main graph visualization interface

**Key Responsibilities:**
- Renders Cytoscape graph
- Manages search and filtering
- Handles node/edge interactions
- Coordinates UI components (forms, menus, sidebar)

**State Management:**
- **Refs:**
  - `containerRef`: Cytoscape container DOM element
  - `cyRef`: Cytoscape instance
  - `mapImageRef`: World map image element
  - `tagFilterRef`: Current tag filter (for event handlers)
  - `tagColorMapRef`: Course color mapping
  - `graphRef`: Current graph data (for event handlers)

- **State:**
  - `tagFilter`: string
  - `selected`: Node data (for sidebar)
  - `showNodeForm`: boolean
  - `editingNode`: Node | null
  - `contextMenu`: { x, y, nodeId } | null
  - `edgeContextMenu`: { x, y, edgeId } | null
  - `editingEdge`: { id, note } | null
  - `showEdgeForm`: boolean
  - `hoverEdge`: Edge hover data with author info | null
  - `showWorldMap`: boolean (defaults to true - map always visible)

**Custom Hooks Used:**
- `useEdgeCreation()`: Edge creation mode
- `useNodeDeletion()`: Node deletion mode
- `useCytoscapeGraph()`: Graph initialization

**Key Effects:**
1. **Graph Element Sync:** Syncs React state with Cytoscape elements
2. **Search/Filter:** Applies search query and tag filter
3. **World Map Sync:** Synchronizes map with graph pan/zoom (not viewport resize)
4. **Keyboard Shortcuts:** Escape key handling

**Map Configuration:**
- Map is always visible (`showWorldMap` defaults to `true`)
- Map toggle button removed from UI
- Map image: 7100px width, fixed pixel size (doesn't resize with viewport)
- Map syncs with Cytoscape pan/zoom to keep nodes aligned with geographic locations

**Event Handlers:**
- `handleAddNode()`: Opens node form
- `handleEditNode()`: Opens node form with existing data
- `handleAddEdgeButton()`: Toggles edge creation mode
- `handleDeleteNodeButton()`: Toggles node deletion mode
- `handleDeleteEdge()`: Deletes edge
- `handleEditEdge()`: Opens edge note form
- `handleNodeSubmit()`: Creates/updates node
- `handleEdgeNoteSubmit()`: Updates edge note

---

## Custom Hooks

### 1. `useCytoscapeGraph.ts`
**Purpose:** Initializes Cytoscape instance and sets up all event handlers

**Key Pattern:** Uses refs to avoid stale closures in event handlers

**Refs Created:**
- All callback functions are stored in refs (11 total)
- Refs are updated on every render via useEffect

**Event Handlers:**
- **Background tap:** Clear modes/selection
- **Node tap:** Handle selection, edge creation, or deletion
- **Node right-click:** Show context menu
- **Edge right-click:** Show edge context menu
- **Node drag (grab):** Maintain selection
- **Node drop (free):** Update position in database
- **Edge hover:** Show tooltip with formatted author/title pairs
  - Extracts source and target titles and authors
  - Formats using `formatEdgeLabelParts()` for display
- **Mouse move:** Update preview position during edge creation

**Initialization:**
- Creates Cytoscape instance with preset layout
- Applies styles
- Sets up all event listeners
- Calculates initial viewport (in setTimeout after 100ms):
  1. Gets viewport dimensions from container (clientWidth, clientHeight)
  2. Calculates zoom to fit map image (7100px width, aspect ratio 2000:857) on screen
     - Uses `Math.min(zoomWidth, zoomHeight) * 0.95` for padding
  3. Sets zoom level first
  4. Centers viewport at coordinates (3784, 1373)
     - Calculates pan position: `(viewportWidth/2) - (centerX * zoom)`
     - Applies pan to center the specified coordinates

**Cleanup:**
- Destroys Cytoscape instance on unmount

---

### 2. `useEdgeCreation.ts`
**Purpose:** Manages edge creation mode workflow

**State:**
- `edgeCreation`: { active: boolean, sourceId: string | null }
- `edgeError`: string

**Key Functions:**
- `enterEdgeMode(sourceId?)`: Enters edge creation mode
  - Disables node dragging (ungrabify)
  - Creates preview if sourceId provided
- `exitEdgeMode()`: Exits edge creation mode
  - Re-enables node dragging (grabify)
  - Removes preview
- `ensurePreview(sourceId)`: Creates preview node and edge
- `removePreview()`: Removes preview elements
- `handleEdgeNodeSelection(nodeId)`: Two-click workflow
  - First click: Set as source
  - Second click: Create edge
- `isDuplicateEdge()`: Checks for existing edge
- `updatePreviewPosition()`: Updates preview node position

**Important:** Disables node dragging during edge creation to prevent drag events from interfering with click events.

---

### 3. `useNodeDeletion.ts`
**Purpose:** Manages node deletion mode

**State:**
- `nodeDeletionMode`: boolean
- `nodeDeletionModeRef`: ref for event handlers

**Key Functions:**
- `updateNodeDeletionMode(mode)`: Toggles deletion mode
  - Disables/enables node dragging
- `handleNodeDeletion(nodeId)`: Deletes node with confirmation
  - Deletes node and all connected edges
  - Updates graph state
  - Clears selection if deleted

**Important:** Disables node dragging during deletion mode to prevent drag events from interfering with click events.

---

## Database Layer

### `lib/supabase.ts`
**Purpose:** Supabase client setup and TypeScript types

**Exports:**
- `supabase`: Supabase client instance
- `Course`: Interface
- `Node`: Interface
- `Edge`: Interface

**Environment Variables Required:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Type Definitions:**

```typescript
interface Course {
  id: string
  name: string
  color: string
  created_at: string
}

interface Node {
  id: string
  title: string
  url?: string  // Legacy, deprecated
  urls?: string[]
  author?: string
  year?: number
  publisher?: string
  color?: string
  tags: string[]
  course_id: string
  abstract?: string
  notes?: string
  pos?: { x: number; y: number }
  metadata?: Record<string, string>
  publisher_site?: string
  companion_website?: string
  relevant_media?: string
  created_at: string
  updated_at: string
}

interface Edge {
  id: string
  source: string
  target: string
  relation?: string
  note?: string  // Computed field
  weight?: number
  created_at: string
}
```

---

### `lib/database.ts`
**Purpose:** Database operations (CRUD)

**Course Operations:**
- `getCourses()`: Fetch all courses
- `createCourse()`: Create new course

**Node Operations:**
- `getNodes(courseId?)`: Fetch nodes (optionally filtered by course)
- `getNodesByCourse()`: Fetch nodes grouped by course
- `createNode()`: Create new node
- `updateNode()`: Update existing node
- `updateNodePosition()`: Update node position only
- `deleteNode()`: Delete node and all connected edges

**Edge Operations:**
- `getEdges()`: Fetch all edges
- `createEdge()`: Create new edge
- `updateEdge()`: Update edge (relation, weight, etc.)
- `deleteEdge()`: Delete edge

**Graph Operations:**
- `getGraphData()`: Fetch complete graph (nodes + edges)

**Error Handling:**
- All functions throw errors that should be caught by callers

---

## Utilities & Helpers

### `lib/utils.ts`
**Purpose:** Utility functions

**Functions:**
- `slugify(text)`: Converts string to URL-friendly slug
- `normalizeNote(value)`: Normalizes edge note (handles null/undefined)
- `getNormalizedEdgeNote(edge)`: Gets note from edge (handles both 'note' and 'relation' fields)
- `getNodeDisplayName(node)`: Gets display name (title or id)
- `nodeMatchesSearch(node, query)`: Checks if node matches search query
- `nodeMatchesTag(node, tagFilter)`: Checks if node matches tag filter
- `getAuthorLastName(author)`: Extracts last name from author string
  - Handles "First Last", "Last, First", and multi-word formats
  - Skips common suffixes (Jr., Sr., II, III, etc.)
- `formatNodeLabel(title, author)`: Formats node label as "Last name, Title"
  - Used for node labels in graph visualization
  - Returns just title if no author
- `formatEdgeLabelParts(title, author)`: Formats edge label parts for tooltip
  - Returns { author: string, title: string } with capitalized author
  - Author names are capitalized (first letter uppercase, rest lowercase)
  - Handles multi-word last names (e.g., "van der Berg" -> "Van Der Berg")
  - Used in edge hover tooltips to separate author (bold) from title (not bold)

---

### `lib/positioning.ts`
**Purpose:** Node position management

**Class: `NodePositionManager`**

**Constants:**
- `MAX_ROWS = 4`: Maximum rows per course group
- `GROUP_SPACING = 800`: Horizontal spacing between course groups
- `NODE_SPACING = 200`: Spacing between nodes
- `RANDOM_OFFSET = 40`: Random offset for visual variety

**Methods:**
- `generatePositions(nodes, courses)`: Generates positions for all nodes
  - Groups nodes by course (first tag)
  - Arranges in grid layout
  - Adds random offsets
- `findNonOverlappingPosition(existingNodes, courseName)`: Finds position for new node
  - Checks for overlaps
  - Places in appropriate course group
- `isPositionValid(position, existingNodes, excludeNodeId?)`: Validates position
- `getGroupIndex(courseName, existingNodes)`: Gets group index for course

---

### `lib/cytoscape-styles.ts`
**Purpose:** Cytoscape styling configuration

**Function: `getCytoscapeStyles(tagFilterRef, tagColorMapRef)`**

**Styles Defined:**
- **Core:** Selection box color, background
- **Node:**
  - Base: Color, size, border, label
  - Label: Uses `formatNodeLabel()` to display "Last name, Title" format
  - Hovered: Larger size
  - Dimmed: Low opacity (for filtering)
  - Edge creation source: Orange border
  - Edge creation target: Green border
  - Node deletion target: Red border
  - Preview node: Invisible
- **Edge:**
  - Base: Width (based on weight), color, opacity
  - Preview edge: Dashed, blue
  - Hovered: Brighter, thicker
- **Faded:** Low opacity for non-selected elements

**Dynamic Styling:**
- Node colors based on course/tag
- Filtered nodes shown in gray
- Edge width based on weight
- Node labels show author last name before title (via `formatNodeLabel()`)

---

### `lib/constants.ts`
**Purpose:** Application constants

**Constants:**
- `PREVIEW_NODE_ID = "__edge-preview-node"`
- `PREVIEW_EDGE_ID = "__edge-preview-edge"`
- `CYTOSCAPE_ZOOM_DEFAULT = 1.2`
- `CYTOSCAPE_FIT_PADDING = 40`
- `CYTOSCAPE_WHEEL_SENSITIVITY = 0.32`
- `CYTOSCAPE_INIT_DELAY_MS = 100`
- `EXCLUDED_TAG_FILTER = "AN1101"`

---

## Data Flow

### Initial Load
1. `App.tsx` mounts
2. `useSupabaseGraph` hook runs
3. Calls `getGraphData()` and `getCourses()`
4. Updates state with fetched data
5. `ExploreView` receives data as props
6. `useCytoscapeGraph` initializes graph:
   - Gets viewport dimensions
   - Centers viewport at (3784, 1373)
   - Calculates zoom to fit map (7100px width) on screen
7. Elements synced to Cytoscape
8. Map background visible by default

### Adding a Node
1. User clicks "Add Node" button
2. `handleAddNode()` opens `NodeForm`
3. User fills form and submits
4. `handleNodeSubmit()` called
5. `createNode()` saves to database
6. Graph state updated with new node
7. `useEffect` syncs new node to Cytoscape
8. New node appears on graph

### Creating an Edge
1. User clicks "Add Edge" button
2. `enterEdgeMode()` called
3. Nodes become ungrabable (clickable but not draggable)
4. User clicks source node
5. Preview node and edge created
6. User clicks target node
7. `handleEdgeNodeSelection()` called
8. `createEdge()` saves to database
9. Graph state updated
10. `exitEdgeMode()` called
11. Nodes become grabbable again

### Deleting a Node
1. User clicks "Delete Node" button
2. `updateNodeDeletionMode(true)` called
3. Nodes become ungrabable
4. User clicks node to delete
5. `handleNodeDeletion()` called
6. Confirmation dialog shown
7. `deleteNode()` deletes from database (and connected edges)
8. Graph state updated
9. `updateNodeDeletionMode(false)` called
10. Nodes become grabbable again

### Updating Node Position
1. User drags node
2. Cytoscape "free" event fires
3. `updateNodePosition()` saves to database
4. Graph state updated with new position

### Edge Hover Tooltip
1. User hovers over edge
2. `mouseover` event fires on edge in `useCytoscapeGraph.ts`
3. Extracts source/target titles and authors from node data
4. `formatEdgeLabelParts()` formats each with capitalized author name
5. Tooltip displays with:
   - **Styling:** Solid background (#0f172a), z-index: 15, fully opaque
   - **First line:** **Author**, Title (author bold and capitalized, title not bold)
   - **Second line:** → **Author**, Title (arrow inline with second title, author bold and capitalized)
   - **Third line:** Edge note (if exists, italic, text-slate-300)
6. Tooltip positioned at mouse cursor (mousePos.x, mousePos.y)

---


## Key Patterns & Solutions

### 1. Stale Closure Prevention
**Problem:** Cytoscape event handlers captured stale callback references

**Solution:** Ref pattern
- All callbacks stored in refs
- Refs updated on every render
- Event handlers call through refs: `callbackRef.current()`

**Location:** `useCytoscapeGraph.ts` (lines 53-79)

---

### 2. Node Dragging During Special Modes
**Problem:** Drag events interfered with click events during edge creation and deletion modes

**Solution:** Disable dragging during special modes
- `enterEdgeMode()`: Calls `ungrabify()` on all nodes
- `exitEdgeMode()`: Calls `grabify()` on all nodes
- `updateNodeDeletionMode(true)`: Calls `ungrabify()` on all nodes
- `updateNodeDeletionMode(false)`: Calls `grabify()` on all nodes
- New nodes added during special modes are automatically ungrabified

**Locations:**
- `useEdgeCreation.ts` (lines 114-123, 132-140)
- `useNodeDeletion.ts` (lines 24-41)
- `ExploreView.tsx` (lines 240-243)

---

### 3. Graph Element Synchronization
**Problem:** Keep React state and Cytoscape elements in sync

**Solution:** Batch updates with diffing
- Compare desired elements with existing elements
- Remove elements not in desired set
- Update existing elements
- Add new elements
- Skip preview elements (IDs starting with "__")

**Location:** `ExploreView.tsx` (lines 201-279)

---

### 4. World Map Synchronization
**Problem:** Keep world map background synchronized with graph viewport

**Solution:** Transform matching
- Listen to Cytoscape viewport events (zoom, pan)
- Apply same transform to map image
- Use `transformOrigin: '0 0'` for correct alignment
- Use `requestAnimationFrame` for smooth updates

**Location:** `ExploreView.tsx` (lines 130-199)

---

### 5. Preview Edge During Creation
**Problem:** Show visual feedback during edge creation

**Solution:** Temporary preview elements
- Create invisible preview node
- Create dashed preview edge from source to preview node
- Update preview node position on mouse move
- Remove preview when edge created or mode exited

**Location:** `useEdgeCreation.ts` (lines 68-106, 216-221)

---

## Configuration

### Environment Variables (`.env`)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Vite Config (`vite.config.ts`)
- Base path: `/graph-visualization/` (for GitHub Pages)
- React plugin
- Tailwind CSS plugin

### TypeScript Config (`tsconfig.json`)
- Strict mode: disabled
- JSX: react-jsx
- Target: ES2020
- Module: ESNext

---

## Recent Fixes (from FIX_SUMMARY.md)

### Fix 1: Stale Closures
- **Issue:** Event handlers had stale callback references
- **Solution:** Ref pattern for all callbacks
- **Files:** `useCytoscapeGraph.ts`

### Fix 2: Node Clickability During Edge Creation
- **Issue:** Drag events interfered with click events
- **Solution:** Disable node dragging during edge creation mode
- **Files:** `useEdgeCreation.ts`, `ExploreView.tsx`, `cytoscape-styles.ts`

### Fix 3: Node Clickability During Deletion
- **Issue:** Same as Fix 2, but for deletion mode
- **Solution:** Disable node dragging during deletion mode
- **Files:** `useNodeDeletion.ts`, `ExploreView.tsx`, `cytoscape-styles.ts`

---

## Important Notes

1. **Preview Elements:** All preview elements have IDs starting with "__" and are filtered out in various operations

2. **Node Positioning:** Positions are stored in database and synced on drag

3. **Edge Notes:** The `note` field is computed from `relation` field for consistency

4. **Tag Filtering:** AN1101 is excluded from tag filter dropdown (too common)

5. **Course Colors:** Nodes inherit colors from their course (first tag) if no custom color set

6. **Error Handling:** Database operations throw errors that should be caught by callers

7. **Keyboard Shortcuts:** Escape key exits edge creation and deletion modes

8. **Context Menus:** Right-click on nodes/edges shows context menus with actions

9. **Search:** Searches across title, tags, and author fields simultaneously

10. **World Map:** Always visible by default, synchronized with graph viewport (pan/zoom only, not viewport resize)
11. **Node Labels:** Display as "Last name, Title" format using `formatNodeLabel()`
12. **Edge Tooltips:** Display source and target with:
    - Author names in bold and capitalized
    - Titles not bold
    - Arrow (→) inline with second title
    - Format: "**Author**, Title" → "**Author**, Title"
    - Solid background (#0f172a), fully opaque (opacity: 1)
    - High z-index (15) to appear above all other elements
    - Positioned at mouse cursor location
13. **Initial Viewport:** Centers at (3784, 1373) and zooms to fit map image (7100px width) on screen
    - Gets viewport dimensions dynamically from container
    - Calculates zoom: `Math.min(viewportWidth/mapWidth, viewportHeight/mapHeight) * 0.95`
    - Sets zoom first, then calculates pan to center at (3784, 1373)
    - Ensures map fits on screen regardless of window size
14. **Map Configuration:**
    - Always visible by default (`showWorldMap` defaults to `true`)
    - Toggle button removed from UI
    - Map image: 7100px width, fixed pixel size (doesn't resize with viewport)
    - Map syncs with Cytoscape pan/zoom only (not viewport resize events)
    - Map positioned at (0, 0) in Cytoscape coordinate space

---

## Quick Reference

### Key Files by Function
- **Graph Initialization:** `useCytoscapeGraph.ts`
- **Edge Creation:** `useEdgeCreation.ts`
- **Node Deletion:** `useNodeDeletion.ts`
- **Database Operations:** `lib/database.ts`
- **Graph Styling:** `lib/cytoscape-styles.ts`
- **Node Positioning:** `lib/positioning.ts`
- **Main View:** `ExploreView.tsx`
- **App Entry:** `App.tsx`

### Common Patterns
- **Refs for callbacks:** Avoid stale closures
- **Batch updates:** Use `cy.batch()` for multiple operations
- **State sync:** Keep React state and Cytoscape in sync
- **Error handling:** Try-catch around database operations
- **Confirmation dialogs:** Use `window.confirm()` for destructive actions

---

**End of Code Outline**

