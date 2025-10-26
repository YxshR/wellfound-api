#!/bin/bash

# Deployment script for Project & Task Management System
set -e

echo "🚀 Starting deployment process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    print_status "Dependencies check passed ✓"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm run install-deps
    print_status "Dependencies installed ✓"
}

# Build the application
build_application() {
    print_status "Building application..."
    npm run build
    print_status "Application built ✓"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    npm run test:backend
    npm run test:frontend
    print_status "Tests passed ✓"
}

# Deploy to Railway (Backend)
deploy_backend() {
    print_status "Deploying backend to Railway..."
    
    if ! command -v railway &> /dev/null; then
        print_warning "Railway CLI not found. Please install it manually:"
        echo "npm install -g @railway/cli"
        echo "railway login"
        echo "cd backend && railway up"
        return
    fi
    
    cd backend
    railway up
    cd ..
    print_status "Backend deployed to Railway ✓"
}

# Deploy to Vercel (Frontend)
deploy_frontend() {
    print_status "Deploying frontend to Vercel..."
    
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found. Please install it manually:"
        echo "npm install -g vercel"
        echo "vercel login"
        echo "cd frontend && vercel --prod"
        return
    fi
    
    cd frontend
    vercel --prod
    cd ..
    print_status "Frontend deployed to Vercel ✓"
}

# Main deployment process
main() {
    print_status "Starting deployment for Project & Task Management System"
    
    # Parse command line arguments
    SKIP_TESTS=false
    BACKEND_ONLY=false
    FRONTEND_ONLY=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --backend-only)
                BACKEND_ONLY=true
                shift
                ;;
            --frontend-only)
                FRONTEND_ONLY=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Usage: $0 [--skip-tests] [--backend-only] [--frontend-only]"
                exit 1
                ;;
        esac
    done
    
    check_dependencies
    install_dependencies
    
    if [ "$SKIP_TESTS" = false ]; then
        run_tests
    else
        print_warning "Skipping tests as requested"
    fi
    
    build_application
    
    if [ "$FRONTEND_ONLY" = false ]; then
        deploy_backend
    fi
    
    if [ "$BACKEND_ONLY" = false ]; then
        deploy_frontend
    fi
    
    print_status "🎉 Deployment completed successfully!"
    print_status "Don't forget to:"
    echo "  1. Update environment variables in your hosting platforms"
    echo "  2. Test the deployed application"
    echo "  3. Monitor logs for any issues"
}

# Run main function
main "$@"