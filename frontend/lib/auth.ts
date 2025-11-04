'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useEffect, useState } from 'react'
import { supabase, type User } from './supabase'

export function useAuth() {
  const { ready, authenticated, user, login, logout } = usePrivy()
  const [dbUser, setDbUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (ready && authenticated && user) {
      syncUser()
    } else {
      setDbUser(null)
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, user])

  const syncUser = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      // Check if user exists
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        // Error other than "not found"
        console.error('Error fetching user:', fetchError)
        setLoading(false)
        return
      }

      if (existingUser) {
        // User exists, update if needed
        setDbUser(existingUser)
      } else {
        // User doesn't exist, create new user
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            private_key: null,
            wallet_address: null,
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating user:', createError)
        } else {
          setDbUser(newUser)
        }
      }
    } catch (error) {
      console.error('Error syncing user:', error)
    } finally {
      setLoading(false)
    }
  }

  return {
    ready,
    authenticated,
    user,
    dbUser,
    loading,
    login,
    logout,
    syncUser,
  }
}

