import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import {auth} from './auth'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string) {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', options);
}

export function getCurrentDateString() {
  const currentDate = new Date();

  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // 月份从0开始，需要加1
  const day = String(currentDate.getDate()).padStart(2, '0');

  const formattedDate = `${year}-${month}-${day}`;
  return formattedDate
}


export async function getCurrentUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("未授权：需要用户登录");
  }
  return session.user.id;
}