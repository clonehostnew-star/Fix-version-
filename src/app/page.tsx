'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Server, 
  Zap, 
  Shield, 
  Globe, 
  Users, 
  Clock, 
  CheckCircle,
  ArrowRight,
  Star,
  Loader2,
  Cpu,
  TerminalSquare,
  ShieldCheck,
  Code,
  MessageSquare,
  UploadCloud,
  Database,
  Code2,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import AnimatedBackground from '@/components/ui/animated-background';
import WelcomeBanner from '@/components/ui/welcome-banner';

function AnimatedCode() {
  return (
    <div className="bg-slate-800/70 backdrop-blur-sm border border-slate-700 rounded-lg p-4 font-mono text-sm text-left shadow-lg w-full max-w-md mx-auto">
      <div className="flex items-center mb-2">
        <span className="h-3 w-3 rounded-full bg-red-500 mr-2"></span>
        <span className="h-3 w-3 rounded-full bg-yellow-500 mr-2"></span>
        <span className="h-3 w-3 rounded-full bg-green-500"></span>
      </div>
      <pre className="text-green-400 animate-pulse overflow-x-auto">
        <code>
          <span className="text-blue-400">client</span>
          <span className="text-white">.</span>
          <span className="text-yellow-300">on</span>
          <span className="text-white">('message', </span>
          <span className="text-purple-400">async</span>
          <span className="text-white"> (message) =&gt; &#123;</span>
          {'\n'}
          <span className="text-white">  if(message.body === '!ping') &#123;</span>
          {'\n'}
          <span className="text-white">    message.reply('pong');</span>
          {'\n'}
          <span className="text-white">  &#125;</span>
          {'\n'}
          <span className="text-white">&#125;);</span>
        </code>
      </pre>
    </div>
  );
}

function LiveChatWidget() {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <a href="https://wa.me/233277114944" target="_blank" rel="noopener noreferrer">
        <Button className="rounded-full h-14 w-14 shadow-lg bg-green-500 hover:bg-green-600 animate-bounce sm:h-16 sm:w-16">
          <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8" />
          <span className="sr-only">Contact on WhatsApp</span>
        </Button>
      </a>
    </div>
  );
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // No more full-page loading
    } catch (error) {
      setPageError("Failed to initialize page content. Please refresh the page.");
      console.error("Initialization error:", error);
    }
  }, []);

  const features = [
    { 
      icon: <Bot className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />, 
      title: "Automated Responses", 
      description: "Reliable WhatsApp bot hosting with automated responses and custom commands.",
      image: "/images/hero-bot-hosting.svg"
    },
    { 
      icon: <Cpu className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />, 
      title: "AI Integration", 
      description: "Scalable bot infrastructure with features like AI integration, auto-reply, and text translation.",
      image: "/images/dashboard-illustration.svg"
    },
    { 
      icon: <TerminalSquare className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />, 
      title: "Live Terminal", 
      description: "Interact with your running bot in real-time, view logs, and provide input directly from your browser.",
      image: "/images/live-terminal.svg"
    },
    { 
      icon: <ShieldCheck className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />, 
      title: "Secure & Isolated", 
      description: "Each bot runs in a sandboxed environment, ensuring your credentials and data are always safe.",
      image: "/images/security-isolation.svg"
    },
    {
      icon: <Server className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />,
      title: "99.9% Uptime",
      description: "Enterprise-grade infrastructure with redundant systems to keep your bot online 24/7.",
      image: "/images/uptime-infrastructure.svg"
    },
    {
      icon: <Globe className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />,
      title: "Global Network",
      description: "Servers in 5 continents ensure low latency for your users worldwide.",
      image: "/images/global-network.svg"
    },
    {
      icon: <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />,
      title: "Multi-User Support",
      description: "Collaborate with team members and assign different access levels.",
      image: "/images/multi-user-support.svg"
    },
    {
      icon: <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />,
      title: "Scheduled Tasks",
      description: "Run commands at specific times or set up recurring tasks.",
      image: "/images/scheduled-tasks.svg"
    }
  ];
  
  const howItWorksSteps = [
    { 
      number: "01", 
      title: "Sign Up", 
      description: "Create your free account in seconds.",
      icon: <div className="bg-primary/10 p-2 sm:p-3 rounded-full"><Code2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /></div>
    },
    { 
      number: "02", 
      title: "Create Server", 
      description: "Use your daily free coins to provision a new server.",
      icon: <div className="bg-primary/10 p-2 sm:p-3 rounded-full"><Server className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /></div>
    },
    { 
      number: "03", 
      title: "Upload & Deploy", 
      description: "Zip your bot's code and upload it to the control panel.",
      icon: <div className="bg-primary/10 p-2 sm:p-3 rounded-full"><UploadCloud className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /></div>
    },
    { 
      number: "04", 
      title: "Go Live!", 
      description: "Scan the QR code and your bot is instantly online.",
      icon: <div className="bg-primary/10 p-2 sm:p-3 rounded-full"><Zap className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /></div>
    },
  ];

  const stats = [
    { value: "10,000+", label: "Bots Hosted", icon: <Bot className="h-5 w-5 sm:h-6 sm:w-6" /> },
    { value: "99.9%", label: "Uptime", icon: <Shield className="h-5 w-5 sm:h-6 sm:w-6" /> },
    { value: "24/7", label: "Support", icon: <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" /> },
    { value: "5", label: "Global Regions", icon: <Globe className="h-5 w-5 sm:h-6 sm:w-6" /> },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          {/* Simple Tree + WhatsApp Loading Animation */}
          <div className="mb-6">
            {/* Tree */}
            <div className="mx-auto w-16 h-24 bg-gradient-to-b from-amber-800 to-amber-900 rounded-full mb-2"></div>
            <div className="relative">
              <div className="mx-auto w-32 h-4 bg-gradient-to-r from-amber-700 to-amber-800 rounded-full mb-2"></div>
              <div className="flex justify-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-green-600 animate-pulse"></div>
                <div className="w-8 h-8 rounded-full bg-green-600 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-8 h-8 rounded-full bg-green-600 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <div className="flex justify-center gap-1 mb-2">
                <div className="w-6 h-6 rounded-full bg-green-600 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-6 h-6 rounded-full bg-green-600 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
              </div>
              {/* WhatsApp Symbol */}
              <div className="absolute -right-8 top-2">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  <span className="text-white text-xl">📱</span>
                </div>
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-green-800 mb-2">WABOT TREE HOSTING</h1>
          <p className="text-green-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-4">
        <Header />
        <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
          <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Oops!</h1>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">Something went wrong</h2>
          <p className="text-muted-foreground mb-6">
            {pageError || "We encountered an unexpected issue. Please try again."}
          </p>
          <div className="flex gap-4">
            <Button onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}>
              Try Again
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">
                Go Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <AnimatedBackground />
      <WelcomeBanner />
      <Header />
      <main className="flex-grow">
        {/* Hero Section - Fixed */}
        <section className="text-center py-12 px-4 sm:py-20 flex flex-col items-center bg-gradient-to-b from-background to-slate-900/50 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('/images/circuit-pattern.svg')] bg-repeat"></div>
          </div>
          <div className="w-full max-w-6xl mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-left w-full md:w-1/2">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold font-headline mb-4 leading-tight">
                  <span className="text-green-600">WABOT TREE HOSTING</span><br />
                  The Ultimate Host for Your <span className="text-primary">WhatsApp Bot</span>
                </h1>
                <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8">
                  From code to live bot in seconds. Our platform provides a powerful, developer-friendly environment to deploy, manage, and scale your creations effortlessly.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Button size="lg" asChild className="font-bold text-lg w-full sm:w-auto">
                    <Link href={user ? "/dashboard" : "/signup"}>
                      {user ? "Go to Dashboard" : "Get Started for Free"}
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild className="font-bold text-lg w-full sm:w-auto">
                    <Link href="#features">
                      Explore Features
                    </Link>
                  </Button>
                </div>
              </div>
              
              <div className="w-full md:w-1/2 flex justify-center md:justify-end">
                <AnimatedCode />
              </div>
            </div>
          </div>
        </section>
        
        {/* Stats Section */}
        <section className="py-8 sm:py-12 bg-primary/5">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center p-2 sm:p-0">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                    {stat.icon}
                    <span className="text-xl sm:text-2xl md:text-3xl font-bold">{stat.value}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-12 sm:py-20 px-4 bg-background">
          <div className="container mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-headline mb-4">Launch in Minutes</h2>
            <p className="text-muted-foreground mb-8 sm:mb-12 max-w-2xl mx-auto text-sm sm:text-base">
              Deploying your WhatsApp bot has never been this simple. Follow these four easy steps to get started.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
              {howItWorksSteps.map((step, index) => (
                <div key={index} className="relative group">
                  <div className="absolute -top-6 sm:-top-8 left-1/2 -translate-x-1/2 bg-card border-2 border-primary text-primary font-bold h-12 w-12 sm:h-16 sm:w-16 rounded-full flex items-center justify-center text-xl sm:text-2xl z-10">
                    {step.number}
                  </div>
                  <Card className="text-center p-4 sm:p-6 pt-10 sm:pt-12 border-transparent shadow-lg hover:shadow-xl hover:border-primary/50 transition-all h-full transform group-hover:-translate-y-1 sm:group-hover:-translate-y-2">
                    <CardHeader className="p-2 sm:p-0">
                      <div className="flex justify-center mb-2 sm:mb-4">
                        {step.icon}
                      </div>
                      <CardTitle className="text-lg sm:text-xl">{step.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-0">
                      <p className="text-muted-foreground text-xs sm:text-sm">{step.description}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-12 sm:py-20 px-4 bg-slate-900/50">
          <div className="container mx-auto">
            <div className="text-center mb-8 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-headline mb-2 sm:mb-4">Powerful Features for Your Bot</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
                Everything you need to build, deploy, and scale your WhatsApp bot with confidence.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
              {features.map((feature, index) => (
                <Card 
                  key={index} 
                  className="text-left p-4 sm:p-6 border-transparent shadow-lg hover:shadow-xl hover:border-primary/50 transition-all h-full transform hover:-translate-y-1 sm:hover:-translate-y-2 bg-card/50"
                >
                  <div className="flex flex-col items-start gap-2 sm:gap-4 h-full">
                    <div className="p-2 sm:p-3 bg-primary/10 rounded-full mb-2 sm:mb-4">
                      {feature.icon}
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground text-xs sm:text-sm">{feature.description}</p>
                    </div>
                    <div className="mt-2 sm:mt-4 w-full rounded-lg overflow-hidden h-32 sm:h-40 relative">
                      <Image 
                        src={feature.image} 
                        alt={feature.title}
                        fill
                        className="object-cover rounded-lg"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <div className="mt-8 sm:mt-16 text-center">
              <div className="relative rounded-xl overflow-hidden shadow-2xl border-2 sm:border-4 border-slate-700 inline-block w-full max-w-4xl h-64 sm:h-96">
                <Image 
                  src="/images/hero-bot-hosting.svg" 
                  alt="Control Panel Dashboard"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                  priority
                />
              </div>
            </div>
          </div>
        </section>
        
        {/* Testimonials Section */}
        <section className="py-12 sm:py-20 px-4 bg-background">
          <div className="container mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12 font-headline">What Our Users Say</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              <Card className="p-4 sm:p-6 border-primary/20 hover:border-primary/50 transition-colors">
                <CardContent className="flex flex-col items-center text-center p-2 sm:p-0">
                  <div className="bg-primary/10 rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mb-2 sm:mb-4">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <p className="italic mb-2 sm:mb-4 text-xs sm:text-sm">"This platform saved me countless hours of server setup. My bot was live in under 5 minutes!"</p>
                  <div className="font-bold text-sm sm:text-base">- Alex M.</div>
                  <div className="text-muted-foreground text-xs">Developer, Tech Startup</div>
                </CardContent>
              </Card>
              <Card className="p-4 sm:p-6 border-primary/20 hover:border-primary/50 transition-colors">
                <CardContent className="flex flex-col items-center text-center p-2 sm:p-0">
                  <div className="bg-primary/10 rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mb-2 sm:mb-4">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <p className="italic mb-2 sm:mb-4 text-xs sm:text-sm">"The live terminal feature is a game-changer. Debugging has never been easier."</p>
                  <div className="font-bold text-sm sm:text-base">- Sarah K.</div>
                  <div className="text-muted-foreground text-xs">Bot Creator</div>
                </CardContent>
              </Card>
              <Card className="p-4 sm:p-6 border-primary/20 hover:border-primary/50 transition-colors">
                <CardContent className="flex flex-col items-center text-center p-2 sm:p-0">
                  <div className="bg-primary/10 rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mb-2 sm:mb-4">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <p className="italic mb-2 sm:mb-4 text-xs sm:text-sm">"Excellent uptime and responsive support. My business depends on this service."</p>
                  <div className="font-bold text-sm sm:text-base">- James L.</div>
                  <div className="text-muted-foreground text-xs">E-commerce Owner</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        
        {/* About Section */}
        <section id="about" className="py-12 sm:py-20 px-4 bg-slate-900/50">
          <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-12 items-center">
            <div className="relative rounded-xl overflow-hidden shadow-2xl order-2 md:order-1 w-full h-64 sm:h-96">
              <Image 
                src="/images/dashboard-illustration.svg" 
                alt="Server Infrastructure"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-headline mb-2 sm:mb-4">About Us</h2>
              <p className="text-muted-foreground mb-2 sm:mb-4 text-sm sm:text-base">
                We started this service with one goal: to make WhatsApp bot deployment accessible to everyone, from hobbyists to businesses.
              </p>
              <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base">
                Our platform handles all the infrastructure headaches so you can focus on what you do best—building amazing bots.
              </p>
              <div className="flex flex-wrap gap-2 sm:gap-4">
                <Button variant="outline" size="sm" asChild className="text-xs sm:text-sm">
                  <Link href="#">
                    Our Team
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild className="text-xs sm:text-sm">
                  <Link href="#">
                    Careers
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild className="text-xs sm:text-sm">
                  <Link href="#">
                    Contact
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-12 sm:py-20 px-4 bg-background">
          <div className="container mx-auto">
            <div className="text-center mb-8 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-headline mb-2 sm:mb-4">Simple, Transparent Pricing</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
                Currently offering free tier only. Paid plans coming soon!
              </p>
            </div>
            <div className="flex justify-center">
              <div className="grid grid-cols-1 max-w-2xl w-full">
                <Card className="p-4 sm:p-6 text-center border-2 border-primary transition-colors">
                  <CardHeader className="p-2 sm:p-0">
                    <CardTitle className="text-xl sm:text-2xl">Starter (Free Tier)</CardTitle>
                    <div className="text-muted-foreground text-xs sm:text-sm">Perfect for getting started</div>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-0">
                    <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4">$0<span className="text-muted-foreground text-xs sm:text-sm md:text-lg">/month</span></div>
                    <ul className="space-y-1 sm:space-y-2 mb-3 sm:mb-6 text-left text-xs sm:text-sm">
                      <li className="flex items-center"><Zap className="h-3 w-3 sm:h-4 sm:w-4 text-primary mr-1 sm:mr-2" /> 1 Active Bot</li>
                      <li className="flex items-center"><Server className="h-3 w-3 sm:h-4 sm:w-4 text-primary mr-1 sm:mr-2" /> 512MB RAM</li>
                      <li className="flex items-center"><Database className="h-3 w-3 sm:h-4 sm:w-4 text-primary mr-1 sm:mr-2" /> 1GB Storage</li>
                      <li className="flex items-center"><ShieldCheck className="h-3 w-3 sm:h-4 sm:w-4 text-primary mr-1 sm:mr-2" /> Basic Security</li>
                      <li className="flex items-center"><Clock className="h-3 w-3 sm:h-4 sm:w-4 text-primary mr-1 sm:mr-2" /> Limited Scheduled Tasks</li>
                    </ul>
                    <Button size="sm" asChild className="w-full text-xs sm:text-sm">
                      <Link href={user ? "/dashboard" : "/signup"}>
                        Get Started Now
                      </Link>
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">Pro and Enterprise plans coming soon!</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-12 sm:py-20 px-4 text-center bg-gradient-to-b from-slate-900/50 to-background relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('/images/circuit-pattern.svg')] bg-repeat"></div>
          </div>
          <div className="relative z-10 max-w-2xl mx-auto">
            <Bot className="h-10 w-10 sm:h-16 sm:w-16 text-primary mx-auto mb-2 sm:mb-4" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-headline mb-2 sm:mb-4">Ready to Launch Your Bot?</h2>
            <p className="text-muted-foreground mb-4 sm:mb-8 text-sm sm:text-base">
              Create an account and get started with our free tier today. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center">
              <Button size="lg" asChild className="font-bold text-lg w-full sm:w-auto">
                <Link href={user ? "/dashboard" : "/signup"}>
                  {user ? "Go to Dashboard" : "Get Started for Free"}
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="font-bold text-sm sm:text-lg w-full sm:w-auto">
                <Link href="#">
                  Learn More
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <LiveChatWidget />

      <footer className="text-center p-6 sm:p-12 text-sm text-muted-foreground border-t bg-slate-900">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 mb-6 sm:mb-8 text-left text-xs sm:text-sm">
            <div>
              <h3 className="text-sm sm:text-lg font-bold mb-2 sm:mb-4">Product</h3>
              <ul className="space-y-1 sm:space-y-2">
                <li><Link href="#" className="hover:text-primary">Features</Link></li>
                <li><Link href="#" className="hover:text-primary">Pricing</Link></li>
                <li><Link href="#" className="hover:text-primary">Documentation</Link></li>
                <li><Link href="#" className="hover:text-primary">Status</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm sm:text-lg font-bold mb-2 sm:mb-4">Company</h3>
              <ul className="space-y-1 sm:space-y-2">
                <li><Link href="#" className="hover:text-primary">About</Link></li>
                <li><Link href="#" className="hover:text-primary">Blog</Link></li>
                <li><Link href="#" className="hover:text-primary">Careers</Link></li>
                <li><Link href="#" className="hover:text-primary">Press</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm sm:text-lg font-bold mb-2 sm:mb-4">Resources</h3>
              <ul className="space-y-1 sm:space-y-2">
                <li><Link href="#" className="hover:text-primary">Community</Link></li>
                <li><Link href="#" className="hover:text-primary">Help Center</Link></li>
                <li><Link href="#" className="hover:text-primary">Tutorials</Link></li>
                <li><Link href="#" className="hover:text-primary">API Reference</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm sm:text-lg font-bold mb-2 sm:mb-4">Legal</h3>
              <ul className="space-y-1 sm:space-y-2">
                <li><Link href="#" className="hover:text-primary">Privacy</Link></li>
                <li><Link href="#" className="hover:text-primary">Terms</Link></li>
                <li><Link href="#" className="hover:text-primary">Cookie Policy</Link></li>
                <li><Link href="#" className="hover:text-primary">GDPR</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-4 sm:pt-8">
            <p className="text-xs sm:text-sm">WhatsApp bot site hosting &copy; {new Date().getFullYear()}</p>
            <p className="mt-1 sm:mt-2 text-xs sm:text-sm">Have questions? <a href="https://wa.me/233277114944" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Contact us on WhatsApp</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
}