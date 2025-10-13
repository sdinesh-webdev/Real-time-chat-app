// page.jsx
'use client'

import Chat from './chat'
import ChannelList from './channel-list'
import PresenceList from './presence-list'
import * as Ably from 'ably'
import { AblyProvider, ChannelProvider } from 'ably/react'
import { use, useMemo, useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'

const Page = ({ params }) => {
    const { user, isLoaded } = useUser()
    const { channel } = use(params)
    const [isSynced, setIsSynced] = useState(false)
    
    const channels = [
        { path: '/chat/announcements', label: '# Announcements' },
        { path: '/chat/general', label: '# General' },
        { path: '/chat/random', label: '# Random' },
    ]
    
    // Create Ably client with useMemo (MUST be before any conditional returns)
    const client = useMemo(() => {
        if (!user?.id) return null
        
        return new Ably.Realtime({
            authUrl: '/api/ably',
            clientId: user.id,
            autoConnect: true,
            echoMessages: true, // Changed to true so you can see your own messages
        })
    }, [user?.id])
    
    // Sync user with Supabase when they load the page
    useEffect(() => {
        const syncUser = async () => {
            if (!user) return
            
            try {
                const response = await fetch('/api/sync-user', {
                    method: 'POST',
                })
                
                if (response.ok) {
                    setIsSynced(true)
                } else {
                    console.error('Failed to sync user with Supabase')
                }
            } catch (error) {
                console.error('Error syncing user:', error)
            }
        }
        
        syncUser()
    }, [user])
    
    // Show loading state while user data is loading or syncing
    if (!isLoaded || !isSynced) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-72.8px)]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        )
    }
    
    // Redirect to sign in if not authenticated
    if (!user || !client) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-72.8px)]">
                <p>Please sign in to access chat.</p>
            </div>
        )
    }
    
    const channelName = `chat:${channel}`
    
    return (
        <AblyProvider client={client}>
            <ChannelProvider channelName={channelName}>
                <div className="grid h-[calc(100vh-72.8px)] grid-cols-4">
                    <div className="border-r border-gray-200 p-5">
                        <ChannelList channels={channels} />
                    </div>
                    <div className="col-span-2 flex flex-col">
                        <Chat channelName={channelName} />
                    </div>
                    <div className="border-l border-gray-200 p-5">
                        <PresenceList channelName={channelName} />
                    </div>
                </div>
            </ChannelProvider>
        </AblyProvider>
    )
}

export default Page