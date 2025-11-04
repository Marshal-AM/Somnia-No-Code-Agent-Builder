"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Wallet, Plus, Download, Copy, Check } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { createWallet, getAddressFromPrivateKey, isValidPrivateKey, saveWalletToUser, getTokenBalances } from "@/lib/wallet"
import { toast } from "@/components/ui/use-toast"
import { useEffect } from "react"

export function AgentWallet() {
  const { user, dbUser, syncUser, loading } = useAuth()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [privateKeyInput, setPrivateKeyInput] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [tokenBalances, setTokenBalances] = useState<{ somi: string; stt: string } | null>(null)

  useEffect(() => {
    if (dbUser?.wallet_address) {
      fetchBalances()
    }
  }, [dbUser?.wallet_address])

  const fetchBalances = async () => {
    if (!dbUser?.wallet_address) return
    try {
      const balances = await getTokenBalances(dbUser.wallet_address)
      setTokenBalances(balances)
    } catch (error) {
      console.error("Error fetching balances:", error)
    }
  }

  const handleCreateWallet = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      const wallet = createWallet()
      await saveWalletToUser(user.id, wallet.address, wallet.privateKey)
      await syncUser()
      toast({
        title: "Wallet created",
        description: "Your agent wallet has been created successfully",
      })
      setShowCreateDialog(false)
    } catch (error: any) {
      toast({
        title: "Error creating wallet",
        description: error.message || "Failed to create wallet",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleImportWallet = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      })
      return
    }

    if (!privateKeyInput.trim()) {
      toast({
        title: "Invalid input",
        description: "Please enter a private key",
        variant: "destructive",
      })
      return
    }

    // Clean the private key (remove 0x if present, add it back)
    const cleanKey = privateKeyInput.trim().startsWith('0x') 
      ? privateKeyInput.trim() 
      : `0x${privateKeyInput.trim()}`

    if (!isValidPrivateKey(cleanKey)) {
      toast({
        title: "Invalid private key",
        description: "Please enter a valid private key",
        variant: "destructive",
      })
      return
    }

    setIsImporting(true)
    try {
      const address = getAddressFromPrivateKey(cleanKey)
      await saveWalletToUser(user.id, address, cleanKey)
      await syncUser()
      toast({
        title: "Wallet imported",
        description: "Your wallet has been imported successfully",
      })
      setShowImportDialog(false)
      setPrivateKeyInput("")
    } catch (error: any) {
      toast({
        title: "Error importing wallet",
        description: error.message || "Failed to import wallet",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  const copyAddress = () => {
    if (dbUser?.wallet_address) {
      navigator.clipboard.writeText(dbUser.wallet_address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: "Copied",
        description: "Wallet address copied to clipboard",
      })
    }
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          Agent Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {dbUser?.wallet_address ? (
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">Wallet Address</Label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-foreground">
                  {dbUser.wallet_address.slice(0, 6)}...{dbUser.wallet_address.slice(-4)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={copyAddress}
                  title="Copy address"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">SOMI</div>
                <div className="text-sm font-semibold">
                  {tokenBalances?.somi || "0.00"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">STT</div>
                <div className="text-sm font-semibold">
                  {tokenBalances?.stt || "0.00"}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              No wallet configured
            </p>
            <div className="flex gap-2">
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-3 w-3 mr-1" />
                    Create Wallet
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Agent Wallet</DialogTitle>
                    <DialogDescription>
                      A new wallet will be generated for your agent. Make sure to securely store your private key.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreateWallet} disabled={isCreating}>
                      {isCreating ? "Creating..." : "Create Wallet"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-3 w-3 mr-1" />
                    Import Wallet
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import Wallet</DialogTitle>
                    <DialogDescription>
                      Enter your private key to import an existing wallet.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="privateKey">Private Key</Label>
                      <Input
                        id="privateKey"
                        type="password"
                        placeholder="0x..."
                        value={privateKeyInput}
                        onChange={(e) => setPrivateKeyInput(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Your private key will be encrypted and stored securely.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowImportDialog(false)
                        setPrivateKeyInput("")
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleImportWallet} disabled={isImporting}>
                      {isImporting ? "Importing..." : "Import Wallet"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

