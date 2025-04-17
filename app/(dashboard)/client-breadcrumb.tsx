'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';

export function ClientBreadcrumb() {
  const pathname = usePathname();
  
  // 根据路径返回不同的面包屑内容
  let breadcrumbItems = {
    link: '/dashboard',
    name: 'Dashboard',
    page: '仪表盘'
  };
  
  if (pathname?.includes('/habits')) {
    breadcrumbItems = {
      link: '/habits',
      name: 'Habits',
      page: '习惯养成'
    };
  } else if (pathname?.includes('/customers')) {
    breadcrumbItems = {
      link: '/customers',
      name: 'Customers',
      page: '客户管理'
    };
  } else if (pathname?.includes('/dashboard')) {
    breadcrumbItems = {
      link: '/dashboard',
      name: 'Dashboard',
      page: '今日概览'
    };
  } else if (pathname?.includes('/pomodoro')) {
    breadcrumbItems = {
      link: '/pomodoro',
      name: 'Pomodoro',
      page: '番茄钟'
    };
  } else if (pathname?.includes('/todolist')) {
    breadcrumbItems = {
      link: '/todolist',
      name: 'Todos',
      page: '任务管理'
    };
  } else if (pathname?.includes('/goals')) {
    breadcrumbItems = {
      link: '/goals',
      name: 'Goals',
      page: '目标追踪'
    };
  } else if (pathname?.includes('/ai-history')) {
    // 添加AI历史面包屑
    if (pathname.includes('/ai-history/')) {
      breadcrumbItems = {
        link: '/ai-history',
        name: 'AI History',
        page: '交互详情'
      };
    } else {
      breadcrumbItems = {
        link: '/ai-history',
        name: 'AI History',
        page: 'AI交互历史'
      };
    }
  } else if (pathname?.includes('/chat')) {
    breadcrumbItems = {
      link: '/chat',
      name: 'AI Chat',
      page: 'AI聊天'
    };
  } else if (pathname?.includes('/daily')) {
    breadcrumbItems = {
      link: '/daily',
      name: 'Daily',
      page: '日常'
    };
  }

  return (
    <Breadcrumb className="hidden md:flex">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="#">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={breadcrumbItems.link}>{breadcrumbItems.name}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{breadcrumbItems.page}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
