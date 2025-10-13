// app/api/ably/route.jsx
import { currentUser } from "@clerk/nextjs/server";
import { SignJWT } from "jose";

const createToken = async (clientId, apiKey, capability) => {
    const [appId, signingKey] = apiKey.split(':', 2)
    const enc = new TextEncoder()
    
    const token = await new SignJWT({
        'x-ably-capability': JSON.stringify(capability),
        'x-ably-clientId': clientId,
    })
        .setProtectedHeader({ kid: appId, alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(enc.encode(signingKey))
    
    return token
}

const generateCapability = (userMetadata) => {
    // Check if user is a moderator
    if (userMetadata?.isMod) {
        return { '*': ['*'] }
    } else {
        // Regular user capabilities - MUST include presence
        return {
            'chat:general': ['subscribe', 'publish', 'presence', 'history'],
            'chat:random': ['subscribe', 'publish', 'presence', 'history'],
            'chat:announcements': ['subscribe', 'presence', 'history'], // Read-only for regular users
        }
    }
}

export const GET = async () => {
    try {
        const user = await currentUser()
        
        if (!user) {
            return new Response('Unauthorized', { status: 401 })
        }

        console.log('=== GENERATING ABLY TOKEN ===');
        console.log('User ID:', user.id);
        console.log('Username:', user.username || user.firstName);
        console.log('Is Mod:', user.publicMetadata?.isMod || false);

        const userMetadata = user.publicMetadata || {}
        const userCapability = generateCapability(userMetadata)
        
        console.log('Generated capability:', userCapability);
        
        const token = await createToken(
            user.id, 
            process.env.NEXT_PUBLIC_ABL_KEY, 
            userCapability
        )
        
        console.log('✅ Token generated successfully');
        
        // Return token as plain text for Ably
        return new Response(token, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain',
            },
        })
    } catch (error) {
        console.error('❌ Ably token generation error:', error)
        return new Response('Internal Server Error', { status: 500 })
    }
}