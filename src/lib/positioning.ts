import { Node } from './supabase';

export interface Position {
  x: number;
  y: number;
}

export interface NodeWithPosition extends Node {
  pos?: Position;
}

// Position management for nodes
export class NodePositionManager {
  private static readonly MAX_ROWS = 4;
  private static readonly GROUP_SPACING = 800;
  private static readonly NODE_SPACING = 200;
  private static readonly RANDOM_OFFSET = 40;

  /**
   * Generate positions for nodes grouped by course
   */
  static generatePositions(nodes: Node[], courses: any[]): NodeWithPosition[] {
    // Group nodes by course (using the first tag as course identifier)
    const tagGroups: Record<string, Node[]> = {};
    nodes.forEach((n) => {
      const courseName = (n.tags && n.tags[0]) || "other";
      if (!tagGroups[courseName]) tagGroups[courseName] = [];
      tagGroups[courseName].push(n);
    });

    const nodesWithPositions: NodeWithPosition[] = [];
    let groupIndex = 0;

    Object.keys(tagGroups).forEach((courseName) => {
      const group = tagGroups[courseName];
      const groupX = groupIndex * this.GROUP_SPACING;

      group.forEach((n, i) => {
        const row = i % this.MAX_ROWS;
        const col = Math.floor(i / this.MAX_ROWS);

        // Add some randomness within the group
        const randomOffsetX = (Math.random() - 0.5) * this.RANDOM_OFFSET;
        const randomOffsetY = (Math.random() - 0.5) * this.RANDOM_OFFSET;

        const x = groupX + (col * this.NODE_SPACING) + randomOffsetX;
        const y = (row * this.NODE_SPACING) + randomOffsetY;

        nodesWithPositions.push({
          ...n,
          pos: { x, y }
        });
      });

      groupIndex++;
    });

    return nodesWithPositions;
  }

  /**
   * Find a non-overlapping position for a new node
   */
  static findNonOverlappingPosition(existingNodes: NodeWithPosition[], courseName: string): Position {
    const existingPositions = existingNodes
      .filter(n => (n.tags && n.tags[0]) === courseName)
      .map(n => n.pos)
      .filter(Boolean) as Position[];

    const groupIndex = this.getGroupIndex(courseName, existingNodes);
    const groupX = groupIndex * this.GROUP_SPACING;

    // Try to find a position that doesn't overlap
    for (let row = 0; row < this.MAX_ROWS; row++) {
      for (let col = 0; col < 10; col++) { // Try up to 10 columns
        const x = groupX + (col * this.NODE_SPACING);
        const y = row * this.NODE_SPACING;

        const isOverlapping = existingPositions.some(pos => 
          Math.abs(pos.x - x) < this.NODE_SPACING * 0.8 && 
          Math.abs(pos.y - y) < this.NODE_SPACING * 0.8
        );

        if (!isOverlapping) {
          return { x, y };
        }
      }
    }

    // Fallback: place at the end of the group
    const maxCol = Math.max(0, ...existingPositions.map(p => 
      Math.floor((p.x - groupX) / this.NODE_SPACING)
    ));
    return {
      x: groupX + ((maxCol + 1) * this.NODE_SPACING),
      y: 0
    };
  }

  /**
   * Get the group index for a course
   */
  private static getGroupIndex(courseName: string, existingNodes: NodeWithPosition[]): number {
    const uniqueCourses = [...new Set(existingNodes.map(n => n.tags?.[0]).filter(Boolean))];
    return uniqueCourses.indexOf(courseName);
  }

  /**
   * Check if a position is valid (not overlapping)
   */
  static isPositionValid(position: Position, existingNodes: NodeWithPosition[], excludeNodeId?: string): boolean {
    const otherNodes = existingNodes.filter(n => n.id !== excludeNodeId);
    return !otherNodes.some(n => 
      n.pos && 
      Math.abs(n.pos.x - position.x) < this.NODE_SPACING * 0.8 && 
      Math.abs(n.pos.y - position.y) < this.NODE_SPACING * 0.8
    );
  }
}
