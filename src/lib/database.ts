import { supabase, Course, Node, Edge } from './supabase'

// Course operations
export const getCourses = async (): Promise<Course[]> => {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('name')
  
  if (error) throw error
  return data || []
}

export const createCourse = async (course: Omit<Course, 'id' | 'created_at'>): Promise<Course> => {
  const { data, error } = await supabase
    .from('courses')
    .insert(course)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Node operations
export const getNodes = async (courseId?: string): Promise<Node[]> => {
  let query = supabase
    .from('nodes')
    .select('*')
    .order('title')
  
  if (courseId) {
    query = query.eq('course_id', courseId)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return data || []
}

export const getNodesByCourse = async (): Promise<Record<string, Node[]>> => {
  const { data, error } = await supabase
    .from('nodes')
    .select('*')
    .order('title')
  
  if (error) throw error
  
  // Group nodes by course_id
  const grouped: Record<string, Node[]> = {}
  data?.forEach(node => {
    if (!grouped[node.course_id]) {
      grouped[node.course_id] = []
    }
    grouped[node.course_id].push(node)
  })
  
  return grouped
}

export const createNode = async (node: Omit<Node, 'id' | 'created_at' | 'updated_at'>): Promise<Node> => {
  const { data, error } = await supabase
    .from('nodes')
    .insert(node)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const updateNode = async (id: string, updates: Partial<Node>): Promise<Node> => {
  const { data, error } = await supabase
    .from('nodes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const updateNodePosition = async (id: string, pos: { x: number; y: number }): Promise<void> => {
  console.log('Updating node position in database:', { id, pos });
  
  const { error } = await supabase
    .from('nodes')
    .update({ pos, updated_at: new Date().toISOString() })
    .eq('id', id)
  
  if (error) {
    console.error('Database error updating position:', error);
    throw error;
  }
  
  console.log('Position updated successfully in database');
}

export const deleteNode = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('nodes')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Edge operations
export const getEdges = async (): Promise<Edge[]> => {
  const { data, error } = await supabase
    .from('edges')
    .select('*')
  
  if (error) throw error
  return data || []
}

export const createEdge = async (edge: Omit<Edge, 'created_at'>): Promise<Edge> => {
  const { data, error } = await supabase
    .from('edges')
    .insert(edge)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const deleteEdge = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('edges')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export const updateEdge = async (id: string, updates: Partial<Edge>): Promise<Edge> => {
  const { data, error } = await supabase
    .from('edges')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Get complete graph data
export const getGraphData = async () => {
  const [nodes, edges] = await Promise.all([
    getNodes(),
    getEdges()
  ])
  
  return { nodes, edges }
}




