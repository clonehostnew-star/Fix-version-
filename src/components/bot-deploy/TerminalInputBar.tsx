'use client';

import type React from 'react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface TerminalInputBarProps {
  onSendMessage: (message: string) => void;
  isDisabled: boolean;
}

export function TerminalInputBar({ onSendMessage, isDisabled }: TerminalInputBarProps) {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inputValue.trim() && !isDisabled) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className="bg-card border rounded-lg shadow-sm p-3">
        <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
        <Input
            type="text"
            placeholder={isDisabled ? "Bot not running..." : "Type here to provide input to the bot (e.g., pairing code)"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isDisabled}
            className="flex-1 bg-background"
            aria-label="Bot input"
        />
        <Button type="submit" size="icon" disabled={isDisabled || !inputValue.trim()} aria-label="Send message">
            <Send className="h-4 w-4" />
        </Button>
        </form>
    </div>
  );
}
