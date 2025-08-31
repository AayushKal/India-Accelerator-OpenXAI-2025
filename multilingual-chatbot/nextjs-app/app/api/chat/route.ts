import { NextRequest, NextResponse } from 'next/server';

// Supported languages
const LANGUAGES: Record<string, string> = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'ja': 'Japanese',
  'ko': 'Korean',
  'zh': 'Chinese',
  'ar': 'Arabic',
  'hi': 'Hindi'
};

interface ChatRequest {
  message: string;
  targetLanguage?: string;
}

interface ChatResponse {
  originalMessage: string;
  detectedLanguage: string;
  translatedUserMessage: string | null;
  response: string;
  responseLanguage: string;
}

// Function to detect language of input text
async function detectLanguage(text: string): Promise<string> {
  try {
    const prompt = `Detect the language of this text and respond with ONLY the two-letter language code (en, es, fr, de, it, pt, ru, ja, ko, zh, ar, hi). Text: "${text}"`;
    
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3:latest',
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to detect language');
    }

    const data = await response.json();
    const detectedLang = data.response.trim().toLowerCase();
    return LANGUAGES[detectedLang] ? detectedLang : 'en';
  } catch (error) {
    console.error('Language detection error:', error);
    return 'en'; // Default to English
  }
}

// Function to translate text
async function translateText(text: string, fromLang: string, toLang: string): Promise<string> {
  if (fromLang === toLang) return text;
  
  try {
    const fromLangName = LANGUAGES[fromLang] || 'English';
    const toLangName = LANGUAGES[toLang] || 'English';
    
    const prompt = `Translate this text from ${fromLangName} to ${toLangName}. Respond with ONLY the translation, no explanations or additional text: "${text}"`;
    
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3:latest',
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to translate text');
    }

    const data = await response.json();
    return data.response.trim();
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Return original if translation fails
  }
}

// Function to generate chatbot response
async function generateResponse(message: string, language: string): Promise<string> {
  try {
    const languageName = LANGUAGES[language] || 'English';
    const prompt = `You are a helpful, friendly chatbot. Respond to the user's message in ${languageName}. Keep your responses conversational and engaging. User message: "${message}"`;
    
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3:latest',
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate response');
    }

    const data = await response.json();
    return data.response.trim();
  } catch (error) {
    console.error('Response generation error:', error);
    return language === 'en' 
      ? "I'm sorry, I'm having trouble responding right now. Please try again."
      : await translateText("I'm sorry, I'm having trouble responding right now. Please try again.", 'en', language);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, targetLanguage = 'en' } = body;
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    
    // Step 1: Detect the language of the input message
    const detectedLanguage = await detectLanguage(message);
    console.log(`Detected language: ${detectedLanguage}`);
    
    // Step 2: Translate message to English for processing (if needed)
    const messageInEnglish = detectedLanguage !== 'en' 
      ? await translateText(message, detectedLanguage, 'en')
      : message;
    
    // Step 3: Generate response in English
    const responseInEnglish = await generateResponse(messageInEnglish, 'en');
    
    // Step 4: Translate response to target language (if needed)
    const finalResponse = targetLanguage !== 'en'
      ? await translateText(responseInEnglish, 'en', targetLanguage)
      : responseInEnglish;
    
    // Step 5: Also provide original message translation if user wants to see it
    const translatedUserMessage = targetLanguage !== detectedLanguage
      ? await translateText(message, detectedLanguage, targetLanguage)
      : null;
    
    const response: ChatResponse = {
      originalMessage: message,
      detectedLanguage,
      translatedUserMessage: translatedUserMessage !== message ? translatedUserMessage : null,
      response: finalResponse,
      responseLanguage: targetLanguage
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Health check - test Ollama connection
    const response = await fetch('http://localhost:11434/api/tags');
    
    if (!response.ok) {
      throw new Error('Ollama not responding');
    }
    
    return NextResponse.json({ 
      status: 'healthy', 
      ollama: 'connected',
      model: 'llama3:latest',
      languages: LANGUAGES 
    });
  } catch (error) {
    return NextResponse.json({ 
      status: 'unhealthy', 
      error: 'Ollama not available' 
    }, { status: 503 });
  }
}