'use client'

import { useState, useEffect, useRef } from 'react'

interface Message {
  id: string
  content: string
  isUser: boolean
  translationInfo?: string
  timestamp: Date
  detectedLanguage?: string
}

interface ChatResponse {
  originalMessage: string
  detectedLanguage: string
  translatedUserMessage: string | null
  response: string
  responseLanguage: string
}

const LANGUAGES: Record<string, string> = {
  'en': 'English',
  'es': 'Español',
  'fr': 'Français',
  'de': 'Deutsch',
  'it': 'Italiano',
  'pt': 'Português',
  'ru': 'Русский',
  'ja': '日本語',
  'ko': '한국어',
  'zh': '中文',
  'ar': 'العربية',
  'hi': 'हिन्दी'
}

export default function MultilingualChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: '👋 Hello! I\'m your multilingual chatbot. Type a message in any language and I\'ll respond in your preferred language!',
      isUser: false,
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [targetLanguage, setTargetLanguage] = useState('en')
  const [loading, setLoading] = useState(false)
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Check server status
  const checkServerStatus = async () => {
    try {
      const response = await fetch('/api/chat')
      const data = await response.json()
      setServerStatus(data.status === 'healthy' ? 'online' : 'offline')
    } catch (error) {
      setServerStatus('offline')
    }
  }

  useEffect(() => {
    checkServerStatus()
    const interval = setInterval(checkServerStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  // Send message
  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      isUser: true,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          targetLanguage
        })
      })

      const data: ChatResponse = await response.json()

      if (response.ok) {
        const translationInfo = data.translatedUserMessage 
          ? `Your message in ${LANGUAGES[targetLanguage]}: "${data.translatedUserMessage}"`
          : undefined

        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          isUser: false,
          translationInfo,
          timestamp: new Date(),
          detectedLanguage: data.detectedLanguage
        }

        setMessages(prev => [...prev, botMessage])
      } else {
        // Use type assertion to access error property if present
        const errorMsg = (data as any).error || 'Failed to get response';
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Clear chat history
  const clearChat = () => {
    setMessages([
      {
        id: '1',
        content: '👋 Hello! I\'m your multilingual chatbot. Type a message in any language and I\'ll respond in your preferred language!',
        isUser: false,
        timestamp: new Date()
      }
    ])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8 h-screen flex flex-col">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-between items-center mb-4">
            <div></div>
            <h1 className="text-4xl font-bold text-cyan-100">🌍 Multilingual Chatbot</h1>
            <div className={`status-indicator ${
              serverStatus === 'online' ? 'status-online' : 
              serverStatus === 'offline' ? 'status-offline' : 'status-checking'
            }`}>
              {serverStatus === 'online' ? 'Online' : 
               serverStatus === 'offline' ? 'Offline' : 'Checking...'}
            </div>
          </div>
          <p className="text-cyan-200/80 text-lg mb-4">Chat in any language - I'll understand and respond!</p>
          
          {/* Language Selector */}
          <div className="flex justify-center items-center space-x-4">
            <label htmlFor="targetLanguage" className="text-cyan-100 font-medium">Reply in:</label>
            <select
              id="targetLanguage"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="language-select px-4 py-2 rounded-lg font-medium cursor-pointer focus:ring-2 focus:ring-emerald-500"
            >
              {Object.entries(LANGUAGES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
            <button
              onClick={clearChat}
              className="px-4 py-2 bg-orange-600/80 text-white rounded-lg hover:bg-orange-500 transition-colors text-sm"
            >
              Clear Chat
            </button>
          </div>
        </div>

        {/* Chat Container */}
        <div className="flex-1 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 flex flex-col overflow-hidden">
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] p-4 rounded-xl chat-message ${
                    message.isUser
                      ? 'message-user'
                      : 'message-bot'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  {message.translationInfo && (
                    <div className="translation-info">
                      {message.translationInfo}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="message-bot p-4 rounded-xl flex items-center space-x-2">
                  <span className="text-slate-600">Thinking</span>
                  <div className="loading-dots">
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 border-t border-slate-700/50">
            <div className="flex space-x-4 items-end">
              <div className="flex-1">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message in any language..."
                  className="chat-input w-full p-4 rounded-lg resize-none focus:ring-2 focus:ring-emerald-500 text-slate-800 placeholder-slate-500"
                  rows={1}
                  style={{ minHeight: '56px', maxHeight: '120px' }}
                  disabled={loading}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={loading || !inputMessage.trim()}
                className="send-button px-6 py-4 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}