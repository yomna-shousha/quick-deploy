#!/bin/bash

# Next.js specific build handling

handle_nextjs_build() {
    # Run generic build first
    generic_build
    
    # Check if we need special handling for Next.js
    if [ -d ".next" ] && [ ! -f "$BUILD_DIR/index.html" ]; then
        print_info "Detected Next.js SSR build - analyzing configuration"
        
        # Check for existing config files
        NEXT_CONFIG=""
        if [ -f "next.config.ts" ]; then
            NEXT_CONFIG="next.config.ts"
            print_info "Found next.config.ts"
        elif [ -f "next.config.js" ]; then
            NEXT_CONFIG="next.config.js"
            print_info "Found next.config.js"
        elif [ -f "next.config.mjs" ]; then
            NEXT_CONFIG="next.config.mjs"
            print_info "Found next.config.mjs"
        fi
        
        # Check if already configured for static export
        STATIC_EXPORT_CONFIGURED=false
        if [ -n "$NEXT_CONFIG" ]; then
            if grep -q "output.*['\"]export['\"]" "$NEXT_CONFIG"; then
                STATIC_EXPORT_CONFIGURED=true
                print_warning "Config shows static export but build didn't create 'out' directory"
            fi
        fi
        
        echo ""
        echo "Deployment options for Next.js:"
        echo "  1. Configure for static export (recommended - simpler)"
        echo "  2. Use OpenNext for SSR deployment"
        echo "  3. Exit and configure manually"
        echo ""
        
        while true; do
            read -p "Choose option (1/2/3): " -n 1 -r NEXTJS_CHOICE
            echo ""
            
            case $NEXTJS_CHOICE in
                1)
                    configure_static_export
                    break
                    ;;
                2)
                    setup_opennext
                    break
                    ;;
                3)
                    exit_with_help "User chose to exit" "Configuration options:
• Static export: Add output: 'export' to next.config
• OpenNext SSR: npm install @opennextjs/cloudflare && npx opennextjs-cloudflare build
• Cloudflare Pages: Use @cloudflare/next-on-pages"
                    ;;
                *)
                    print_warning "Invalid choice. Please enter 1, 2, or 3."
                    continue
                    ;;
            esac
        done
    else
        # Find build output for regular Next.js builds
        find_build_output
    fi
}

configure_static_export() {
    print_info "Configuring for static export..."
    
    if [ -n "$NEXT_CONFIG" ]; then
        # Backup existing config
        cp "$NEXT_CONFIG" "$NEXT_CONFIG.backup"
        print_info "Backed up existing config to $NEXT_CONFIG.backup"
        
        if [ "$NEXT_CONFIG" = "next.config.ts" ]; then
            # Update TypeScript config
            cat > "$NEXT_CONFIG" << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
};

export default nextConfig;
EOF
        else
            # Update JavaScript config
            cat > "$NEXT_CONFIG" << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig
EOF
        fi
    else
        # Create new config file
        cat > "next.config.js" << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig
EOF
        print_info "Created next.config.js"
    fi
    
    print_success "Configuration updated for static export"
    print_info "Rebuilding with static export configuration..."
    
    # Rebuild with new config
    case $PACKAGE_MANAGER in
        "pnpm") pnpm build ;;
        "yarn") yarn build ;;
        "bun") bun run build ;;
        *) npm run build ;;
    esac
    
    # Check for 'out' directory
    if [ -d "out" ] && [ "$(ls -A out 2>/dev/null)" ]; then
        BUILD_DIR="./out"
        print_success "Static export completed - using out/ directory"
    else
        exit_with_help "Static export failed - no 'out' directory created" "• Check the build output above for errors
• Make sure your app doesn't use server-side features
• Try running: npm run build"
    fi
}

setup_opennext() {
    print_info "Setting up OpenNext for SSR deployment..."
    
    # Check if OpenNext is installed
    if ! npm list @opennextjs/cloudflare >/dev/null 2>&1; then
        echo "Installing @opennextjs/cloudflare..."
        if ! npm install @opennextjs/cloudflare; then
            exit_with_help "Failed to install @opennextjs/cloudflare" "Install manually: npm install @opennextjs/cloudflare"
        fi
        print_success "OpenNext installed"
    fi
    
    # Build with OpenNext
    echo "Building with OpenNext..."
    if npx opennextjs-cloudflare build; then
        # OpenNext generates .open-next folder
        if [ -d ".open-next" ]; then
            BUILD_DIR="./.open-next"
            FRAMEWORK="opennext"
            print_success "OpenNext build completed"
        else
            exit_with_help "OpenNext build failed - no .open-next directory found" "Check OpenNext documentation: https://opennext.js.org/cloudflare"
        fi
    else
        exit_with_help "OpenNext build failed" "Check the error messages above
Try: npx opennextjs-cloudflare build --help"
    fi
}

find_build_output() {
    echo "🔍 Locating build output..."

    # Check common build directories in order of preference
    if [ -d "out" ] && [ "$(ls -A out 2>/dev/null)" ]; then
        BUILD_DIR="./out"
        print_success "Using out/ directory (static export)"
    elif [ -d "dist" ] && [ "$(ls -A dist 2>/dev/null)" ]; then
        BUILD_DIR="./dist"
        print_success "Using dist/ directory"
    elif [ -d "build" ] && [ "$(ls -A build 2>/dev/null)" ]; then
        BUILD_DIR="./build"
        print_success "Using build/ directory"
    elif [ -d ".next" ] && [ "$(ls -A .next 2>/dev/null)" ]; then
        BUILD_DIR="./.next"
        print_success "Using .next/ directory (Next.js)"
    fi
}
