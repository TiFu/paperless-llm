# Development Dockerfile with hot reload for both backend and frontend
# All source code is mounted via volumes - no copying needed
FROM node:18-alpine

# Install development dependencies and tools
RUN apk add --no-cache git bash

# Set working directory
WORKDIR /app

# Install global development tools
RUN npm install -g nodemon ts-node typescript

# Expose ports
EXPOSE 3000 5173

# Default to shell (startup script mounted at /app/start-services.sh)
CMD ["/bin/sh"]
