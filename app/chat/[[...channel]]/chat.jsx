// chat.jsx
import MessageInput from "./message-input"
import MessageList from "./message-list"
import { useUser } from "@clerk/nextjs"
import { useReducer, useEffect, useState, useCallback } from "react"
import { useChannel } from 'ably/react'

const ADD = 'ADD'
const LOAD_HISTORY = 'LOAD_HISTORY'

const reducer = (prev, event) => {
    switch (event.name) {
        case ADD:
            // Avoid duplicates
            if (prev.some(msg => msg.id === event.id)) {
                return prev
            }
            return [...prev, event]
        case LOAD_HISTORY:
            return event.data
        default:
            return prev
    }
}

const Chat = ({ channelName }) => {
    const { user } = useUser()
    const [messages, dispatch] = useReducer(reducer, [])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)
    
    // Use the channel hook
    const { channel } = useChannel(channelName, (message) => {
        dispatch(message);
    });
    
    // Load message history from API
    useEffect(() => {
        const loadMessages = async () => {
            setIsLoading(true)
            setError(null)
            
            try {
                const channelNameOnly = channelName.replace('chat:', '')
                const response = await fetch(`/api/messages?channel=${channelNameOnly}`)
                
                if (!response.ok) {
                    throw new Error('Failed to load messages')
                }
                
                const { messages: data } = await response.json()

                // Transform API messages to match Ably format
                const transformedMessages = data.map(msg => ({
                    id: msg.id,
                    name: ADD,
                    data: {
                        text: msg.content,
                        username: msg.user.username,
                        avatarUrl: msg.user.avatar_url,
                        userId: msg.user.id,
                    },
                    timestamp: new Date(msg.created_at).getTime(),
                }))
                
                dispatch({ name: LOAD_HISTORY, data: transformedMessages })
            } catch (err) {
                console.error('Error loading messages:', err)
                setError('Failed to load message history')
            } finally {
                setIsLoading(false)
            }
        }

        loadMessages()
    }, [channelName])
    
    // Set up presence in Supabase
    useEffect(() => {
        if (!user || !channelName) {
            console.log('User or channel not ready for presence');
            return;
        }

        const channelNameOnly = channelName.replace('chat:', '');

        console.log('=== JOINING CHANNEL ===');
        console.log('Channel:', channelNameOnly);
        console.log('User:', user.id, user.username || user.firstName);

        // Join the channel (mark as online)
        const joinChannel = async () => {
            try {
                await fetch('/api/presence', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        channelName: channelNameOnly,
                        action: 'join'
                    }),
                });
                console.log('✅ Successfully joined channel');
            } catch (error) {
                console.error('Error joining channel:', error);
            }
        };

        joinChannel();

        // Send heartbeat every 30 seconds to keep presence alive
        const heartbeatInterval = setInterval(async () => {
            try {
                await fetch('/api/presence', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        channelName: channelNameOnly,
                        action: 'heartbeat'
                    }),
                });
                console.log('💓 Heartbeat sent');
            } catch (error) {
                console.error('Error sending heartbeat:', error);
            }
        }, 30000); // Every 30 seconds

        // Cleanup - leave channel when component unmounts
        return () => {
            console.log('=== LEAVING CHANNEL ===');
            clearInterval(heartbeatInterval);
            
            // Mark as offline
            fetch(`/api/presence?channel=${channelNameOnly}`, {
                method: 'DELETE',
            }).then(() => {
                console.log('✅ Left channel');
            }).catch(error => {
                console.error('Error leaving channel:', error);
            });
        };
    }, [user, channelName])
    
    // Check if this is a read-only channel for non-mods
    const isReadOnly = channelName === 'chat:announcements' && !user?.publicMetadata?.isMod
    
    const publishMessage = useCallback(async (text) => {
        if (!user || isReadOnly) return
        
        try {
            const channelNameOnly = channelName.replace('chat:', '')
            
            // Save to database via API
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    channelName: channelNameOnly,
                    content: text,
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to send message')
            }

            const { message: data } = await response.json()

            // Create message object
            const messageObj = {
                name: ADD,
                id: data.id,
                data: {
                    text: data.content,
                    avatarUrl: data.user.avatar_url,
                    username: data.user.username,
                    userId: data.user.id,
                },
                timestamp: Date.now(),
            }

            // Add to local state immediately for instant feedback
            dispatch(messageObj)

            // Publish to Ably for other users
            channel.publish(messageObj)
        } catch (err) {
            console.error('Error publishing message:', err)
            alert('Failed to send message. Please try again.')
        }
    }, [user, isReadOnly, channel, channelName])

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading messages...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-2">{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="text-blue-600 hover:underline"
                    >
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="flex-1 overflow-y-auto p-5">
                {isReadOnly && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                        <p className="text-sm text-yellow-800">
                            📢 This is a read-only channel. Only moderators can post announcements.
                        </p>
                    </div>
                )}
                <MessageList messages={messages} currentUserId={user?.id} />
            </div>
            <div className="p-5 border-t border-gray-200 bg-white">
                <MessageInput onSubmit={publishMessage} disabled={isReadOnly} />
            </div>
        </>
    )
}

export default Chat