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
  return session
}