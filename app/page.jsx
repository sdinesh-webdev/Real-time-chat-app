// page.jsx
'use client'

import Chat from './chat/[[...channel]]/chat'
import ChannelList from './chat/[[...channel]]/channel-list'
import PresenceList from './chat/[[...channel]]/message-list'
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
    
    // Create Ably client with proper presence config
    const client = useMemo(() => {
        if (!user?.id) return null
        
        return new Ably.Realtime({
            authUrl: '/api/ably',
            clientId: user.id,
            autoConnect: true,
            echoMessages: false, // Don't echo own messages back
            // CRITICAL: Enable presence
            transportParams: {
                heartbeatInterval: 15000, // 15s heartbeat
            },
        })
    }, [user?.id])
    
    // Sync user with Supabase
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
    
    // Monitor Ably connection state
    useEffect(() => {
        if (!client) return;
        
        const handleStateChange = (stateChange) => {
            console.log('Ably connection:', stateChange.current);
            
            if (stateChange.current === 'failed') {
                console.error('Ably connection failed');
            }
        };
        
        client.connection.on('connected', () => {
            console.log('✅ Ably connected');
        });
        
        client.connection.on(handleStateChange);
        
        return () => {
            client.connection.off(handleStateChange);
        };
    }, [client]);
    
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