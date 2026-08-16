# syntax=docker/dockerfile:1
#
# Static image: build the SPA, then serve it from nginx. It talks to the API
# (Vikteur/spotify-to-rekordbox) over the same origin — the edge proxy routes
# /api there — so this container holds no secrets and no state.

# --- stage 1: build -------------------------------------------------------
FROM node:24-alpine AS web
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json vite.config.ts index.html ./
COPY src/ ./src/
# Both default to same-origin, which is what the edge proxy expects. Override
# only when the API or the intake app lives somewhere else:
#   docker build --build-arg VITE_API_BASE=https://api.example.com .
ARG VITE_API_BASE=""
ARG VITE_GUEST_ORIGIN=""
ENV VITE_API_BASE=$VITE_API_BASE \
    VITE_GUEST_ORIGIN=$VITE_GUEST_ORIGIN
# `npm run build` = tsc --noEmit && vite build -> /build/dist
RUN npm run build

# --- stage 2: runtime -----------------------------------------------------
FROM nginx:1.27-alpine AS runtime
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/rekord-dj.conf
COPY --from=web /build/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
