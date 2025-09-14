#!/bin/bash

# Cloudflare Workers deployment handler

deploy_to_cloudflare() {
    # Check if wrangler is available
    if ! command -v wrangler >/dev/null 2>&1; then
        print_warning "Wrangler not found, installing..."
        if npm install -g wrangler@latest; then
            print_success "Wrangler installed"
        else
            exit_with_help "Failed to install Wrangler" "• Install manually: npm install -g wrangler@latest"
        fi
    fi

    # Verify wrangler login
    echo "🔍 Checking Cloudflare authentication..."
    if ! wrangler whoami >/dev/null 2>&1; then
        exit_with_help "Not logged into Cloudflare" "• Log in: wrangler login"
    fi

    WRANGLER_USER=$(wrangler whoami 2>/dev/null | head -1 || echo "Unknown")
    print_success "Logged in as: $WRANGLER_USER"

    echo ""
    echo "🚀 Deploying to Cloudflare Workers..."

    # Detect project type and deploy accordingly
    if [ -f "$BUILD_DIR/_worker.js/index.js" ] && [ -f "$BUILD_DIR/index.html" ]; then
        deploy_hybrid_build
    elif [ -f "$BUILD_DIR/_worker.js/index.js" ]; then
        deploy_ssr_build
    elif [ "$FRAMEWORK" = "opennext" ] && [ -d ".open-next" ]; then
        deploy_opennext_build
    elif [ -f "$BUILD_DIR/index.html" ]; then
        deploy_static_build
    else
        deploy_unknown_build
    fi
}

deploy_hybrid_build() {
    # Hybrid build (static + SSR) - use isolated assets deployment to avoid config conflicts
    print_info "Detected hybrid build (static + SSR) - using isolated assets deployment"
    
    # Create clean deployment directory to avoid Pages config conflicts
    TEMP_DIR="/tmp/deploy-$(date +%s)"
    mkdir -p "$TEMP_DIR"
    
    # Copy only the static files (ignore _worker.js since we're deploying as static)
    cp -r "$BUILD_DIR"/* "$TEMP_DIR"/ 2>/dev/null
    # Remove the _worker.js directory since we're doing static deployment
    rm -rf "$TEMP_DIR/_worker.js" 2>/dev/null
    rm -f "$TEMP_DIR/_routes.json" 2>/dev/null
    
    # Create wrangler.toml for static assets
    cat > "$TEMP_DIR/wrangler.toml" << EOF
name = "$(basename $(pwd))-static"
compatibility_date = "$(date +%Y-%m-%d)"
main = "index.js"

[site]
bucket = "."
EOF

    # Create simple static site worker (no external dependencies)
    cat > "$TEMP_DIR/index.js" << 'EOF'
export default {
    async fetch(request, env, ctx) {
        try {
            return await env.ASSETS.fetch(request);
        } catch (error) {
            // If direct fetch fails, try basic fallbacks
            const url = new URL(request.url);
            const pathname = url.pathname;
            
            // Try with index.html for directory requests
            if (pathname.endsWith('/')) {
                const indexRequest = new Request(
                    request.url.replace(pathname, pathname + 'index.html'),
                    request
                );
                try {
                    return await env.ASSETS.fetch(indexRequest);
                } catch (e) {
                    // Continue to 404
                }
            }
            
            // Try adding .html extension
            if (!pathname.includes('.') && !pathname.endsWith('/')) {
                const htmlRequest = new Request(
                    request.url.replace(pathname, pathname + '.html'),
                    request
                );
                try {
                    return await env.ASSETS.fetch(htmlRequest);
                } catch (e) {
                    // Continue to 404
                }
            }
            
            return new Response('Not found', { status: 404 });
        }
    }
};
EOF
    
    cd "$TEMP_DIR"
    echo "🎯 Deploying hybrid project as static site (isolated)"
    
    if wrangler deploy; then
        print_success "Hybrid deployment complete!"
        echo "🌐 Site should be available at the URL shown above"
    else
        print_error "Hybrid deployment failed"
    fi
    
    cd - >/dev/null
    rm -rf "$TEMP_DIR"
}

deploy_ssr_build() {
    # Pure SSR project with Astro worker
    print_info "Detected pure SSR build - using Astro's built-in worker"
    
    # Create clean deployment directory 
    TEMP_DIR="/tmp/deploy-$(date +%s)"
    mkdir -p "$TEMP_DIR"
    
    # Copy build files
    cp -r "$BUILD_DIR"/* "$TEMP_DIR"/ 2>/dev/null
    
    # Create wrangler.toml for SSR
    cat > "$TEMP_DIR/wrangler.toml" << EOF
name = "$(basename $(pwd))-ssr"
compatibility_date = "$(date +%Y-%m-%d)"
main = "_worker.js/index.js"
EOF
    
    cd "$TEMP_DIR"
    echo "🎯 Deploying SSR project with Astro worker"
    
    if wrangler deploy; then
        URL_OUTPUT=$(wrangler deploy 2>&1 | grep -o 'https://[^[:space:]]*\.workers\.dev' | tail -1)
        print_success "SSR deployment complete!"
        echo "🌐 Site: $URL_OUTPUT"
    else
        print_error "SSR deployment failed"
    fi
    
    cd - >/dev/null
    rm -rf "$TEMP_DIR"
}

deploy_opennext_build() {
    # OpenNext for Next.js SSR deployment
    print_info "Deploying Next.js SSR with OpenNext"
    
    # Create temporary deployment directory
    TEMP_DIR="/tmp/deploy-$(date +%s)"
    mkdir -p "$TEMP_DIR"
    
    # Copy OpenNext build output
    cp -r .open-next/* "$TEMP_DIR"/ 2>/dev/null
    
    # Check for worker file (OpenNext should generate this)
    if [ -f "$TEMP_DIR/worker.js" ]; then
        # Create wrangler.toml for OpenNext (corrected configuration)
        cat > "$TEMP_DIR/wrangler.toml" << EOF
name = "$(basename $(pwd))-nextjs"
compatibility_date = "$(date +%Y-%m-%d)"
compatibility_flags = ["nodejs_compat"]
main = "worker.js"

[assets]
directory = "assets"
binding = "ASSETS"
EOF
        
        cd "$TEMP_DIR"
        echo "Deploying Next.js SSR with OpenNext worker"
        
        if wrangler deploy; then
            print_success "Next.js SSR deployment complete!"
            echo "Site should be available at the URL shown above"
        else
            print_error "OpenNext deployment failed"
            print_info "Checking for alternative worker files..."
            ls -la
        fi
        
        cd - >/dev/null
        rm -rf "$TEMP_DIR"
    else
        # Check for alternative file structures
        print_info "worker.js not found, checking for alternative structure..."
        ls -la .open-next/
        
        exit_with_help "OpenNext build incomplete - no worker file found" "Check .open-next directory contents:
ls -la .open-next/
Expected files: worker.js, assets/ directory
OpenNext documentation: https://opennext.js.org/cloudflare
Try running: npx opennextjs-cloudflare --help"
    fi
}

deploy_static_build() {
    # Static site - use simple assets deployment
    print_info "Detected static build - using assets deployment"
    echo "🎯 Deploying static site"
    
    if wrangler deploy --assets="$BUILD_DIR"; then
        print_success "Static deployment complete!"
        echo "🌐 Site should be available at the URL shown above"
    else
        print_error "Static deployment failed"
        exit_with_help "Deployment unsuccessful" "• Try: wrangler deploy --assets=$BUILD_DIR
• Check build directory: ls -la $BUILD_DIR"
    fi
}

deploy_unknown_build() {
    # Unknown structure - try assets deployment anyway
    print_warning "Unknown build structure - attempting assets deployment"
    echo "🔍 Build contents:"
    ls -la "$BUILD_DIR" | head -5
    
    if wrangler deploy --assets="$BUILD_DIR"; then
        print_success "Deployment complete!"
        echo "🌐 Site should be available at the URL shown above"
    else
        print_error "Deployment failed"
        exit_with_help "Could not deploy project" "• Check build directory structure
• For SSR: ensure _worker.js/index.js exists
• For static: ensure index.html exists
• Manual deploy: wrangler deploy --assets=$BUILD_DIR"
    fi
}
