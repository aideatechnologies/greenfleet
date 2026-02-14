import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";
import { prisma } from "@/lib/db/client";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlserver",
  }),
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
  },
  rateLimit: {
    window: 60,
    max: 10,
  },
  session: {
    cookieCache: {
      enabled: false,
    },
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: false,
      schema: {
        organization: {
          additionalFields: {
            isActive: {
              type: "boolean",
              defaultValue: true,
              input: false,
            },
          },
        },
      },
    }),
  ],
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          // On login: check if user's organization is active
          const member = await prisma.member.findFirst({
            where: { userId: session.userId },
            include: { organization: { select: { id: true, isActive: true } } },
          });

          if (member && !member.organization.isActive) {
            throw new Error(
              "La società risulta disattivata. Contattare l'amministratore."
            );
          }

          // Auto-set active organization on login
          if (member) {
            return {
              data: {
                activeOrganizationId: member.organizationId,
              },
            };
          }

          return { data: session };
        },
      },
    },
  },
});
