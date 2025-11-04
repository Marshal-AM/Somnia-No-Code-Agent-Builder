"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { WorkflowNode } from "@/lib/types"

interface NodeConfigPanelProps {
  node: WorkflowNode
  updateNodeData: (nodeId: string, data: any) => void
  onClose: () => void
}

export default function NodeConfigPanel({ node, updateNodeData, onClose }: NodeConfigPanelProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Tool Information</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto">
        <div className="space-y-2">
          <Label htmlFor="tool-name">Tool Name</Label>
          <div className="p-3 bg-gray-100 rounded-md">
            <p className="text-sm font-medium">{node.data.label || node.type || "Unknown"}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tool-id">Tool ID</Label>
          <div className="p-3 bg-gray-100 rounded-md">
            <p className="text-sm font-mono">{node.type || "N/A"}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
