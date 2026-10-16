import React, { useEffect, useRef } from 'react'
import { GOOGLE_CLIENT_ID } from '../lib/config'
import { googleSignIn } from '../lib/api'
import { setToken } from '../lib/auth'

export default function GoogleAuthButton({ onLoginSuccess }) {
  const buttonRef = useRef(null)

  useEffect(() => {
    // If Google Client ID is configured and window.google is loaded
    if (GOOGLE_CLIENT_ID && window.google?.accounts?.id && buttonRef.current) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            if (response.credential) {
              try {
                const data = await googleSignIn(response.credential)
                if (data.token) {
                  setToken(data.token)
                  if (onLoginSuccess) onLoginSuccess(data.user)
                }
              } catch (err) {
                console.error('Google Sign-In failed on backend:', err)
              }
            }
          },
        })

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'medium',
          type: 'standard',
          shape: 'pill',
          text: 'signin_with',
        })
      } catch (err) {
        console.warn('Google GSI initialization error:', err)
      }
    }
  }, [onLoginSuccess])

  // Fallback demo sign-in handler for quick testing without Google OAuth keys
  const handleDemoSignIn = async () => {
    const demoPayload = {
      name: 'Aditya Sharma',
      email: 'aditya.sharma@example.com',
      picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      sub: 'demo-google-user-123',
    }
    // Create mock JWT
    const mockToken = `header.${btoa(JSON.stringify(demoPayload))}.signature`
    try {
      const data = await googleSignIn(mockToken)
      setToken(data.token || mockToken)
      if (onLoginSuccess) onLoginSuccess(data.user || demoPayload)
    } catch {
      setToken(mockToken)
      if (onLoginSuccess) onLoginSuccess(demoPayload)
    }
  }

  if (GOOGLE_CLIENT_ID) {
    return (
      <div className="flex items-center">
        <div ref={buttonRef} />
      </div>
    )
  }

  // Beautiful fallback button styled like Google button
  return (
    <button
      onClick={handleDemoSignIn}
      type="button"
      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#111236] bg-white border border-[#DDDDE5] rounded-full hover:bg-gray-50 shadow-sm transition"
      title="Click to sign in with Demo Google Account"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        />
      </svg>
      Sign in
    </button>
  )
}
