// presence-list.jsx
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from 'react';
import { useChannel } from 'ably/react';

const PresenceList = ({ channelName }) => {
    const [members, setMembers] = useState([]);
    
    // Subscribe to Ably presence events for INSTANT updates
    const { channel } = useChannel(channelName, () => {});
    
    useEffect(() => {
        if (!channel) return;
        
        // Get initial presence
        channel.presence.get((err, members) => {
            if (err) {
                console.error('Error getting presence:', err);
                return;
            }
            
            const memberList = members.map(member => ({
                clientId: member.clientId,
                username: member.data?.username || 'Unknown',
                avatarUrl: member.data?.avatarUrl || '',
                userId: member.clientId,
            }));
            
            setMembers(memberList);
        });
        
        // Listen to presence changes (enter/leave) - INSTANT UPDATES
        const presenceEnter = (member) => {
            setMembers(prev => {
                // Avoid duplicates
                if (prev.some(m => m.clientId === member.clientId)) {
                    return prev;
                }
                
                return [...prev, {
                    clientId: member.clientId,
                    username: member.data?.username || 'Unknown',
                    avatarUrl: member.data?.avatarUrl || '',
                    userId: member.clientId,
                }];
            });
        };
        
        const presenceLeave = (member) => {
            setMembers(prev => prev.filter(m => m.clientId !== member.clientId));
        };
        
        channel.presence.subscribe('enter', presenceEnter);
        channel.presence.subscribe('leave', presenceLeave);
        
        return () => {
            channel.presence.unsubscribe('enter', presenceEnter);
            channel.presence.unsubscribe('leave', presenceLeave);
        };
    }, [channel]);

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