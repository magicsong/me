import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import { redirect } from "next/navigation"

// 验证用户凭据 (仅作为示例，实际应用中将连接数据库)
async function getUserFromDb(email: string, password: string) {
  // 简化的用户验证逻辑，实际应用中会连接数据库
  // 这个简化版本避免了在Edge运行时使用Node.js特定模块
  if (email === "admin@example.com" && password === "password123") {
    return {
      id: "1",
      name: "管理员",
      email: "admin@example.com",
      image: null
    }
  }
  
  return null
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // 移除adapter配置，因为DrizzleAdapter在Edge运行时不兼容
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" }
      },
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials)

        if (!parsedCredentials.success) {
          return null
        }

        const { email, password } = parsedCredentials.data
        return await getUserFromDb(email, password)
      },
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    }
  },
  session: {
    strategy: "jwt"
  },
})

// 检查用户是否已登录的辅助函数，可以在客户端组件中使用
export async function checkAuth() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }
  return session
}