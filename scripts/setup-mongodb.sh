#!/bin/bash

# MongoDB Setup Script for Task Management System
# This script helps set up MongoDB for local development

echo "🚀 MongoDB Setup for Task Management System"
echo "==========================================="

# Check if MongoDB is installed
if command -v mongod &> /dev/null; then
    echo "✅ MongoDB is installed"
else
    echo "❌ MongoDB is not installed"
    echo ""
    echo "To install MongoDB:"
    echo "1. Using Homebrew (macOS): brew install mongodb-community"
    echo "2. Using Docker: docker run -d -p 27017:27017 --name mongodb mongo:latest"
    echo "3. Visit https://docs.mongodb.com/manual/installation/ for other options"
    exit 1
fi

# Check if MongoDB is running
if pgrep -x "mongod" > /dev/null; then
    echo "✅ MongoDB is running"
else
    echo "⚠️  MongoDB is not running"
    echo ""
    echo "To start MongoDB:"
    echo "1. Using Homebrew: brew services start mongodb-community"
    echo "2. Using Docker: docker start mongodb"
    echo "3. Manual start: mongod --dbpath /usr/local/var/mongodb"
    
    read -p "Would you like to start MongoDB now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command -v brew &> /dev/null; then
            brew services start mongodb-community
        else
            echo "Please start MongoDB manually"
        fi
    fi
fi

# Update backend .env file for local MongoDB
echo ""
echo "📝 Updating backend configuration for local MongoDB..."

BACKEND_ENV_FILE="../backend/.env"
if [ -f "$BACKEND_ENV_FILE" ]; then
    # Comment out cloud MongoDB and enable local MongoDB
    sed -i.bak 's/^MONGODB_URI=mongodb+srv:/# MONGODB_URI=mongodb+srv:/' "$BACKEND_ENV_FILE"
    
    # Add local MongoDB URI if not present
    if ! grep -q "MONGODB_URI=mongodb://localhost:27017" "$BACKEND_ENV_FILE"; then
        echo "MONGODB_URI=mongodb://localhost:27017/taskManagement" >> "$BACKEND_ENV_FILE"
    fi
    
    echo "✅ Backend configuration updated"
    echo "   - Cloud MongoDB connection commented out"
    echo "   - Local MongoDB connection enabled"
else
    echo "❌ Backend .env file not found at $BACKEND_ENV_FILE"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Restart your backend server: cd backend && npm run dev"
echo "2. Your app should now connect to local MongoDB"
echo "3. The database and collections will be created automatically"