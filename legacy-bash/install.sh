#!/bin/bash

# Quick Deploy Installation Script

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

echo "🚀 Installing Quick Deploy..."

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

# Create lib directory structure
LIB_DIR="$INSTALL_DIR/quick-deploy-lib"
mkdir -p "$LIB_DIR"/{builders,deployers,templates}

# Download main script
print_info "Downloading main script..."
if command -v curl >/dev/null 2>&1; then
    curl -fsSL "https://raw.githubusercontent.com/username/quick-deploy/main/quick-deploy" -o "$INSTALL_DIR/quick-deploy"
elif command -v wget >/dev/null 2>&1; then
    wget -q "https://raw.githubusercontent.com/username/quick-deploy/main/quick-deploy" -O "$INSTALL_DIR/quick-deploy"
else
    print_error "Neither curl nor wget found. Please install one of them."
    exit 1
fi

# Download library files
print_info "Downloading library files..."
download_file() {
    local file_path="$1"
    local url="https://raw.githubusercontent.com/username/quick-deploy/main/$file_path"
    local local_path="$LIB_DIR/$file_path"
    
    mkdir -p "$(dirname "$local_path")"
    
    if command -v curl >/dev/null 2>&1; then
        curl -fsSL "$url" -o "$local_path"
    else
        wget -q "$url" -O "$local_path"
    fi
}

# Download all library files
download_file "utils.sh"
download_file "package-manager.sh" 
download_file "framework-detection.sh"
download_file "builders/nextjs.sh"
download_file "builders/astro.sh"
download_file "builders/vite.sh"
download_file "builders/nuxt.sh"
download_file "deployers/static.sh"
download_file "deployers/opennext.sh"
download_file "deployers/workers.sh"
download_file "templates/next.config.js.template"
download_file "templates/next.config.ts.template"
download_file "templates/wrangler.toml.template"

# Make executable
chmod +x "$INSTALL_DIR/quick-deploy"

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
else
    print_info "Installation complete. You may need to restart your terminal."
fi
