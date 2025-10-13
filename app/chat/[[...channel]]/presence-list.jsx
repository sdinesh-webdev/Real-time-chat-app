// presence-list.jsx - SUPABASE REALTIME
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const PresenceList = ({ channelName }) => {
    const [members, setMembers] = useState([]);
    
    useEffect(() => {
        const channelNameOnly = channelName.replace('chat:', '');
        let presenceChannel;
        
        const setupPresence = async () => {
            // Initial fetch
            await fetchOnlineUsers(channelNameOnly);
            
            // Subscribe to realtime changes
            presenceChannel = supabase
                .channel(`presence:${channelNameOnly}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'user_presence',
                        filter: `channel_name=eq.${channelNameOnly}`
                    },
                    async (payload) => {
                        console.log('Presence change:', payload);
                        // Refetch on any change
                        await fetchOnlineUsers(channelNameOnly);
                    }
                )
                .subscribe((status) => {
                    console.log('Presence subscription status:', status);
                });
        };
        
        const fetchOnlineUsers = async (channel) => {
            try {
                const response = await fetch(`/api/presence?channel=${channel}`);
                
                if (!response.ok) {
                    throw new Error('Failed to fetch presence');
                }
                
                const { users } = await response.json();
                
                const memberList = users.map(presence => ({
                    clientId: presence.user_id,
                    username: presence.user.username,
                    avatarUrl: presence.user.avatar_url,
                    userId: presence.user.id,
                }));
                
                setMembers(memberList);
            } catch (error) {
                console.error('Error fetching online users:', error);
            }
        };
        
        setupPresence();
        
        // Cleanup
        return () => {
            if (presenceChannel) {
                supabase.removeChannel(presenceChannel);
            }
        };
    }, [channelName]);

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-3 mb-4">
                <h2 className="text-sm font-semibold text-gray-500">
                    Online
                </h2>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                    {members.length}
                </span>
            </div>
            
            {members.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-gray-400 px-3">
                        <div className="text-3xl mb-2">👋</div>
                        <p className="text-sm">No one else is here</p>
                        <p className="text-xs mt-1">Be the first to say hello!</p>
                    </div>
                </div>
            ) : (
                <ul className="space-y-2 overflow-y-auto">
                    {members.map((member, idx) => (
                        <li 
                            key={member.userId || idx} 
                            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-md transition-colors"
                        >
                            <div className="relative">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage 
                                        src={member.avatarUrl} 
                                        alt={member.username} 
                                    />
                                    <AvatarFallback className="text-xs bg-blue-500 text-white">
                                        {member.username[0]?.toUpperCase() || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                <div 
                                    className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500"
                                    title="Online"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {member.username}
                                </p>
                                <p className="text-xs text-green-600 font-medium">
                                    Online
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default PresenceList;