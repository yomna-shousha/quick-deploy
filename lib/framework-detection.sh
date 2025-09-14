#!/bin/bash

# Framework detection logic

handle_monorepo() {
    # Check if we're in a monorepo (like the Astro source)
    if [ -f "pnpm-workspace.yaml" ] || [ -f "turbo.json" ] || [ -f "lerna.json" ]; then
        print_warning "Detected monorepo - this is likely framework source code, not a deployable project"
        
        # Check for examples directory
        if [ -d "examples" ]; then
            echo "Found examples directory with deployable projects:"
            ls examples/ | head -10
            echo ""
            read -p "Enter example name to deploy (or 'q' to quit): " EXAMPLE_NAME
            if [ "$EXAMPLE_NAME" = "q" ]; then
                echo "Exiting"
                exit 0
            elif [ -n "$EXAMPLE_NAME" ] && [ -d "examples/$EXAMPLE_NAME" ]; then
                cd "examples/$EXAMPLE_NAME"
                print_success "Switched to examples/$EXAMPLE_NAME"
            else
                exit_with_help "Example '$EXAMPLE_NAME' not found" "• Check available examples: ls examples/
• Or create a new project: npm create astro@latest my-site"
            fi
        elif [ -d "packages" ]; then
            echo "Found packages directory:"
            ls packages/ | head -10
            echo ""
            exit_with_help "This looks like framework source code" "• Create a new project instead:
  cd ~
  npm create astro@latest my-site
  cd my-site
  quick-deploy"
        else
            exit_with_help "This appears to be framework source code, not a deployable project" "• Create a new project:
  cd ~
  npm create astro@latest my-site
  cd my-site
  quick-deploy"
        fi
    fi
}

detect_framework() {
    # Framework detection
    local framework="unknown"
    
    if [ -f "astro.config.mjs" ] || [ -f "astro.config.js" ] || [ -f "astro.config.ts" ]; then
        framework="astro"
    elif [ -f "next.config.js" ] || [ -f "next.config.mjs" ] || [ -f "next.config.ts" ]; then
        framework="nextjs"
    elif [ -f "vite.config.js" ] || [ -f "vite.config.ts" ] || [ -f "vite.config.mjs" ]; then
        framework="vite"
    elif [ -f "nuxt.config.js" ] || [ -f "nuxt.config.ts" ]; then
        framework="nuxt"
    elif [ -f "svelte.config.js" ]; then
        framework="svelte"
    elif [ -f "remix.config.js" ]; then
        framework="remix"
    else
        # Try to detect framework from package.json
        if [ -f "package.json" ]; then
            if grep -q '"astro"' package.json; then
                framework="astro"
            elif grep -q '"next"' package.json; then
                framework="nextjs"
            elif grep -q '"vite"' package.json; then
                framework="vite"
            elif grep -q '"nuxt"' package.json; then
                framework="nuxt"
            elif grep -q '"@remix-run"' package.json; then
                framework="remix"
            else
                exit_with_help "Unknown framework detected" "• Make sure you're in a web project directory
• Supported frameworks: Astro, Next.js, Vite, Nuxt, SvelteKit, Remix
• Create a new project:
  npm create astro@latest my-site  (Astro)
  npx create-next-app@latest my-app  (Next.js)
  npm create vite@latest my-app  (Vite)"
            fi
        fi
    fi
    
    echo "$framework"
}
