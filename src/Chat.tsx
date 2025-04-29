import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, ArrowLeft, ThumbsUp, ThumbsDown, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { GoogleGenerativeAI } from '@google/generative-ai';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { supabase } from './lib/supabase';
import { v4 as uuidv4 } from 'uuid'; // Install this: npm install uuid @types/uuid

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  likes?: number;
  dislikes?: number;
  userAction?: 'like' | 'dislike' | null; // Track user's action
}

interface ChatContext {
  messages: Message[];
  history: string;
}

interface ChatSession {
  conversationId: string;
}

const formatResponse = (text: string) => {
  return text
    // Clean up and format the response
    .replace(/^Hi there!|^Hello!|^Hi,|^Hey,/i, '') // Remove generic greetings
    .replace(/Since we just said|As we discussed earlier/i, '') // Remove transition phrases
    .replace(/Let me know if you have any questions\.|Feel free to ask anything else\./i, '') // Remove generic endings
    .replace(/•(?=\S)/g, '• ') // Format bullet points
    .replace(/(\d+\.)(?=\S)/g, '$1 ') // Format numbered lists
    .replace(/\n{3,}/g, '\n\n') // Remove excess line breaks
    .trim();
};

const MessageActions = ({ message, onLike, onDislike, onCopy }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex items-center space-x-2 mt-2 ${message.role === 'user' ? 'text-white' : 'text-gray-400'}`}>
      <span className="text-xs opacity-75">
        {new Date(message.timestamp).toLocaleTimeString()}
      </span>
      <button
        onClick={onLike}
        className={`p-1 rounded transition-colors ${
          message.role === 'user' 
            ? 'hover:bg-indigo-500 text-white' 
            : 'hover:bg-gray-100 text-gray-400'
        } ${message.userAction === 'like' ? 'bg-green-500 text-white' : ''}`}
      >
        <ThumbsUp className="h-4 w-4" />
      </button>
      <button
        onClick={onDislike}
        className={`p-1 rounded transition-colors ${
          message.role === 'user' 
            ? 'hover:bg-indigo-500 text-white' 
            : 'hover:bg-gray-100 text-gray-400'
        } ${message.userAction === 'dislike' ? 'bg-red-500 text-white' : ''}`}
      >
        <ThumbsDown className="h-4 w-4" />
      </button>
      <button
        onClick={handleCopy}
        className={`p-1 rounded transition-colors ${
          message.role === 'user' 
            ? 'hover:bg-indigo-500 text-white' 
            : 'hover:bg-gray-100 text-gray-400'
        }`}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    </div>
  );
};

// Add this function near the top of your Chat component
const processUserContext = (messages: Message[], currentQuery: string): string => {
  // Get last 3 messages for immediate context
  const recentMessages = messages.slice(-3);
  
  // Extract key topics and intentions
  const context = recentMessages.map(msg => ({
    role: msg.role,
    content: msg.content,
    // Basic topic extraction
    topics: msg.content
      .toLowerCase()
      .split(/[.,!?]/)
      .map(s => s.trim())
      .filter(s => s.length > 3),
  }));

  // Build context string
  const contextSummary = context.length > 0
    ? `Recent discussion topics: ${context
        .flatMap(c => c.topics)
        .slice(-5)
        .join(', ')}.`
    : '';

  return contextSummary;
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [context, setContext] = useState<ChatContext>({ messages: [], history: '' });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  const [session, setSession] = useState<ChatSession>(() => ({
    conversationId: uuidv4()
  }));

  // Initialize the model
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    }
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    const timestamp = Date.now();
    setInput('');
    
    if (textareaRef.current) {
      adjustTextareaHeight(textareaRef.current, true);
    }

    // Create user message
    const userMessageObj = { 
      role: 'user' as const, 
      content: userMessage, 
      timestamp,
    };

    // Add user message to state
    setMessages(prev => [...prev, userMessageObj]);
    
    // Store user message in Supabase
    try {
      await supabase.from('chat_messages').insert([{
        role: userMessageObj.role,
        content: userMessageObj.content,
        conversation_id: session.conversationId,
      }]);
    } catch (error) {
      console.error('Error storing user message:', error);
    }

    scrollToBottom();
    setIsLoading(true);
    setTimeout(scrollToBottom, 100);

    try {
      const conversationContext = processUserContext(messages, userMessage);
      const promptWithContext = `
You are GlimmerMind AI, an advanced AI assistant with strong NLP capabilities. 

Context Analysis:
${context.history ? `Previous Conversation Context: ${context.history}` : 'Starting new conversation'}
Current Query: "${userMessage}"

Response Guidelines:
1. Context Awareness:
   - Consider previous messages for continuity
   - Maintain consistent context throughout the conversation
   - Reference relevant previous points when appropriate

2. Query Analysis:
   - Intent: Identify the primary purpose (question, request, clarification)
   - Topic: Determine main subject matter
   - Complexity: Adjust explanation depth accordingly
   - Sentiment: Match user's tone appropriately

3. Response Structure:
   - Start with direct answer to main query
   - Provide supporting details or examples
   - Use bullet points or numbered lists for multiple points
   - Include relevant code snippets if technical
   - Conclude with key takeaway or action item

4. Quality Parameters:
   - Accuracy: Ensure factual correctness
   - Clarity: Use clear, concise language
   - Relevance: Stay focused on user's intent
   - Completeness: Address all aspects of query
   - Actionability: Provide practical steps when applicable

Format your response with:
- Clear headings when needed
- Bullet points for lists
- Code blocks for technical content
- Tables for comparative data
- Emphasis on key points

Question: ${userMessage}

Remember to:
- Maintain conversation flow
- Be concise yet comprehensive
- Use examples for complex concepts
- Highlight critical information
- Suggest related topics if relevant
`;

      const result = await model.generateContent(promptWithContext);
      const response = await result.response;
      const aiResponse = response.text();
      const formattedResponse = formatResponse(aiResponse);
      
      // Create AI message object
      const aiMessageObj = { 
        role: 'assistant' as const, 
        content: formattedResponse,
        timestamp: Date.now()
      };

      // Add AI message to state
      setMessages(prev => [...prev, aiMessageObj]);

      // Store AI message in Supabase
      await supabase.from('chat_messages').insert([{
        role: aiMessageObj.role,
        content: aiMessageObj.content,
        conversation_id: session.conversationId,
      }]);

      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: Date.now()
      }]);
      setTimeout(scrollToBottom, 100);
    }

    setIsLoading(false);
  };

  const handleLike = async (index: number) => {
    setMessages(prev => prev.map((msg, i) => {
      if (i === index) {
        const updatedMsg = calculateUpdatedLikes(msg);
        
        // Update in Supabase
        supabase.from('chat_messages')
          .update({ 
            likes: updatedMsg.likes || 0,
            dislikes: updatedMsg.dislikes || 0,
            user_action: updatedMsg.userAction
          })
          .eq('conversation_id', session.conversationId)
          .eq('created_at', new Date(msg.timestamp).toISOString())
          .then(({ error }) => {
            if (error) console.error('Error updating likes:', error);
          });

        return updatedMsg;
      }
      return msg;
    }));
  };

  const handleDislike = async (index: number) => {
    setMessages(prev => prev.map((msg, i) => {
      if (i === index) {
        const updatedMsg = calculateUpdatedDislikes(msg);
        
        // Update in Supabase
        supabase.from('chat_messages')
          .update({ 
            likes: updatedMsg.likes || 0,
            dislikes: updatedMsg.dislikes || 0,
            user_action: updatedMsg.userAction
          })
          .eq('conversation_id', session.conversationId)
          .eq('created_at', new Date(msg.timestamp).toISOString())
          .then(({ error }) => {
            if (error) console.error('Error updating dislikes:', error);
          });

        return updatedMsg;
      }
      return msg;
    }));
  };

  const calculateUpdatedLikes = (msg: Message) => {
    if (msg.userAction === 'like') {
      return {
        ...msg,
        likes: (msg.likes || 1) - 1,
        userAction: null
      };
    }
    if (msg.userAction === 'dislike') {
      return {
        ...msg,
        likes: (msg.likes || 0) + 1,
        dislikes: (msg.dislikes || 1) - 1,
        userAction: 'like'
      };
    }
    return {
      ...msg,
      likes: (msg.likes || 0) + 1,
      userAction: 'like'
    };
  };

  const calculateUpdatedDislikes = (msg: Message) => {
    if (msg.userAction === 'dislike') {
      return {
        ...msg,
        dislikes: (msg.dislikes || 1) - 1,
        userAction: null
      };
    }
    if (msg.userAction === 'like') {
      return {
        ...msg,
        likes: (msg.likes || 1) - 1,
        dislikes: (msg.dislikes || 0) + 1,
        userAction: 'dislike'
      };
    }
    return {
      ...msg,
      dislikes: (msg.dislikes || 0) + 1,
      userAction: 'dislike'
    };
  };

  const clearConversation = async () => {
    try {
      await supabase
        .from('chat_messages')
        .delete()
        .eq('conversation_id', session.conversationId);
      
      setMessages([]);
      setContext({ messages: [], history: '' });
      setSession({ conversationId: uuidv4() }); // Start new conversation
    } catch (error) {
      console.error('Error clearing conversation:', error);
    }
  };

  const adjustTextareaHeight = (textarea: HTMLTextAreaElement, reset: boolean = false) => {
    if (reset) {
      textarea.style.height = '24px'; // Reset to initial height
      return;
    }
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const markdownComponents = {
    code({node, inline, className, children, ...props}) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={atomDark}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={`${className} px-1 bg-gray-100 rounded`} {...props}>
          {children}
        </code>
      );
    },
    pre({children}) {
      return <pre className="rounded-md overflow-auto">{children}</pre>;
    },
    table({children}) {
      return (
        <div className="overflow-x-auto">
          <table className="table-auto border-collapse my-4">{children}</table>
        </div>
      );
    },
    th({children}) {
      return <th className="border border-gray-300 px-4 py-2 bg-gray-100">{children}</th>;
    },
    td({children}) {
      return <td className="border border-gray-300 px-4 py-2">{children}</td>;
    },
    ul({children}) {
      return <ul className="list-disc pl-6 space-y-2">{children}</ul>;
    },
    ol({children}) {
      return <ol className="list-decimal pl-6 space-y-2">{children}</ol>;
    },
    li({children}) {
      return <li className="mb-1">{children}</li>;
    },
    p({children}) {
      return <p className="mb-4">{children}</p>;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <a href="/" className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Home
        </a>
        <div className="flex items-center">
          <Sparkles className="h-6 w-6 text-indigo-600 mr-2" />
          <h1 className="text-xl font-semibold text-gray-900">
            GlimmerMind AI
          </h1>
        </div>
        <button
          onClick={clearConversation}
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          Clear Chat
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={markdownComponents}
                className={`prose ${
                  message.role === 'user' ? 'text-white' : 'text-gray-800'
                } max-w-none`}
              >
                {message.content}
              </ReactMarkdown>
              <MessageActions
                message={message}
                onLike={() => handleLike(index)}
                onDislike={() => handleDislike(index)}
                onCopy={() => {}}
              />
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="animate-pulse flex space-x-2">
                  <div className="h-2 w-2 bg-indigo-600 rounded-full"></div>
                  <div className="h-2 w-2 bg-indigo-600 rounded-full"></div>
                  <div className="h-2 w-2 bg-indigo-600 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form 
        onSubmit={handleSubmit} 
        className="fixed bottom-8 left-1/2 transform -translate-x-1/2 w-[90%] max-w-3xl bg-white rounded-xl shadow-lg border border-gray-200"
      >
        <div className="flex items-start p-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              adjustTextareaHeight(e.target);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
            placeholder="Ask GlimmerMind anything... (Shift + Enter for new line)"
            className="flex-1 border-none focus:outline-none focus:ring-0 text-gray-700 placeholder-gray-400 resize-none min-h-[24px] max-h-[200px] overflow-y-auto transition-all duration-200 ease-in-out"
            style={{ lineHeight: '1.5' }}
            rows={1}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="ml-2 p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors disabled:opacity-50 self-start mt-1"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}