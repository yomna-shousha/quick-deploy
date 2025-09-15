#!/bin/bash

# Quick Deploy Local Installation Script (for development)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

echo "🚀 Installing Quick Deploy (Local Development)..."

# Get the current directory (where the script is run from)
SOURCE_DIR="$(pwd)"

# Determine installation directory
if [ -w "/usr/local/bin" ]; then
    INSTALL_DIR="/usr/local/bin"
elif [ -d "$HOME/.local/bin" ]; then
    INSTALL_DIR="$HOME/.local/bin"
else
    mkdir -p "$HOME/.local/bin"
    INSTALL_DIR="$HOME/.local/bin"
fi

print_info "Installing to: $INSTALL_DIR"
print_info "Source directory: $SOURCE_DIR"

# Create lib directory structure
LIB_DIR="$INSTALL_DIR/quick-deploy-lib"
rm -rf "$LIB_DIR" # Clean install
mkdir -p "$LIB_DIR"/{builders,deployers,templates}

# Copy main script
print_info "Copying main script..."
cp "$SOURCE_DIR/quick-deploy" "$INSTALL_DIR/quick-deploy"

# Copy library files
print_info "Copying library files..."
if [ -f "$SOURCE_DIR/lib/utils.sh" ]; then
    cp "$SOURCE_DIR/lib/utils.sh" "$LIB_DIR/"
fi

if [ -f "$SOURCE_DIR/lib/package-manager.sh" ]; then
    cp "$SOURCE_DIR/lib/package-manager.sh" "$LIB_DIR/"
fi

if [ -f "$SOURCE_DIR/lib/framework-detection.sh" ]; then
    cp "$SOURCE_DIR/lib/framework-detection.sh" "$LIB_DIR/"
fi

# Copy builders
if [ -d "$SOURCE_DIR/lib/builders" ]; then
    cp "$SOURCE_DIR/lib/builders"/* "$LIB_DIR/builders/" 2>/dev/null || true
fi

# Copy deployers
if [ -d "$SOURCE_DIR/lib/deployers" ]; then
    cp "$SOURCE_DIR/lib/deployers"/* "$LIB_DIR/deployers/" 2>/dev/null || true
fi

# Copy templates
if [ -d "$SOURCE_DIR/lib/templates" ]; then
    cp "$SOURCE_DIR/lib/templates"/* "$LIB_DIR/templates/" 2>/dev/null || true
fi

# Make executable
chmod +x "$INSTALL_DIR/quick-deploy"
chmod +x "$LIB_DIR"/*.sh 2>/dev/null || true
chmod +x "$LIB_DIR"/*/*.sh 2>/dev/null || true

# Update library path in main script
sed -i.bak "s|LIB_DIR=\"\$SCRIPT_DIR/lib\"|LIB_DIR=\"$LIB_DIR\"|" "$INSTALL_DIR/quick-deploy"
rm "$INSTALL_DIR/quick-deploy.bak"

print_success "Quick Deploy installed successfully!"

# Check if directory is in PATH
if ! echo "$PATH" | grep -q "$INSTALL_DIR"; then
    print_warning "Add $INSTALL_DIR to your PATH to use quick-deploy from anywhere:"
    echo "echo 'export PATH=\"$INSTALL_DIR:\$PATH\"' >> ~/.bashrc"
    echo "echo 'export PATH=\"$INSTALL_DIR:\$PATH\"' >> ~/.zshrc"
    echo ""
    echo "Then restart your terminal or run:"
    echo "source ~/.bashrc  # or ~/.zshrc"
else
    print_success "Installation complete! You can now run: quick-deploy"
fi

# Test installation
if command -v quick-deploy >/dev/null 2>&1; then
    print_success "Installation verified!"
    echo ""
    print_info "Usage:"
    echo "• cd your-project-directory"
    echo "• quick-deploy"
    
    # Show what was installed
    print_info "Installed files:"
    echo "• Main script: $INSTALL_DIR/quick-deploy"
    echo "• Libraries: $LIB_DIR/"
    ls -la "$LIB_DIR" | head -10
else
    print_info "Installation complete. You may need to restart your terminal."
fi
