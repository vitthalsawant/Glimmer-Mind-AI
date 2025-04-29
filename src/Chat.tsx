import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, ArrowLeft, ThumbsUp, ThumbsDown, Copy, Check } from 'lucide-react';
import ReactMarkdown, { Components } from 'react-markdown';
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
  userAction?: 'like' | 'dislike' | null;
  context?: string;
}

interface ChatContext {
  messages: Message[];
  history: string;
  lastQuery: string; // Add lastQuery to track the previous question
  lastResponse: string; // Add lastResponse to track the previous answer
}

interface ChatSession {
  conversationId: string;
}

interface MessageActionsProps {
  message: Message;
  onLike: () => void;
  onDislike: () => void;
  onCopy: () => void;
}

interface MarkdownComponentProps {
  children?: React.ReactNode;
  className?: string;
  node?: any;
  inline?: boolean;
  [key: string]: any;
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

const MessageActions: React.FC<MessageActionsProps> = ({ message, onLike, onDislike, onCopy }) => {
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

const processUserContext = (messages: Message[], currentQuery: string): string => {
  // Get last 5 messages for better context
  const recentMessages = messages.slice(-5);
  
  // Extract key topics and intentions
  const context = recentMessages.map(msg => ({
    role: msg.role,
    content: msg.content,
    topics: extractKeyTopics(msg.content),
    questions: extractQuestions(msg.content),
    technicalTerms: extractTechnicalTerms(msg.content),
    emotions: detectEmotions(msg.content),
    examples: extractExamples(msg.content) // New: Extract examples from previous responses
  }));

  // Build a more structured context string
  let contextSummary = '';
  
  if (context.length > 0) {
    // Add recent topics
    const topics = context
      .flatMap(c => c.topics)
      .filter((topic, index, self) => self.indexOf(topic) === index)
      .slice(-5);
    
    if (topics.length > 0) {
      contextSummary += `Recent topics: ${topics.join(', ')}. `;
    }
    
    // Add any recent questions
    const questions = context
      .flatMap(c => c.questions)
      .slice(-2);
    
    if (questions.length > 0) {
      contextSummary += `Recent questions: ${questions.join('; ')}. `;
    }
    
    // Add any technical context
    const technicalTerms = context
      .flatMap(c => c.technicalTerms)
      .filter((term, index, self) => self.indexOf(term) === index)
      .slice(-3);
    
    if (technicalTerms.length > 0) {
      contextSummary += `Technical context: ${technicalTerms.join(', ')}. `;
    }
    
    // Add emotional context
    const emotions = context
      .flatMap(c => c.emotions)
      .filter((emotion, index, self) => self.indexOf(emotion) === index)
      .slice(-3);
    
    if (emotions.length > 0) {
      contextSummary += `Emotional context: ${emotions.join(', ')}. `;
    }

    // Add previous examples for context
    const previousExamples = context
      .flatMap(c => c.examples)
      .slice(-3);
    
    if (previousExamples.length > 0) {
      contextSummary += `Previous examples: ${previousExamples.join('; ')}. `;
    }
  }

  return contextSummary;
};

// Helper functions for context extraction
const extractKeyTopics = (text: string): string[] => {
  // Common topic indicators
  const topicIndicators = [
    'about', 'regarding', 'concerning', 'related to', 'topic of', 
    'discussing', 'talking about', 'focus on', 'interested in'
  ];
  
  // Extract topics based on indicators
  const topics: string[] = [];
  
  // Look for topic indicators
  topicIndicators.forEach(indicator => {
    const regex = new RegExp(`${indicator}\\s+([\\w\\s]+)`, 'i');
    const match = text.match(regex);
    if (match && match[1]) {
      topics.push(match[1].trim());
    }
  });
  
  // Extract nouns as potential topics (simplified approach)
  const words = text.toLowerCase().split(/\s+/);
  const commonNouns = words.filter(word => 
    word.length > 3 && 
    !['the', 'and', 'that', 'this', 'with', 'for', 'you', 'your', 'have', 'has', 'had'].includes(word)
  );
  
  // Add top 3 most frequent nouns
  const nounCounts: Record<string, number> = {};
  commonNouns.forEach(noun => {
    nounCounts[noun] = (nounCounts[noun] || 0) + 1;
  });
  
  const topNouns = Object.entries(nounCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(entry => entry[0]);
  
  return [...new Set([...topics, ...topNouns])];
};

const extractQuestions = (text: string): string[] => {
  // Extract sentences that end with question marks
  const questionRegex = /[^.!?]+\?/g;
  const matches = text.match(questionRegex);
  return matches ? matches.map(q => q.trim()) : [];
};

const extractTechnicalTerms = (text: string): string[] => {
  // Common technical terms and programming languages
  const technicalTerms = [
    'javascript', 'typescript', 'react', 'vue', 'angular', 'node', 'python', 'java', 'c++', 'c#', 
    'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'html', 'css', 'sql', 'nosql', 'mongodb', 
    'postgresql', 'mysql', 'api', 'rest', 'graphql', 'docker', 'kubernetes', 'aws', 'azure', 
    'gcp', 'ci/cd', 'git', 'github', 'gitlab', 'bitbucket', 'npm', 'yarn', 'webpack', 'babel', 
    'jest', 'testing', 'unit test', 'integration test', 'frontend', 'backend', 'fullstack', 
    'database', 'server', 'client', 'browser', 'dom', 'state management', 'redux', 'mobx', 
    'hooks', 'component', 'function', 'class', 'object', 'array', 'promise', 'async', 'await'
  ];
  
  const foundTerms: string[] = [];
  
  technicalTerms.forEach(term => {
    if (text.toLowerCase().includes(term)) {
      foundTerms.push(term);
    }
  });
  
  return foundTerms;
};

// Add emotion detection function
const detectEmotions = (text: string): string[] => {
  const emotions: string[] = [];
  
  // Check for emotional keywords
  const emotionalKeywords = {
    happy: ['happy', 'joy', 'excited', 'thrilled', 'delighted', 'pleased', 'grateful', 'blessed', 'wonderful', 'amazing', 'great'],
    sad: ['sad', 'unhappy', 'depressed', 'down', 'disappointed', 'upset', 'hurt', 'heartbroken', 'lonely', 'missing'],
    angry: ['angry', 'mad', 'frustrated', 'annoyed', 'irritated', 'furious', 'outraged', 'offended'],
    anxious: ['anxious', 'worried', 'nervous', 'stressed', 'concerned', 'afraid', 'scared', 'fearful', 'uneasy'],
    confused: ['confused', 'unsure', 'uncertain', 'puzzled', 'perplexed', 'doubtful', 'questioning'],
    love: ['love', 'adore', 'care', 'affection', 'romantic', 'crush', 'feelings', 'attracted', 'interested'],
    gratitude: ['thankful', 'appreciate', 'grateful', 'blessed', 'fortunate', 'lucky'],
    pride: ['proud', 'accomplished', 'achieved', 'success', 'confident', 'capable'],
    regret: ['regret', 'sorry', 'apologize', 'mistake', 'wrong', 'should have', 'could have'],
    hope: ['hope', 'wish', 'dream', 'future', 'looking forward', 'anticipate', 'expect']
  };
  
  // Check for emotional intensity indicators
  const intensityIndicators = {
    high: ['very', 'extremely', 'incredibly', 'absolutely', 'totally', 'completely', 'so much', 'so many'],
    low: ['slightly', 'a little', 'somewhat', 'kind of', 'sort of', 'maybe', 'possibly']
  };
  
  // Check for emotional context
  const emotionalContext = {
    personal: ['I feel', 'I am', 'I\'m', 'my', 'me', 'mine'],
    relationship: ['friend', 'family', 'partner', 'boyfriend', 'girlfriend', 'spouse', 'parent', 'child', 'sibling'],
    lifeEvents: ['graduation', 'wedding', 'birthday', 'anniversary', 'breakup', 'divorce', 'loss', 'death', 'illness', 'recovery']
  };
  
  // Detect emotions based on keywords
  for (const [emotion, keywords] of Object.entries(emotionalKeywords)) {
    for (const keyword of keywords) {
      if (text.toLowerCase().includes(keyword)) {
        emotions.push(emotion);
        break;
      }
    }
  }
  
  // Check for emotional intensity
  let intensity = 'moderate';
  for (const [level, indicators] of Object.entries(intensityIndicators)) {
    for (const indicator of indicators) {
      if (text.toLowerCase().includes(indicator)) {
        intensity = level;
        break;
      }
    }
  }
  
  // Add emotional context
  let context = '';
  for (const [type, indicators] of Object.entries(emotionalContext)) {
    for (const indicator of indicators) {
      if (text.toLowerCase().includes(indicator)) {
        context = type;
        break;
      }
    }
  }
  
  // Add intensity and context to emotions if detected
  if (emotions.length > 0) {
    if (intensity !== 'moderate') {
      emotions.push(`${intensity} intensity`);
    }
    if (context) {
      emotions.push(`${context} context`);
    }
  }
  
  return emotions;
};

// New function to extract examples from text
const extractExamples = (text: string): string[] => {
  const examples: string[] = [];
  
  // Look for common example indicators
  const exampleIndicators = [
    'for example',
    'such as',
    'like',
    'instance',
    'example',
    'illustration',
    'case in point'
  ];
  
  // Extract examples based on indicators
  exampleIndicators.forEach(indicator => {
    const regex = new RegExp(`${indicator}[^.!?]+[.!?]`, 'gi');
    const matches = text.match(regex);
    if (matches) {
      examples.push(...matches.map(match => match.trim()));
    }
  });
  
  // Look for code blocks as examples
  const codeBlockRegex = /```[\s\S]*?```/g;
  const codeBlocks = text.match(codeBlockRegex);
  if (codeBlocks) {
    examples.push(...codeBlocks.map(block => block.trim()));
  }
  
  return examples;
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [context, setContext] = useState<ChatContext>({ 
    messages: [], 
    history: '',
    lastQuery: '',
    lastResponse: ''
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  const [session, setSession] = useState<ChatSession>(() => ({
    conversationId: uuidv4()
  }));
  
  // Add response cache
  const responseCache = useRef<Record<string, { response: string, timestamp: number }>>({});
  const CACHE_EXPIRY = 1000 * 60 * 60; // 1 hour in milliseconds

  // Initialize the model with optimized settings
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.5,
      topP: 0.8,
      topK: 20,
      maxOutputTokens: 4096,
      stopSequences: ["Human:", "Assistant:", "User:"],
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT" as any,
        threshold: "BLOCK_MEDIUM_AND_ABOVE" as any
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH" as any,
        threshold: "BLOCK_MEDIUM_AND_ABOVE" as any
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT" as any,
        threshold: "BLOCK_MEDIUM_AND_ABOVE" as any
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT" as any,
        threshold: "BLOCK_MEDIUM_AND_ABOVE" as any
      }
    ]
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Add function to update context
  const updateContext = (newQuery: string, newResponse: string) => {
    setContext(prev => ({
      ...prev,
      lastQuery: newQuery,
      lastResponse: newResponse,
      history: `${prev.history}\nPrevious Question: ${newQuery}\nPrevious Answer: ${newResponse}\n`
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    const timestamp = Date.now();
    setInput('');
    
    if (textareaRef.current) {
      adjustTextareaHeight(textareaRef.current, true);
    }

    // Create user message with context
    const userMessageObj = { 
      role: 'user' as const, 
      content: userMessage, 
      timestamp,
      context: context.history // Include conversation history
    };

    // Add user message to state
    setMessages(prev => [...prev, userMessageObj]);
    
    // Store user message in Supabase
    try {
      await supabase.from('chat_messages').insert([{
        role: userMessageObj.role,
        content: userMessageObj.content,
        conversation_id: session.conversationId,
        context: userMessageObj.context // Store context in database
      }]);
    } catch (error) {
      console.error('Error storing user message:', error);
    }

    scrollToBottom();
    setIsLoading(true);
    setTimeout(scrollToBottom, 100);

    try {
      // Check cache first
      const cacheKey = userMessage.toLowerCase().trim();
      const cachedResponse = responseCache.current[cacheKey];
      const now = Date.now();
      
      if (cachedResponse && (now - cachedResponse.timestamp) < CACHE_EXPIRY) {
        console.log('Using cached response');
        const aiMessageObj = { 
          role: 'assistant' as const, 
          content: cachedResponse.response,
          timestamp: now,
          context: context.history
        };
        
        setMessages(prev => [...prev, aiMessageObj]);
        updateContext(userMessage, cachedResponse.response);
        setTimeout(scrollToBottom, 100);
        setIsLoading(false);
        return;
      }
      
      // Add timeout for API call
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 30000);
      });
      
      const conversationContext = processUserContext(messages, userMessage);
      const promptWithContext = `
You are GlimmerMind AI, an advanced AI assistant with strong NLP capabilities and emotional intelligence. 

Previous Conversation Context:
${context.history}
Last Question: "${context.lastQuery}"
Last Answer: "${context.lastResponse}"

Current Query: "${userMessage}"

Response Guidelines:
1. Context Awareness:
   - Consider previous messages for continuity
   - Maintain consistent context throughout the conversation
   - Reference relevant previous points when appropriate
   - Acknowledge and validate user's emotions when present
   - Build upon previous examples when relevant
   - Always reference previous context when answering follow-up questions

2. Query Analysis:
   - Intent: Identify the primary purpose (question, request, clarification, emotional support)
   - Topic: Determine main subject matter
   - Complexity: Adjust explanation depth accordingly
   - Sentiment: Match user's tone appropriately
   - Emotional State: Recognize and respond to user's emotional state with empathy
   - Follow-up Detection: Identify if this is a follow-up question and reference previous context

3. Response Structure:
   - Start with direct answer to main query
   - Reference previous context when relevant
   - Provide supporting details or examples
   - Use bullet points or numbered lists for multiple points
   - Include relevant code snippets if technical
   - Conclude with key takeaway or action item
   - For emotional topics, offer validation and support
   - Always provide at least 2-3 relevant examples
   - For follow-up questions, explicitly reference previous context

4. Quality Parameters:
   - Accuracy: Ensure factual correctness
   - Clarity: Use clear, concise language
   - Relevance: Stay focused on user's intent
   - Completeness: Address all aspects of query
   - Actionability: Provide practical steps when applicable
   - Empathy: Show understanding and compassion for personal or emotional topics
   - Examples: Provide diverse and relevant examples
   - Context: Maintain conversation continuity

5. Emotional Intelligence:
   - Validate feelings: Acknowledge and normalize user's emotions
   - Show empathy: Demonstrate understanding of emotional experiences
   - Offer support: Provide encouragement and practical advice when appropriate
   - Be sensitive: Avoid dismissive or minimizing language
   - Maintain boundaries: Be supportive while staying within appropriate AI assistant role

Format your response with:
- Clear headings when needed
- Bullet points for lists
- Code blocks for technical content
- Tables for comparative data
- Emphasis on key points
- Warm, supportive tone for emotional topics
- Multiple examples in each response
- References to previous context when relevant
- Explicit connections to previous questions and answers

Question: ${userMessage}

Remember to:
- Maintain conversation flow
- Be concise yet comprehensive
- Use examples for complex concepts
- Highlight critical information
- Suggest related topics if relevant
- Respond with appropriate emotional sensitivity
- Always provide multiple examples
- Reference previous context for follow-ups
- Explicitly connect to previous questions and answers
`;

      // Race between the API call and the timeout
      const result = await Promise.race([
        model.generateContent(promptWithContext),
        timeoutPromise
      ]) as { response: { text: () => string } };
      
      const aiResponse = result.response.text();
      const formattedResponse = formatResponse(aiResponse);
      
      // Cache the response
      responseCache.current[cacheKey] = {
        response: formattedResponse,
        timestamp: now
      };
      
      // Create AI message object with context
      const aiMessageObj = { 
        role: 'assistant' as const, 
        content: formattedResponse,
        timestamp: now,
        context: context.history
      };

      // Add AI message to state
      setMessages(prev => [...prev, aiMessageObj]);

      // Update context with new Q&A
      updateContext(userMessage, formattedResponse);

      // Store AI message in Supabase
      await supabase.from('chat_messages').insert([{
        role: aiMessageObj.role,
        content: aiMessageObj.content,
        conversation_id: session.conversationId,
        context: aiMessageObj.context
      }]);

      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Detailed error:', error);
      
      // Provide more specific error messages based on the error type
      let errorMessage = 'I apologize, but I encountered an error. Please try again.';
      
      if (error instanceof Error) {
        if (error.message === 'Request timed out') {
          errorMessage = 'The request took too long to process. Please try again with a simpler query.';
        } else if (error.message.includes('API key')) {
          errorMessage = 'There is an issue with the API configuration. Please contact support.';
        } else if (error.message.includes('network')) {
          errorMessage = 'There seems to be a network issue. Please check your connection and try again.';
        }
      }
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: errorMessage,
        timestamp: Date.now(),
        context: context.history
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

  const calculateUpdatedLikes = (msg: Message): Message => {
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

  const calculateUpdatedDislikes = (msg: Message): Message => {
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
      setContext({ 
        messages: [], 
        history: '',
        lastQuery: '',
        lastResponse: ''
      });
      setSession({ conversationId: uuidv4() });
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

  const markdownComponents: Components = {
    code: ({ node, inline, className, children, ...props }: MarkdownComponentProps) => {
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
    pre: ({ children }: MarkdownComponentProps) => (
      <pre className="rounded-md overflow-auto">{children}</pre>
    ),
    table: ({ children }: MarkdownComponentProps) => (
      <div className="overflow-x-auto">
        <table className="table-auto border-collapse my-4">{children}</table>
      </div>
    ),
    th: ({ children }: MarkdownComponentProps) => (
      <th className="border border-gray-300 px-4 py-2 bg-gray-100">{children}</th>
    ),
    td: ({ children }: MarkdownComponentProps) => (
      <td className="border border-gray-300 px-4 py-2">{children}</td>
    ),
    ul: ({ children }: MarkdownComponentProps) => (
      <ul className="list-disc pl-6 space-y-2">{children}</ul>
    ),
    ol: ({ children }: MarkdownComponentProps) => (
      <ol className="list-decimal pl-6 space-y-2">{children}</ol>
    ),
    li: ({ children }: MarkdownComponentProps) => (
      <li className="mb-1">{children}</li>
    ),
    p: ({ children }: MarkdownComponentProps) => (
      <p className="mb-4">{children}</p>
    )
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