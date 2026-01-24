"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useCredits } from '@/contexts/credits-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Upload, LogOut, Shield, Home, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { user, logout } = useAuth();
  const { creditsEnabled } = useCredits();
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/newest', label: 'Newest', icon: Clock },
    { href: '/create', label: 'Create', icon: Sparkles, requiresAuth: true },
  ];

  return (
    <>
      <style jsx>{`
        @keyframes rainbow-scroll-horizontal {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 200% 50%;
          }
        }

        .rainbow-text {
          background: linear-gradient(
            90deg,
            #ff5fa2,
            #ffb86b,
            #fff27a,
            #7dffb2,
            #7ab8ff,
            #c57dff,
            #ff7ad1
          );
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: rainbow-scroll-horizontal 4s linear infinite;
        }
      `}</style>

      <nav className="border-b bg-background">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2 text-xl font-bold">
                <Image
                  src="/logo.png"
                  alt="Imagen Logo"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                Imagen
              </Link>

              <div className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  if (item.requiresAuth && !user) return null;

                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Button
                      key={item.href}
                      asChild
                      variant="ghost"
                      className={cn('gap-2', isActive && 'bg-muted font-medium')}
                    >
                      <Link href={item.href}>
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <>
                  {creditsEnabled && (
                    <div className="hidden sm:flex items-center gap-2 px-2">
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                      <span className="rainbow-text font-semibold">
                        {user.isAdmin ? '∞' : (user.creditsFree ?? 0)} credits
                      </span>
                    </div>
                  )}

                  <Button asChild variant="ghost">
                    <Link href="/upload">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </Link>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <User className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/user/${user.id}`}>My Profile</Link>
                      </DropdownMenuItem>
                      {user.isAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href="/admin">
                              <Shield className="w-4 h-4 mr-2" />
                              Admin Panel
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={logout}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button asChild variant="ghost">
                    <Link href="/login">Login</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/register">Register</Link>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center gap-1 mt-3 border-t pt-3">
            {navItems.map((item) => {
              if (item.requiresAuth && !user) return null;

              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Button
                  key={item.href}
                  asChild
                  variant="ghost"
                  size="sm"
                  className={cn('gap-2 flex-1', isActive && 'bg-muted font-medium')}
                >
                  <Link href={item.href}>
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}