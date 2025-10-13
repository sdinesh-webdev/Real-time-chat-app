import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const MessageInput = ({ onSubmit, disabled }) => {
    const [input, setInput] = useState('')

    const handleChange = (e) => {
        setInput(e.target.value)
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        const trimmedInput = input.trim()
        if (trimmedInput) {
            onSubmit(trimmedInput)
            setInput('')
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
                type='text'
                value={input}
                onChange={handleChange}
                disabled={disabled}
                placeholder={disabled ? 'Only moderators can post here' : 'Type your message...'}
                className='flex-1'
            />
            <Button 
                type="submit" 
                disabled={disabled || !input.trim()}
            >
                Send
            </Button>
        </form>
    )
}

export default MessageInput