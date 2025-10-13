// message-list.jsx
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const MessageList = ({ messages, currentUserId }) => {
    if (!messages || messages.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                <p>No messages yet. Start the conversation!</p>
            </div>
        )
    }

    const createLi = (msg, index) => {
        const isOwnMessage = msg.data?.userId === currentUserId
        
        return (
            <li 
                key={msg.id || index} 
                className={`my-4 flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
            >
                <div className={`flex items-start gap-3 max-w-[70%] ${
                    isOwnMessage ? 'flex-row-reverse' : 'flex-row'
                }`}>
                    <Avatar className="flex-shrink-0">
                        <AvatarImage src={msg.data?.avatarUrl} alt={msg.data?.username || 'User'} />
                        <AvatarFallback>
                            {msg.data?.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                    </Avatar>
                    <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                        <div className={`flex items-center gap-2 mb-1 ${
                            isOwnMessage ? 'flex-row-reverse' : 'flex-row'
                        }`}>
                            <span className="font-semibold text-sm text-gray-700">
                                {isOwnMessage ? 'You' : msg.data?.username || 'Anonymous'}
                            </span>
                        </div>
                        <div className={`rounded-2xl px-4 py-2 ${
                            isOwnMessage 
                                ? 'bg-blue-600 text-white rounded-tr-sm' 
                                : 'bg-gray-200 text-gray-800 rounded-tl-sm'
                        }`}>
                            <p className="break-words">{msg.data?.text}</p>
                        </div>
                    </div>
                </div>
            </li>
        )
    }
    
    return (
        <ul className="space-y-1">
            {messages.map(createLi)}
        </ul>
    )
}

export default MessageList