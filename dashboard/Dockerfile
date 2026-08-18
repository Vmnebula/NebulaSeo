# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so they must be
# supplied here rather than at runtime. They are public by definition: the browser
# receives them either way.
#
# Pass the real publishable key when building an image you intend to deploy:
#   docker build --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_... ./dashboard
#
# The defaults below are placeholders for a fictional Clerk domain. They let the image
# build unattended, in CI for example, but a container built with them cannot
# authenticate anyone.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk
ARG CLERK_SECRET_KEY=sk_test_placeholder_used_only_to_satisfy_the_build
ARG NEXT_PUBLIC_AGENT_URL=http://localhost:8080

ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV CLERK_SECRET_KEY=$CLERK_SECRET_KEY
ENV NEXT_PUBLIC_AGENT_URL=$NEXT_PUBLIC_AGENT_URL
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
ENV NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage - use standalone output
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Don't run as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080

ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
