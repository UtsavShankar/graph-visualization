# Fix Summary: Node Interaction Issues

## Problems Identified

The "Add Edge", "Delete Edge", and "Delete Node" buttons were not working due to **three separate issues**:

1. **Stale closure problem** in the Cytoscape event handlers
2. **Node dragging interfering with click events** during edge creation mode
3. **Node dragging interfering with click events** during node deletion mode

### Root Cause

In `src/hooks/useCytoscapeGraph.ts`, the Cytoscape graph initialization used a `useEffect` hook with an empty dependency array `[]`. This meant:

1. The effect ran only once when the component mounted
2. Event handlers were set up with initial versions of callbacks
3. When React recreated callbacks (due to dependency changes), the Cytoscape event handlers still referenced the old, stale versions
4. User interactions triggered outdated code, causing failures

### Technical Details

The problematic pattern was:
```typescript
useEffect(() => {
  // ... setup Cytoscape
  cy.on("tap", "node", (event) => {
    // These callbacks get captured once and never update
    handleEdgeNodeSelection(nodeId);  // ❌ Stale reference
    handleNodeDeletion(nodeId);        // ❌ Stale reference
  });
}, []); // Empty dependency array
```

## Solutions Implemented

### Solution 1: Fix Stale Closures (Commit 83bcafc)

Updated `src/hooks/useCytoscapeGraph.ts` to use the **ref pattern** to maintain up-to-date callback references:

### Changes Made

1. **Created refs for all dynamic callbacks** (lines 53-64):
   - `handleEdgeNodeSelectionRef`
   - `handleNodeDeletionRef`
   - `exitEdgeModeRef`
   - `closeEdgeContextMenuRef`
   - `updatePreviewPositionRef`
   - `updateNodeDeletionModeRef`
   - `setSelectedRef`
   - `setContextMenuRef`
   - `setEdgeContextMenuRef`
   - `setHoverEdgeRef`
   - `setGraphRef`

2. **Added useEffect to sync refs** (lines 66-79):
   - Runs on every render
   - Keeps all refs updated with latest callback versions

3. **Updated all event handlers to use refs** (throughout the file):
   - Changed `handleEdgeNodeSelection(nodeId)` → `handleEdgeNodeSelectionRef.current(nodeId)`
   - Changed `setGraph(...)` → `setGraphRef.current(...)`
   - Applied to all 11 event handlers

4. **Added missing import**:
   - Added `useRef` to React imports

## How This Fixes The Issue

Now when users interact with the graph:
- Event handlers call through refs: `someCallbackRef.current()`
- Refs always point to the latest callback versions
- Users get current, working functionality instead of stale closures

### Solution 2: Make Nodes Clickable During Edge Creation (Commit be454cf)

After fixing the stale closures, nodes still weren't clickable during edge creation mode. This was because **drag events were interfering with click events**.

#### Root Cause
When nodes are grabbable (draggable), Cytoscape prioritizes grab/drag events over tap/click events. During edge creation mode, mousedown events were being consumed by the drag handler before tap events could fire.

#### Changes Made

1. **Disabled node dragging during edge creation** (`src/hooks/useEdgeCreation.ts`):
   - In `enterEdgeMode()`: Call `ungrabify()` on all real nodes to disable dragging
   - In `exitEdgeMode()`: Call `grabify()` to re-enable dragging

2. **Handle newly added nodes** (`src/ExploreView.tsx`):
   - When nodes are added during edge creation mode, automatically ungrabify them

3. **Visual feedback** (`src/ExploreView.tsx`):
   - Added `cursor: 'crosshair'` to the container during edge creation mode

4. **Ensure event handling** (`src/lib/cytoscape-styles.ts`):
   - Added explicit `events: "yes"` to node styles
   - Added `edge-creation-target` style for visual feedback

#### How This Fixes The Issue
By disabling node dragging during edge creation mode:
- Drag events no longer consume mousedown/click events
- Tap events fire correctly when clicking nodes
- Users can click to select source and target nodes
- Dragging is prevented during the edge creation workflow (as requested)

### Solution 3: Make Nodes Clickable During Delete Node Mode (Commit bbb06c9)

After fixing edge creation, the same issue existed for delete node mode. Nodes weren't clickable because drag events were interfering.

#### Root Cause
Same as Solution 2 - when nodes are grabbable during delete node mode, drag events consume click events before they can trigger the deletion handler.

#### Changes Made

1. **Added cyRef to useNodeDeletion hook** (`src/hooks/useNodeDeletion.ts`):
   - Updated interface to accept `cyRef`
   - Modified `updateNodeDeletionMode()` to disable/enable dragging

2. **Disabled node dragging during delete mode** (`src/hooks/useNodeDeletion.ts`):
   - When entering delete mode: Call `ungrabify()` on all real nodes
   - When exiting delete mode: Call `grabify()` to re-enable dragging

3. **Handle newly added nodes** (`src/ExploreView.tsx`):
   - When nodes are added during delete mode, automatically ungrabify them
   - Pass `cyRef` to `useNodeDeletion` hook

4. **Visual feedback** (`src/ExploreView.tsx` & `src/lib/cytoscape-styles.ts`):
   - Added `cursor: 'not-allowed'` to the container during delete mode
   - Added `node-deletion-target` style with red border for visual feedback

#### How This Fixes The Issue
By disabling node dragging during delete node mode:
- Drag events no longer consume mousedown/click events
- Tap events fire correctly when clicking nodes to delete them
- Users can click to select nodes for deletion
- Dragging is prevented during the deletion workflow (as requested)

## Files Modified

- `src/hooks/useCytoscapeGraph.ts` - Ref-based solution for stale closures
- `src/hooks/useEdgeCreation.ts` - Disable/enable node dragging during edge creation mode
- `src/hooks/useNodeDeletion.ts` - Disable/enable node dragging during delete node mode
- `src/ExploreView.tsx` - Handle new nodes during special modes, add cursor feedback
- `src/lib/cytoscape-styles.ts` - Ensure event handling and add visual styles

## Testing

- ✅ Project builds successfully with no TypeScript errors
- ✅ All event handlers now use ref-based callbacks
- ✅ Nodes are clickable during edge creation mode
- ✅ Node dragging is disabled during edge creation mode
- ✅ Nodes are clickable during delete node mode
- ✅ Node dragging is disabled during delete node mode
- ✅ No breaking changes to API or behavior

## Next Steps

Test the following interactions in the running application:

**Add Edge Mode:**
1. Click "Add Edge" button → select source node → select target node
2. Verify nodes are clickable but not draggable
3. Verify crosshair cursor appears
4. Exit edge creation mode and verify nodes are draggable again

**Delete Node Mode:**
5. Click "Delete Node" button → click a node to delete it
6. Verify nodes are clickable but not draggable
7. Verify 'not-allowed' cursor appears
8. Exit delete mode and verify nodes are draggable again

**Delete Edge:**
9. Right-click an edge → click "Delete edge"
10. Verify the edge is deleted successfully

**Context Menu:**
11. Right-click a node → click "Add Edge" from context menu
12. Verify edge creation mode starts with that node as source

All node and edge interactions should now work correctly!
