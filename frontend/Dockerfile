# Stage 1: Build the React application using Node.js
# Using '-alpine' creates a smaller, more secure image.
# UPDATED: Changed from node:18-alpine to node:20-alpine to meet Vite's requirements.
FROM node:20-alpine AS build

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and the all-important package-lock.json
# This step is cached by Docker, speeding up future builds.
COPY package.json package-lock.json ./

# Install project dependencies using npm
RUN npm install

# Copy the rest of your application's source code
COPY . .

# Build the application for production using the build script from package.json
# Vite will place the output in the /app/dist folder.
RUN npm run build

# Stage 2: Serve the application using a lightweight Nginx web server
FROM nginx:stable-alpine

# Copy the production-ready static files from the 'build' stage's /app/dist folder
# into the folder Nginx serves from.
COPY --from=build /app/dist /usr/share/nginx/html

# Tell Docker that the container will listen on port 80
EXPOSE 80

# The default command to start the Nginx server when the container starts.
CMD ["nginx", "-g", "daemon off;"]

