import { supabase } from "./supabase";
import { Edge, Node } from "./supabase";

export async function mergeDuplicateNodesBySlug(slug: string): Promise<{ keptNode: Node, removedIds: string[] }> {
  const { data: nodes, error } = await supabase
    .from("nodes")
    .select("*")
    .eq("id", slug);

  if (error) throw error;
  if (!nodes || nodes.length < 2) {
    throw new Error("No duplicates found for this slug.");
  }

  const sortedNodes = [...nodes].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const primaryNode = sortedNodes[0];
  const duplicateNodes = sortedNodes.slice(1);
  const duplicateIds = duplicateNodes.map(n => n.id);

  const allLinks = new Set<string>();
  const allDetails: Record<string, any> = {};

  for (const node of sortedNodes) {
    if (node.links) {
      for (const link of node.links) {
        allLinks.add(link);
      }
    }
    if (node.details) {
      Object.assign(allDetails, node.details);
    }
  }

  const { data: updatedNode, error: updateError } = await supabase
    .from("nodes")
    .update({
      links: Array.from(allLinks),
      details: allDetails,
    })
    .eq("id", primaryNode.id)
    .select()
    .single();

  if (updateError) throw updateError;

  const { data: edgesToUpdate, error: edgesError } = await supabase
    .from("edges")
    .select("*")
    .in("source", duplicateIds)
    .or(`target.in.(${duplicateIds.join(",")})`);

  if (edgesError) throw edgesError;

  if (edgesToUpdate) {
    for (const edge of edgesToUpdate) {
      const updates: Partial<Edge> = {};
      if (duplicateIds.includes(edge.source)) {
        updates.source = primaryNode.id;
      }
      if (duplicateIds.includes(edge.target)) {
        updates.target = primaryNode.id;
      }
      await supabase.from("edges").update(updates).eq("id", edge.id);
    }
  }

  const { error: deleteError } = await supabase
    .from("nodes")
    .delete()
    .in("id", duplicateIds);

  if (deleteError) throw deleteError;

  return { keptNode: updatedNode, removedIds: duplicateIds };
}
