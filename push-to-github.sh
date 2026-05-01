#!/bin/bash

# Quick Push to GitHub Script
# Usage: ./push-to-github.sh

echo "🚀 Pushing to GitHub..."
echo ""

# Check if remote is set
REMOTE=$(git remote get-url origin 2>/dev/null)
if [ -z "$REMOTE" ]; then
    echo "❌ Remote not set. Setting remote..."
    git remote add origin https://github.com/iwanazhari/Backend.git
fi

echo "✅ Remote: $REMOTE"
echo ""

# Status
echo "📊 Git Status:"
git status --short
echo ""

# Add all files
echo "📦 Adding all files..."
git add .

# Commit if there are changes
if ! git diff --cached --quiet; then
    echo "💬 Enter commit message (or press Enter for auto):"
    read -r MESSAGE
    
    if [ -z "$MESSAGE" ]; then
        MESSAGE="feat: update backend starter kit"
    fi
    
    git commit -m "$MESSAGE"
fi

# Push
echo "🚀 Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "🌐 View at: https://github.com/iwanazhari/Backend"
else
    echo ""
    echo "❌ Push failed. Please check your credentials."
    echo "💡 You may need to create a Personal Access Token at:"
    echo "   https://github.com/settings/tokens"
fi
