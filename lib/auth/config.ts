import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { prisma } from "@/lib/db/prisma";
import {
  allocatePublicId,
  defaultPseudoFromName,
} from "@/lib/profile/public-id";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    session: async ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id;
        const profile = await prisma.userProfile.findUnique({
          where: { userId: user.id },
          select: { pseudo: true, publicId: true },
        });
        if (profile) {
          session.user.pseudo = profile.pseudo;
          session.user.publicId = profile.publicId;
        }
      }
      return session;
    },
  },
  events: {
    createUser: async ({ user }) => {
      const publicId = await allocatePublicId();
      await prisma.userProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          publicId,
          pseudo: defaultPseudoFromName(user.name, publicId),
          preferredInterface: "ARENA",
        },
      });
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
