import type { Node, Edge } from 'reactflow'

/**
 * Convert ReactFlow nodes and edges to the tools format expected by the database
 * Note: This captures the first edge from each node. If a tool has multiple next tools,
 * only the first one will be stored. The database schema supports one next_tool per tool.
 * @param nodes - Array of workflow nodes
 * @param edges - Array of workflow edges
 * @returns Array of tools with next_tool relationships
 */
export function workflowToTools(nodes: Node[], edges: Edge[]): Array<{ tool: string; next_tool: string | null }> {
  // Create a map of node IDs to their tool types
  const nodeIdToType = new Map<string, string>()
  nodes.forEach((node) => {
    if (node.type) {
      nodeIdToType.set(node.id, node.type)
    }
  })

  // Create a map of source node IDs to target node IDs (first edge only)
  const nextTools = new Map<string, string>()
  edges.forEach((edge) => {
    const sourceType = nodeIdToType.get(edge.source)
    const targetType = nodeIdToType.get(edge.target)
    if (sourceType && targetType && !nextTools.has(sourceType)) {
      // Only set if not already set (first edge wins)
      nextTools.set(sourceType, targetType)
    }
  })

  // Create the tools array - include all unique tool types from nodes
  const tools: Array<{ tool: string; next_tool: string | null }> = []
  const processedTypes = new Set<string>()

  nodes.forEach((node) => {
    if (node.type && !processedTypes.has(node.type)) {
      processedTypes.add(node.type)
      tools.push({
        tool: node.type,
        next_tool: nextTools.get(node.type) || null,
      })
    }
  })

  return tools
}

/**
 * Convert tools format from database to ReactFlow nodes and edges
 * @param tools - Array of tools with next_tool relationships
 * @returns Object with nodes and edges arrays
 */
export function toolsToWorkflow(
  tools: Array<{ tool: string; next_tool: string | null }>
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // Create nodes for each tool
  tools.forEach((toolData, index) => {
    const node: Node = {
      id: `${toolData.tool}-${index + 1}`,
      type: toolData.tool,
      position: { x: 100 + index * 200, y: 100 },
      data: {
        label: toolData.tool,
      },
    }
    nodes.push(node)
  })

  // Create edges based on next_tool relationships
  tools.forEach((toolData, index) => {
    if (toolData.next_tool) {
      // Find the target node
      const targetIndex = tools.findIndex((t) => t.tool === toolData.next_tool)
      if (targetIndex !== -1) {
        const sourceNode = nodes[index]
        const targetNode = nodes[targetIndex]
        edges.push({
          id: `edge-${sourceNode.id}-${targetNode.id}`,
          source: sourceNode.id,
          target: targetNode.id,
          type: 'custom',
        })
      }
    }
  })

  return { nodes, edges }
}

