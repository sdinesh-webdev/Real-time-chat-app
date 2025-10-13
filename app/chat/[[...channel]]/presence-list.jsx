import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useChannel } from 'ably/react';
import { useEffect, useState } from 'react';

const PresenceList = ({ channelName }) => {
    const [members, setMembers] = useState([]);
    const { channel } = useChannel(channelName);

    useEffect(() => {
        if (!channel) {
            console.log('Channel not ready yet');
            return;
        }

        console.log('=== PRESENCE SETUP ===');
        console.log('Channel:', channelName);
        console.log('Channel object:', channel);

        // Get current presence members
        const updatePresenceList = () => {
            channel.presence.get((err, presenceMembers) => {
                if (err) {
                    console.error('Error getting presence:', err);
                    return;
                }

                console.log('=== PRESENCE DATA ===');
                console.log('Presence members:', presenceMembers);

                if (presenceMembers && presenceMembers.length > 0) {
                    const memberList = presenceMembers.map((member) => {
                        console.log('Processing member:', member);
                        return {
                            clientId: member.clientId,
                            username: member.data?.username || 'Anonymous',
                            avatarUrl: member.data?.avatarUrl || '',
                            userId: member.data?.userId,
                        };
                    });

                    console.log('Final member list:', memberList);
                    setMembers(memberList);
                } else {
                    console.log('No members in presence');
                    setMembers([]);
                }
            });
        };

        // Initial load
        updatePresenceList();

        // Subscribe to presence changes
        const handlePresenceEnter = (member) => {
            console.log('Member entered:', member);
            updatePresenceList();
        };

        const handlePresenceLeave = (member) => {
            console.log('Member left:', member);
            updatePresenceList();
        };

        const handlePresenceUpdate = (member) => {
            console.log('Member updated:', member);
            updatePresenceList();
        };

        channel.presence.subscribe('enter', handlePresenceEnter);
        channel.presence.subscribe('leave', handlePresenceLeave);
        channel.presence.subscribe('update', handlePresenceUpdate);

        // Cleanup
        return () => {
            channel.presence.unsubscribe('enter', handlePresenceEnter);
            channel.presence.unsubscribe('leave', handlePresenceLeave);
            channel.presence.unsubscribe('update', handlePresenceUpdate);
        };
    }, [channel, channelName]);

    return (
        <div className="h-full">
            <h2 className="text-sm font-semibold text-gray-500 mb-4 px-3">
                Online ({members.length})
            </h2>
            
            {/* Debug info - remove after fixing */}
            <div className="px-3 mb-4 p-2 bg-gray-100 rounded text-xs">
                <div>Channel: {channelName}</div>
                <div>Members found: {members.length}</div>
                <div>Check console for details</div>
            </div>
            
            <ul className="space-y-2">
                {members.map((member, idx) => (
                    <li 
                        key={member.clientId || idx} 
                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-md transition-colors"
                    >
                        <div className="relative">
                            <Avatar className="h-8 w-8">
                                <AvatarImage 
                                    src={member.avatarUrl} 
                                    alt={member.username} 
                                />
                                <AvatarFallback className="text-xs bg-blue-500 text-white">
                                    {member.username[0]?.toUpperCase() || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            {/* Online status indicator */}
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
                {members.length === 0 && (
                    <li className="text-center text-gray-500 text-sm py-8">
                        <p>No members online</p>
                        <p className="text-xs mt-2 text-gray-400">
                            Check console for debug info
                        </p>
                    </li>
                )}
            </ul>
        </div>
    );
};

export default PresenceList;