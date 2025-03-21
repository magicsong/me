"use client"

import { useState, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn } from 'next-auth/react'
import { FaGithub } from 'react-icons/fa'
import { useSearchParams } from 'next/navigation'
import { Separator } from '@/components/ui/separator'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    
    const formData = new FormData(event.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl
      })
      
      if (result?.error) {
        setError('登录失败，请检查您的邮箱和密码')
        setIsLoading(false)
        return
      }
      
      window.location.href = result?.url || callbackUrl
    } catch (error) {
      setError('登录过程中发生错误')
      setIsLoading(false)
    }
  }
  
async function handleGitHubSignIn() {
  setIsLoading(true)
  await signIn('github', { callbackUrl })
}

  return (
    <div className="min-h-screen flex justify-center items-start md:items-center p-8 bg-gray-50">
      <Suspense fallback={<div>Loading...</div>}>
        <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">欢迎登录</CardTitle>
          <CardDescription className="text-center">
            请使用您的账号密码登录系统
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-red-50 text-red-500 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" name="email" type="email" placeholder="name@example.com" required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">密码</Label>
                <Button variant="link" className="px-0 font-normal h-auto" size="sm" asChild>
                  <a href="/forgot-password">忘记密码?</a>
                </Button>
              </div>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? '登录中...' : '登录'}
            </Button>
          </form>
          
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">或继续使用</span>
            </div>
          </div>
          
          <Button
            variant="outline"
            type="button"
            className="w-full flex items-center gap-2"
            onClick={handleGitHubSignIn}
            disabled={isLoading}
          >
            <FaGithub className="h-5 w-5" />
            <span>GitHub 登录</span>
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="link" className="px-0 font-normal" asChild>
            <a href="/register">没有账号? 点击注册</a>
          </Button>
        </CardFooter>
      </Card>
      </Suspense>
    </div>
  )
}
