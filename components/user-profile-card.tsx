"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, LogOut, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/lib/auth';

interface UserProfileCardProps {
  name: string;
  email: string;
  image?: string | null;
}

export function UserProfileCard({ name, email, image }: UserProfileCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut();
    setIsLoading(false);
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 overflow-hidden rounded-full bg-primary/10">
            {image ? (
              <Image
                src={image}
                alt={name || "用户头像"}
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-medium truncate">{name || "用户"}</h2>
            <p className="text-sm text-muted-foreground truncate">{email}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>个人资料</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleSignOut}
                disabled={isLoading} 
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{isLoading ? "正在退出..." : "退出登录"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
