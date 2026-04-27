import { useState } from 'react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { Sprout, LogOut, Globe, Menu, ChevronLeft, Cpu } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from '@/contexts/LanguageContext';
import { storage } from '@/lib/storage';
import { cn } from '@/lib/utils';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Pages where nav is hidden completely (public pages)
  const isPublicPage = location.pathname === '/' || 
                      location.pathname === '/forgot-password';

  if (isPublicPage) {
    return <Outlet />;
  }

  const navItems = [
    { icon: Sprout, label: t('Fields'), path: '/fields' },
    { icon: Cpu, label: t('Sensors'), path: '/sensors' },
  ];

  const handleLogout = () => {
    storage.clearAll();
    // Also clear legacy/raw keys just in case
    localStorage.removeItem('token');
    localStorage.removeItem('farmer_id');
    localStorage.removeItem('farmer_name');
    navigate('/');
  };

  const getLanguageLabel = (lang: string) => {
    switch(lang) {
      case 'hi': return 'हिंदी';
      case 'te': return 'తెలుగు';
      case 'ta': return 'தமிழ்';
      default: return 'English';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b z-50 flex items-center justify-between px-4 transition-all duration-300">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle (or Desktop Collapse Toggle) */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="hidden md:flex"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link to="/fields" className="flex items-center gap-2 no-underline text-inherit hover:opacity-80 transition-opacity">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <Sprout className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg hidden sm:inline">RootSphere</span>
          </Link>
        </div>
        
        <div className="flex items-center gap-2">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">{getLanguageLabel(language)}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLanguage('en')}>🇺🇸 English</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('hi')}>🇮🇳 हिंदी (Hindi)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('te')}>🇮🇳 తెలుగు (Telugu)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('ta')}>🇮🇳 தமிழ் (Tamil)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5 text-destructive" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 pt-16">
        {/* Desktop Sidebar */}
        <aside 
          className={cn(
            "hidden md:flex fixed left-0 top-16 bottom-0 bg-card border-r flex-col p-4 gap-2 transition-all duration-300 ease-in-out z-40 overflow-hidden whitespace-nowrap",
            isSidebarOpen ? "w-64" : "w-16 px-2"
          )}
        >
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant={location.pathname.startsWith(item.path) ? "secondary" : "ghost"}
              className={cn(
                "justify-start gap-3 overflow-hidden transition-all",
                !isSidebarOpen && "justify-center px-0"
              )}
              onClick={() => navigate(item.path)}
              title={!isSidebarOpen ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className={cn(
                "transition-opacity duration-200",
                isSidebarOpen ? "opacity-100" : "opacity-0 w-0 hidden"
              )}>
                {item.label}
              </span>
            </Button>
          ))}
        </aside>

        {/* Main Content Area */}
        <main 
          className={cn(
            "flex-1 transition-all duration-300 ease-in-out min-h-screen p-4 md:p-6 pb-20 md:pb-6",
            isSidebarOpen ? "md:ml-64" : "md:ml-16"
          )}
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t h-16 flex items-center justify-around px-4 z-50">
        {navItems.map((item) => {
           const isActive = location.pathname.startsWith(item.path);
           return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-1 ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
           );
        })}
      </div>
    </div>
  );
}
