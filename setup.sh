#!/bin/bash

# Backend Starter Kit - Quick Setup Script
# This script helps you get started quickly

set -e

echo "=========================================="
echo "  Backend Starter Kit - Quick Setup"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

echo -e "${BLUE}✓${NC} Node.js is installed: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

echo -e "${BLUE}✓${NC} npm is installed: $(npm --version)"

# Check if Docker is installed (optional)
if command -v docker &> /dev/null; then
    echo -e "${BLUE}✓${NC} Docker is installed: $(docker --version)"
    DOCKER_AVAILABLE=true
else
    echo -e "${YELLOW}⚠${NC} Docker is not installed (optional, for database)"
    DOCKER_AVAILABLE=false
fi

echo ""
echo "=========================================="
echo "  Installing Dependencies"
echo "=========================================="
echo ""

# Install npm dependencies
npm install

echo ""
echo "=========================================="
echo "  Setting Up Environment"
echo "=========================================="
echo ""

# Copy .env.example to .env if not exists
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓${NC} Created .env file from .env.example"
    echo -e "${YELLOW}⚠${NC} Please update .env with your configuration"
else
    echo -e "${BLUE}✓${NC} .env file already exists"
fi

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""

if [ "$DOCKER_AVAILABLE" = true ]; then
    echo -e "${YELLOW}Next Steps:${NC}"
    echo ""
    echo "  1. Start database and Redis:"
    echo "     ${BLUE}docker-compose up -d postgres redis${NC}"
    echo ""
    echo "  2. Run migrations:"
    echo "     ${BLUE}npm run db:migrate${NC}"
    echo ""
    echo "  3. Start development server:"
    echo "     ${BLUE}npm run dev${NC}"
    echo ""
    echo "  4. Generate your first module:"
    echo "     ${BLUE}npm run generate:all -- product${NC}"
    echo ""
else
    echo -e "${YELLOW}Next Steps:${NC}"
    echo ""
    echo "  1. Setup PostgreSQL database (update .env with your credentials)"
    echo ""
    echo "  2. Run migrations:"
    echo "     ${BLUE}npm run db:migrate${NC}"
    echo ""
    echo "  3. Start development server:"
    echo "     ${BLUE}npm run dev${NC}"
    echo ""
    echo "  4. Generate your first module:"
    echo "     ${BLUE}npm run generate:all -- product${NC}"
    echo ""
fi

echo -e "${GREEN}Happy Coding! 🚀${NC}"
echo ""
