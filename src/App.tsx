import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Brain, 
  MessageSquare, 
  Code, 
  Lightbulb, 
  ChevronRight, 
  Menu, 
  X,
  Github,
  Twitter,
  Linkedin
} from 'lucide-react';
import { supabase } from './lib/supabase';
import Chat from './Chat';

// Add these interfaces
interface ContactForm {
  name: string;
  email: string;
  message: string;
}

// Add this component
const ContactSection = () => {
  const [formData, setFormData] = useState<ContactForm>({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [e.target.id]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      const { error } = await supabase
        .from('contacts')
        .insert([
          {
            name: formData.name,
            email: formData.email,
            message: formData.message,
            created_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;

      setSubmitStatus({
        type: 'success',
        message: 'Thank you for your message! We\'ll get back to you soon.'
      });
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: 'Failed to send message. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Get in Touch</h2>
            <p className="mt-4 text-lg text-gray-600">
              Have questions about GlimmerMind? We're here to help. Reach out to our team for support, feedback, or partnership inquiries.
            </p>
            
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              {submitStatus.message && (
                <div className={`p-4 rounded-md ${
                  submitStatus.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  {submitStatus.message}
                </div>
              )}
              
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                  placeholder="Your name"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                  placeholder="your.email@example.com"
                />
              </div>
              
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={4}
                  value={formData.message}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                  placeholder="How can we help you?"
                ></textarea>
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-md hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl">
            <h3 className="text-xl font-semibold text-gray-900">Frequently Asked Questions</h3>
            
            <div className="mt-6 space-y-6">
              <div>
                <h4 className="font-medium text-gray-900">How does GlimmerMind work?</h4>
                <p className="mt-2 text-gray-600">
                  GlimmerMind uses advanced AI technology to understand your questions and generate helpful, accurate responses. It's designed to learn from interactions while maintaining its core personality and values.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">Is my data secure with GlimmerMind?</h4>
                <p className="mt-2 text-gray-600">
                  Yes, we take data privacy seriously. Your conversations are encrypted, and we have strict policies about data usage. GlimmerMind is designed with privacy as a core principle.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">Can I integrate GlimmerMind with my existing systems?</h4>
                <p className="mt-2 text-gray-600">
                  Absolutely! GlimmerMind offers various integration options including API access, webhooks, and SDK libraries for popular programming languages.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">What makes GlimmerMind different from other AI assistants?</h4>
                <p className="mt-2 text-gray-600">
                  GlimmerMind combines technical capability with a warm, thoughtful personality. It's designed to not just answer questions, but to illuminate paths forward with insight and clarity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('capabilities');
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleTryGlimmerMind = () => {
    navigate('/chat');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm fixed w-full z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Sparkles className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                GlimmerMind
              </span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-indigo-600 transition-colors">Features</a>
              <a href="#capabilities" className="text-gray-700 hover:text-indigo-600 transition-colors">Capabilities</a>
              <a href="#testimonials" className="text-gray-700 hover:text-indigo-600 transition-colors">Testimonials</a>
              <a href="#contact" className="text-gray-700 hover:text-indigo-600 transition-colors">Contact</a>
              <button 
                onClick={handleTryGlimmerMind}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
              >
                Try GlimmerMind
              </button>
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button onClick={toggleMenu} className="text-gray-700">
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <a href="#features" className="block px-3 py-2 text-gray-700 hover:text-indigo-600 transition-colors">Features</a>
              <a href="#capabilities" className="block px-3 py-2 text-gray-700 hover:text-indigo-600 transition-colors">Capabilities</a>
              <a href="#testimonials" className="block px-3 py-2 text-gray-700 hover:text-indigo-600 transition-colors">Testimonials</a>
              <a href="#contact" className="block px-3 py-2 text-gray-700 hover:text-indigo-600 transition-colors">Contact</a>
              <button 
                onClick={handleTryGlimmerMind}
                className="mt-2 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
              >
                Try GlimmerMind
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
              Illuminate Your Path with GlimmerMind AI
            </h1>
            <p className="mt-6 text-lg text-gray-600">
              An advanced AI assistant designed to provide helpful, accurate, and insightful responses with a warm, intelligent personality that sparks your creativity and problem-solving.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <button 
                onClick={handleTryGlimmerMind}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-md hover:opacity-90 transition-opacity font-medium"
              >
                Get Started Free
              </button>
              <button className="border border-indigo-600 text-indigo-600 px-6 py-3 rounded-md hover:bg-indigo-50 transition-colors font-medium">
                Learn More
              </button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg blur opacity-30"></div>
            <div className="relative bg-white p-6 rounded-lg shadow-xl">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">GlimmerMind</p>
                  <p className="text-xs text-gray-500">Online now</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-gray-100 p-3 rounded-lg rounded-tl-none max-w-xs">
                  <p className="text-sm text-gray-800">How can GlimmerMind help me with my creative projects?</p>
                </div>
                <div className="bg-indigo-100 p-3 rounded-lg rounded-tr-none ml-auto max-w-sm">
                  <p className="text-sm text-gray-800">
                    Let me illuminate that for you! I can assist with brainstorming ideas, refining concepts, providing feedback, and even generating content outlines. My goal is to spark your creativity and help bring your vision to life with clarity and insight.
                  </p>
                </div>
                <div className="bg-gray-100 p-3 rounded-lg rounded-tl-none max-w-xs">
                  <p className="text-sm text-gray-800">That sounds perfect! Can you help me outline a blog post about sustainable living?</p>
                </div>
              </div>
              <div className="mt-4 flex">
                <input 
                  type="text" 
                  placeholder="Ask GlimmerMind anything..." 
                  className="flex-1 border border-gray-300 rounded-l-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-r-md hover:opacity-90 transition-opacity">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="features" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Designed for Illumination</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              GlimmerMind combines advanced AI capabilities with a thoughtful, human-centered approach to help you achieve more.
            </p>
          </div>
          
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl">
              <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Intelligent Insights</h3>
              <p className="mt-2 text-gray-600">
                Access deep knowledge across a wide range of topics with nuanced understanding and balanced perspectives.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-xl">
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Natural Conversations</h3>
              <p className="mt-2 text-gray-600">
                Enjoy warm, engaging interactions that feel natural and adapt to your communication style.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Lightbulb className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Creative Companion</h3>
              <p className="mt-2 text-gray-600">
                Spark new ideas and overcome creative blocks with thoughtful suggestions and collaborative brainstorming.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Capabilities Section */}
      <section id="capabilities" className="py-16 bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Versatile Capabilities</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Discover the many ways GlimmerMind can assist you across different domains and tasks.
            </p>
          </div>
          
          <div className="mt-12 bg-white rounded-xl shadow-md overflow-hidden">
            <div className="border-b border-gray-200">
              <div className="flex space-x-8 px-6">
                {['capabilities', 'examples', 'technical'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-6">
              {activeTab === 'capabilities' && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Information & Knowledge</h3>
                    <ul className="mt-3 space-y-2">
                      <li className="flex items-start">
                        <ChevronRight className="h-5 w-5 text-indigo-600 flex-shrink-0 mr-2" />
                        <span>Answer questions across diverse topics</span>
                      </li>
                      <li className="flex items-start">
                        <ChevronRight className="h-5 w-5 text-indigo-600 flex-shrink-0 mr-2" />
                        <span>Explain complex concepts in accessible terms</span>
                      </li>
                      <li className="flex items-start">
                        <ChevronRight className="h-5 w-5 text-indigo-600 flex-shrink-0 mr-2" />
                        <span>Provide balanced perspectives on nuanced topics</span>
                      </li>
                    </ul>
                    
                    <h3 className="mt-6 text-lg font-medium text-gray-900">Creative Assistance</h3>
                    <ul className="mt-3 space-y-2">
                      <li className="flex items-start">
                        <ChevronRight className="h-5 w-5 text-indigo-600 flex-shrink-0 mr-2" />
                        <span>Assist with writing and content creation</span>
                      </li>
                      <li className="flex items-start">
                        <ChevronRight className="h-5 w-5 text-indigo-600 flex-shrink-0 mr-2" />
                        <span>Generate ideas and brainstorm solutions</span>
                      </li>
                      <li className="flex items-start">
                        <ChevronRight className="h-5 w-5 text-indigo-600 flex-shrink-0 mr-2" />
                        <span>Provide feedback and suggestions on creative work</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Technical Support</h3>
                    <ul className="mt-3 space-y-2">
                      <li className="flex items-start">
                        <ChevronRight className="h-5 w-5 text-indigo-600 flex-shrink-0 mr-2" />
                        <span>Help with code and programming questions</span>
                      </li>
                      <li className="flex items-start">
                        <ChevronRight className="h-5 w-5 text-indigo-600 flex-shrink-0 mr-2" />
                        <span>Troubleshoot technical issues</span>
                      </li>
                      <li className="flex items-start">
                        <ChevronRight className="h-5 w-5 text-indigo-600 flex-shrink-0 mr-2" />
                        <span>Explain technical concepts clearly</span>
                      </li>
                    </ul>
                    
                    <h3 className="mt-6 text-lg font-medium text-gray-900">Productivity & Organization</h3>
                    <ul className="mt-3 space-y-2">
                      <li className="flex items-start">
                        <ChevronRight className="h-5 w-5 text-indigo-600 flex-shrink-0 mr-2" />
                        <span>Generate structured content like lists and outlines</span>
                      </li>
                      <li className="flex items-start">
                        <ChevronRight className="h-5 w-5 text-indigo-600 flex-shrink-0 mr-2" />
                        <span>Help organize information and ideas</span>
                      </li>
                      <li className="flex items-start">
                        <ChevronRight className="h-5 w-5 text-indigo-600 flex-shrink-0 mr-2" />
                        <span>Assist with planning and decision-making</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
              
              {activeTab === 'examples' && (
                <div className="space-y-6">
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900">Creative Writing</h3>
                    <p className="mt-2 text-gray-600">
                      "Can you help me brainstorm ideas for a short story about time travel?"
                    </p>
                    <div className="mt-3 bg-white p-3 rounded border border-indigo-100">
                      <p className="text-sm text-gray-800">
                        Let me illuminate some possibilities for your time travel story:
                      </p>
                      <ul className="mt-2 text-sm text-gray-800 space-y-1">
                        <li>• A historian who discovers their research is affecting the past they study</li>
                        <li>• A person who receives messages from their future self</li>
                        <li>• Someone who can only travel to pivotal moments in their own life</li>
                        <li>• A time loop where small changes create vastly different outcomes</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900">Technical Assistance</h3>
                    <p className="mt-2 text-gray-600">
                      "Can you explain how React hooks work in simple terms?"
                    </p>
                    <div className="mt-3 bg-white p-3 rounded border border-purple-100">
                      <p className="text-sm text-gray-800">
                        Think of React hooks like special tools that let you add extra features to your function components:
                      </p>
                      <ul className="mt-2 text-sm text-gray-800 space-y-1">
                        <li>• useState: Like a memory pad for your component</li>
                        <li>• useEffect: A way to perform side tasks when things change</li>
                        <li>• useContext: Accessing shared information without passing it through every level</li>
                      </ul>
                      <p className="mt-2 text-sm text-gray-800">
                        Hooks make it easier to reuse logic between components and organize related code together.
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900">Information & Research</h3>
                    <p className="mt-2 text-gray-600">
                      "What are some sustainable practices for reducing plastic waste?"
                    </p>
                    <div className="mt-3 bg-white p-3 rounded border border-blue-100">
                      <p className="text-sm text-gray-800">
                        Here are some effective ways to reduce plastic waste in your daily life:
                      </p>
                      <ul className="mt-2 text-sm text-gray-800 space-y-1">
                        <li>• Use reusable shopping bags, water bottles, and food containers</li>
                        <li>• Buy products with minimal or plastic-free packaging</li>
                        <li>• Choose refillable options for household products</li>
                        <li>• Participate in local recycling programs correctly</li>
                        <li>• Support businesses with sustainable practices</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'technical' && (
                <div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900">Advanced AI Architecture</h3>
                    <p className="mt-2 text-gray-600">
                      GlimmerMind is built on a sophisticated neural network architecture that enables:
                    </p>
                    <ul className="mt-3 space-y-2">
                      <li className="flex items-start">
                        <Code className="h-5 w-5 text-indigo-600 flex-shrink-0 mr-2" />
                        <span>Natural language understanding with contextual awareness</span>
                      </li>
                      <li className="flex items-start">
                        <Code className="h-5 w-5 text-indigo-600 flex-shrink-0 mr-2" />
                        <span>Multi-turn conversation memory and coherence</span>
                      </li>
                      <li className="flex items-start">
                        <Code className="h-5 w-5 text-indigo-600 flex-shrink-0 mr-2" />
                        <span>Adaptive response generation based on user needs</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-900">Integration Options</h3>
                    <p className="mt-2 text-gray-600">
                      GlimmerMind can be integrated into your existing systems through:
                    </p>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900">REST API</h4>
                        <p className="mt-1 text-sm text-gray-600">
                          Simple HTTP endpoints for quick integration with any platform
                        </p>
                      </div>
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900">WebSocket</h4>
                        <p className="mt-1 text-sm text-gray-600">
                          Real-time bidirectional communication for interactive applications
                        </p>
                      </div>
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900">SDK Libraries</h4>
                        <p className="mt-1 text-sm text-gray-600">
                          Native libraries for JavaScript, Python, Java, and more
                        </p>
                      </div>
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900">Webhooks</h4>
                        <p className="mt-1 text-sm text-gray-600">
                          Event-driven integration for asynchronous workflows
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section id="testimonials" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">What Our Users Say</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Discover how GlimmerMind is illuminating paths and sparking insights for people around the world.
            </p>
          </div>
          
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center mb-4">
                <img 
                  src="https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150" 
                  alt="Sarah J." 
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Sarah J.</p>
                  <p className="text-xs text-gray-500">Content Creator</p>
                </div>
              </div>
              <p className="text-gray-600">
                "GlimmerMind has transformed my content creation process. It helps me brainstorm ideas, refine my writing, and overcome creative blocks. It's like having a brilliant creative partner available 24/7."
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center mb-4">
                <img 
                  src="https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150" 
                  alt="Michael T." 
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Michael T.</p>
                  <p className="text-xs text-gray-500">Software Developer</p>
                </div>
              </div>
              <p className="text-gray-600">
                "As a developer, I'm impressed by GlimmerMind's technical knowledge. It helps me debug code, understand complex concepts, and learn new technologies. The explanations are clear and the code examples are spot-on."
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center mb-4">
                <img 
                  src="https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150" 
                  alt="Elena R." 
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Elena R.</p>
                  <p className="text-xs text-gray-500">Educator</p>
                </div>
              </div>
              <p className="text-gray-600">
                "GlimmerMind has been an invaluable teaching assistant. It helps me create lesson plans, explain difficult concepts to students, and provide personalized learning resources. Its warm, approachable tone makes learning engaging."
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold">Ready to Illuminate Your Path?</h2>
          <p className="mt-4 text-lg max-w-2xl mx-auto text-indigo-100">
            Join thousands of users who are discovering new insights and possibilities with GlimmerMind AI.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={handleTryGlimmerMind}
              className="bg-white text-indigo-600 px-6 py-3 rounded-md hover:bg-indigo-50 transition-colors font-medium"
            >
              Get Started Free
            </button>
            <button className="border border-white text-white px-6 py-3 rounded-md hover:bg-white/10 transition-colors font-medium">
              Schedule a Demo
            </button>
          </div>
        </div>
      </section>
      
      {/* Contact Section */}
      <ContactSection />
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center">
                <Sparkles className="h-6 w-6 text-indigo-400" />
                <span className="ml-2 text-xl font-bold">GlimmerMind</span>
              </div>
              <p className="mt-4 text-gray-400">
                Illuminating your path forward with AI-powered insights and assistance.
              </p>
              <div className="mt-6 flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Github className="h-5 w-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Linkedin className="h-5 w-5" />
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider">Product</h3>
              <ul className="mt-4 space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">API</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider">Resources</h3>
              <ul className="mt-4 space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Guides</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider">Company</h3>
              <ul className="mt-4 space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} GlimmerMind AI. All rights reserved.</p>
            <p className="mt-2 text-sm">Illuminating your path forward.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chat" element={<Chat />} />
      </Routes>
    </Router>
  );
}

export default App;