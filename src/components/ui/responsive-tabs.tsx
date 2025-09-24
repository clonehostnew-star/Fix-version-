'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TabItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
  adminOnly?: boolean;
  ownerOnly?: boolean;
}

interface ResponsiveTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (value: string) => void;
  isAdmin?: boolean;
  isOwner?: boolean;
}

export function ResponsiveTabs({ 
  tabs, 
  activeTab, 
  onTabChange, 
  isAdmin = false, 
  isOwner = false 
}: ResponsiveTabsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const filteredTabs = tabs.filter(tab => {
    if (tab.ownerOnly && !isOwner) return false;
    if (tab.adminOnly && !isAdmin && !isOwner) return false;
    return true;
  });

  const activeTabData = filteredTabs.find(tab => tab.value === activeTab);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
      {/* Mobile Dropdown */}
      <div className="sm:hidden w-full">
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-between"
              onClick={() => setIsOpen(!isOpen)}
            >
              <div className="flex items-center gap-2">
                {activeTabData?.icon}
                <span>{activeTabData?.label || 'Select Tab'}</span>
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full min-w-[200px]" align="start">
            {filteredTabs.map((tab) => (
              <DropdownMenuItem
                key={tab.value}
                onClick={() => {
                  onTabChange(tab.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 cursor-pointer",
                  activeTab === tab.value && "bg-accent text-accent-foreground"
                )}
              >
                {tab.icon}
                {tab.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop Tabs */}
      <div className="hidden sm:flex">
        <div className="flex flex-wrap gap-1 p-1 bg-muted rounded-lg">
          {filteredTabs.map((tab) => (
            <Button
              key={tab.value}
              variant={activeTab === tab.value ? "default" : "ghost"}
              size="sm"
              onClick={() => onTabChange(tab.value)}
              className={cn(
                "flex items-center gap-2 transition-all",
                activeTab === tab.value 
                  ? "shadow-sm" 
                  : "hover:bg-background hover:text-foreground"
              )}
            >
              {tab.icon}
              <span className="hidden md:inline">{tab.label}</span>
              <span className="md:hidden">{tab.label.split(' ')[0]}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}