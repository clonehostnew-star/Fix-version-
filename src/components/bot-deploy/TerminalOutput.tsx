
'use client';

import type React from 'react';
import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Maximize, Minimize, TerminalSquare } from 'lucide-react';
import type { DeploymentLog } from '@/lib/types';
import { cn } from "@/lib/utils";

// ANSI color codes for styling
const ANSI_COLORS = {
  RESET: "\x1b[0m",
  SYSTEM: "\x1b[34m", // Blue for system messages
  STDOUT: "\x1b[32m", // Green for stdout
  STDERR: "\x1b[31m", // Red for stderr
  INPUT: "\x1b[36m",  // Cyan for user input
  TIMESTAMP: "\x1b[90m" // Bright black (gray) for timestamps
};

const THEMES = {
    dark: {
        background: '#2D2D2D',
        foreground: '#F0F0F0',
        cursor: '#F0F0F0',
        selectionBackground: '#555555',
        black: '#000000',
        red: '#CD3131',
        green: '#0DBC79',
        yellow: '#E5E510',
        blue: '#2472C8',
        magenta: '#BC3FBC',
        cyan: '#11A8CD',
        white: '#E5E5E5',
        brightBlack: '#666666',
        brightRed: '#F14C4C',
        brightGreen: '#23D18B',
        brightYellow: '#F5F543',
        brightBlue: '#3B8EEA',
        brightMagenta: '#D670D6',
        brightCyan: '#29B8DB',
        brightWhite: '#E5E5E5',
    },
    light: {
        background: '#FFFFFF',
        foreground: '#000000',
        cursor: '#000000',
        selectionBackground: '#A8A8A8',
        black: '#000000',
        red: '#C80000',
        green: '#00A33F',
        yellow: '#B58900',
        blue: '#0000A3',
        magenta: '#A300A3',
        cyan: '#00A3A3',
        white: '#BFBFBF',
        brightBlack: '#808080',
        brightRed: '#FF0000',
        brightGreen: '#00D954',
        brightYellow: '#E5E500',
        brightBlue: '#0000FF',
        brightMagenta: '#FF00FF',
        brightCyan: '#00FFFF',
        brightWhite: '#FFFFFF',
    }
}

export interface TerminalOutputProps {
  logs: DeploymentLog[];
  isBotRunning: boolean;
  theme?: 'light' | 'dark';
  title?: string;
  icon?: React.ReactNode;
  persistedIndicator?: boolean;
}

export function TerminalOutput({ logs, isBotRunning, theme = 'dark', title = "Deployment Terminal", icon = <TerminalSquare className="h-5 w-5" />, persistedIndicator = false }: TerminalOutputProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const termInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const renderedLogCountRef = useRef(0);
  const isQrTerminal = title.includes('QR');

  const writeWelcomeMessage = useCallback((term: Terminal) => {
    term.writeln(`${ANSI_COLORS.SYSTEM}Welcome to the ${title}!${ANSI_COLORS.RESET}`);
    if (isQrTerminal) {
        term.writeln(`${ANSI_COLORS.SYSTEM}Scan the QR code here to link your bot.${ANSI_COLORS.RESET}`);
    } else {
        term.writeln(`${ANSI_COLORS.SYSTEM}Deployment logs will appear here.${ANSI_COLORS.RESET}`);
    }
    term.writeln('');
  }, [title, isQrTerminal]);

  const initializeTerminal = useCallback(() => {
    if (terminalRef.current && !termInstanceRef.current) {
      const term = new Terminal({
        cursorBlink: true,
        convertEol: true,
        fontFamily: isQrTerminal ? '"Courier New", monospace' : 'monospace',
        fontSize: isQrTerminal ? 7 : 14,
        theme: THEMES[theme],
        allowProposedApi: true,
        lineHeight: 1.2,
        letterSpacing: isQrTerminal ? 0 : 0,
        windowsMode: isQrTerminal, // Helps with some block character rendering
      });
      const fitAddon = new FitAddon();
      
      termInstanceRef.current = term;
      fitAddonRef.current = fitAddon;
      
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      
      setTimeout(() => {
        try {
            fitAddon.fit();
        } catch (e) {
            console.error("Error fitting terminal on init:", e);
        }
      }, 50);

      writeWelcomeMessage(term);
    }
  }, [writeWelcomeMessage, theme, isQrTerminal]);

  const handleToggleMaximized = useCallback(() => {
    setIsMaximized(prev => !prev);
  }, []);

  useEffect(() => {
    initializeTerminal();
  }, [initializeTerminal]);
  
  useEffect(() => {
      if (termInstanceRef.current) {
          termInstanceRef.current.options.theme = THEMES[theme];
      }
  }, [theme]);


  useEffect(() => {
    const fitTerminal = () => {
      if (termInstanceRef.current && fitAddonRef.current) {
        setTimeout(() => {
          try {
            fitAddonRef.current?.fit();
          } catch (e) {
            // This can sometimes fail if the element is not visible yet, so we ignore it.
          }
        }, 100); 
      }
    };

    fitTerminal(); 

    window.addEventListener('resize', fitTerminal);
    const observer = new MutationObserver(fitTerminal);
    if (cardRef.current) {
        observer.observe(cardRef.current, { attributes: true, attributeFilter: ['class'] });
    }

    return () => {
      window.removeEventListener('resize', fitTerminal);
      observer.disconnect();
    };
  }, [isMaximized]);


  useEffect(() => {
    const term = termInstanceRef.current;
    if (!term) return;

    if (logs.length < renderedLogCountRef.current && !isQrTerminal) {
      term.clear();
      writeWelcomeMessage(term);
      renderedLogCountRef.current = 0;
    }
    
    if (isQrTerminal && logs.length > 0) {
        term.clear();
        writeWelcomeMessage(term);
    }
    
    const newLogs = isQrTerminal ? logs : logs.slice(renderedLogCountRef.current);

    if (newLogs.length > 0) {
      newLogs.forEach(log => {
        if (isQrTerminal) {
            const qrCodeFix = theme === 'light' ? '\x1b[7m' : '';
            const qrCodeReset = theme === 'light' ? '\x1b[0m' : '';
            term.writeln(`${qrCodeFix}${log.message.trimEnd()}${qrCodeReset}`);
            return;
        }

        const timePrefix = `${ANSI_COLORS.TIMESTAMP}[${new Date(log.timestamp).toLocaleTimeString()}]${ANSI_COLORS.RESET}`;
        
        let messageColor = ANSI_COLORS.SYSTEM;
        switch(log.stream) {
          case 'stdout': messageColor = ANSI_COLORS.STDOUT; break;
          case 'stderr': messageColor = ANSI_COLORS.STDERR; break;
          case 'input': messageColor = ANSI_COLORS.INPUT; break;
        }
        
        const messageLines = log.message.trimEnd().split('\n');
        messageLines.forEach(line => {
          term.writeln(`${timePrefix} ${messageColor}${line}${ANSI_COLORS.RESET}`);
        });
      });

      renderedLogCountRef.current = logs.length;
      term.scrollToBottom();
    }
  }, [logs, writeWelcomeMessage, theme, isQrTerminal]);

  return (
    <Card 
      ref={cardRef} 
      className={cn(
        "shadow-lg flex flex-col transition-all duration-300 ease-in-out h-full",
        isMaximized
          ? "fixed inset-2 sm:inset-4 md:inset-8 z-50 w-auto h-auto rounded-xl border-2 border-primary bg-card"
          : "min-h-[450px] relative rounded-lg"
    )}>
      <CardHeader className="flex-shrink-0">
        <div className="flex justify-between items-center">
          <CardTitle className="font-headline text-xl flex items-center gap-2">
            {icon}
            {title}
            {persistedIndicator && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">persisted</span>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleMaximized}
            title={isMaximized ? "Exit Maximized View" : "Enter Maximized View"}
            className="text-muted-foreground hover:text-foreground"
          >
            {isMaximized ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-0 overflow-hidden">
        <div ref={terminalRef} className={cn(
            "h-full w-full",
            isMaximized ? "rounded-b-xl" : "rounded-b-lg"
        )}></div>
      </CardContent>
    </Card>
  );
}
