#!/bin/bash

# Pre-deployment checklist script
set -e

echo "🔍 Running pre-deployment checks..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

CHECKS_PASSED=0
TOTAL_CHECKS=0

# Function to print colored output
print_check() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if [ $2 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        echo -e "${RED}✗${NC} $1"
    fi
}

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# Check if environment files exist
check_env_files() {
    print_info "Checking environment configuration..."
    
    if [ -f "backend/.env.production.example" ]; then
        print_check "Backend production environment example exists" 0
    else
        print_check "Backend production environment example missing" 1
    fi
    
    if [ -f "frontend/.env.production.example" ]; then
        print_check "Frontend production environment example exists" 0
    else
        print_check "Frontend production environment example missing" 1
    fi
}

# Check if deployment configuration files exist
check_deployment_config() {
    print_info "Checking deployment configuration..."
    
    if [ -f "frontend/vercel.json" ]; then
        print_check "Vercel configuration exists" 0
    else
        print_check "Vercel configuration missing" 1
    fi
    
    if [ -f "backend/railway.json" ]; then
        print_check "Railway configuration exists" 0
    else
        print_check "Railway configuration missing" 1
    fi
    
    if [ -f "backend/Dockerfile" ]; then
        print_check "Docker configuration exists" 0
    else
        print_check "Docker configuration missing" 1
    fi
}

# Check if build scripts are configured
check_build_scripts() {
    print_info "Checking build scripts..."
    
    if grep -q "build:frontend" package.json; then
        print_check "Frontend build script configured" 0
    else
        print_check "Frontend build script missing" 1
    fi
    
    if grep -q "build:backend" package.json; then
        print_check "Backend build script configured" 0
    else
        print_check "Backend build script missing" 1
    fi
    
    if grep -q "start:prod" package.json; then
        print_check "Production start script configured" 0
    else
        print_check "Production start script missing" 1
    fi
}

# Check if dependencies are installed
check_dependencies() {
    print_info "Checking dependencies..."
    
    if [ -d "node_modules" ]; then
        print_check "Root dependencies installed" 0
    else
        print_check "Root dependencies not installed" 1
    fi
    
    if [ -d "backend/node_modules" ]; then
        print_check "Backend dependencies installed" 0
    else
        print_check "Backend dependencies not installed" 1
    fi
    
    if [ -d "frontend/node_modules" ]; then
        print_check "Frontend dependencies installed" 0
    else
        print_check "Frontend dependencies not installed" 1
    fi
}

# Check if tests pass
check_tests() {
    print_info "Running tests..."
    
    if npm run test:backend > /dev/null 2>&1; then
        print_check "Backend tests pass" 0
    else
        print_check "Backend tests fail" 1
    fi
    
    if npm run test:frontend > /dev/null 2>&1; then
        print_check "Frontend tests pass" 0
    else
        print_check "Frontend tests fail" 1
    fi
}

# Check if documentation exists
check_documentation() {
    print_info "Checking documentation..."
    
    if [ -f "DEPLOYMENT.md" ]; then
        print_check "Deployment documentation exists" 0
    else
        print_check "Deployment documentation missing" 1
    fi
    
    if [ -f "README.md" ]; then
        print_check "README documentation exists" 0
    else
        print_check "README documentation missing" 1
    fi
}

# Main function
main() {
    echo "Pre-deployment checklist for Project & Task Management System"
    echo "============================================================"
    
    check_env_files
    check_deployment_config
    check_build_scripts
    check_dependencies
    check_tests
    check_documentation
    
    echo ""
    echo "============================================================"
    echo "Checks passed: $CHECKS_PASSED/$TOTAL_CHECKS"
    
    if [ $CHECKS_PASSED -eq $TOTAL_CHECKS ]; then
        echo -e "${GREEN}🎉 All checks passed! Ready for deployment.${NC}"
        exit 0
    else
        echo -e "${RED}❌ Some checks failed. Please fix the issues before deploying.${NC}"
        exit 1
    fi
}

# Run main function
main