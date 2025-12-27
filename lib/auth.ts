import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import { redirect } from "next/navigation"

export const { handlers, signIn, signOut, auth } = NextAuth({
  // 移除adapter配置，因为DrizzleAdapter在Edge运行时不兼容
  pages: {
    signIn: "/login",
  },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    // 在用户登录时检查白名单（环境变量 `ALLOWED_USERNAMES`，逗号分隔）
    // 如果环境变量未配置或为空，则不启用白名单限制
    async signIn({ user, account, profile }) {
      try {
        const raw = process.env.ALLOWED_USERNAMES ?? ""
        const allowed = raw.split(",").map(s => s.trim()).filter(Boolean)
        if (allowed.length === 0) return true

        const candidate = (profile && (profile.login || profile.name)) || user?.name || user?.email?.split("@")[0]
        if (!candidate) return false
        return allowed.includes(candidate)
      } catch (e) {
        return false
      }
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.name
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

  // 白名单二次校验：防止通过其他途径获得 session 的用户越权
  const raw = process.env.ALLOWED_USERNAMES ?? ""
  const allowed = raw.split(",").map(s => s.trim()).filter(Boolean)
  if (allowed.length > 0) {
    const username = session.user.name || session.user.email?.split("@")[0]
    if (!username || !allowed.includes(username)) {
      redirect("/login")
    }
  }

  return session
}