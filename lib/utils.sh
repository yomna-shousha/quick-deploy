#!/bin/bash

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# Function to exit with helpful message
exit_with_help() {
    echo ""
    print_error "$1"
    echo ""
    print_info "💡 Next Steps:"
    echo "$2"
    exit 1
}

# Check environment dependencies
check_environment_dependencies() {
    echo "🔍 Checking for environment dependencies..."
    ENV_ISSUES=""

    # Check for common environment variable patterns in source code
    if [ -d "src" ]; then
        # Look for import.meta.env usage
        ENV_VARS=$(grep -r "import\.meta\.env\." src/ 2>/dev/null | grep -v node_modules | head -10)
        if [ -n "$ENV_VARS" ]; then
            print_warning "Found environment variable dependencies:"
            echo "$ENV_VARS" | head -5
            
            # Check if .env file exists
            if [ ! -f ".env" ] && [ ! -f ".env.local" ] && [ ! -f ".env.production" ]; then
                ENV_ISSUES="missing_env_file"
            fi
        fi
        
        # Check for process.env usage (Node.js style)
        PROCESS_ENV_VARS=$(grep -r "process\.env\." src/ 2>/dev/null | grep -v node_modules | head -5)
        if [ -n "$PROCESS_ENV_VARS" ]; then
            print_warning "Found Node.js environment variables:"
            echo "$PROCESS_ENV_VARS" | head -3
            if [ ! -f ".env" ]; then
                ENV_ISSUES="missing_env_file"
            fi
        fi
    fi

    # Handle environment issues
    if [ "$ENV_ISSUES" = "missing_env_file" ]; then
        print_warning "Project uses environment variables but no .env file found"
        echo ""
        echo "Options:"
        echo "  1. Create empty .env file and build anyway (might fail)"
        echo "  2. Skip environment checks and try building"
        echo "  3. Exit and create .env file manually"
        echo ""
        
        # Keep asking until we get a valid response
        while true; do
            read -p "Choose option (1/2/3): " -n 1 -r ENV_CHOICE
            echo ""
            
            case $ENV_CHOICE in
                1)
                    echo "# Auto-generated .env file" > .env
                    echo "# Add your environment variables here" >> .env
                    if [ -n "$ENV_VARS" ]; then
                        # Extract variable names and add as comments
                        echo "$ENV_VARS" | sed 's/.*import\.meta\.env\.\([A-Z_]*\).*/# \1=your_value_here/' | sort -u >> .env
                    fi
                    if [ -n "$PROCESS_ENV_VARS" ]; then
                        # Extract Node.js env vars too
                        echo "$PROCESS_ENV_VARS" | sed 's/.*process\.env\.\([A-Z_]*\).*/# \1=your_value_here/' | sort -u >> .env
                    fi
                    print_info "Created empty .env file with variable placeholders"
                    print_warning "Build might still fail if variables are required"
                    break
                    ;;
                2)
                    print_info "Proceeding without environment file"
                    break
                    ;;
                3)
                    # Extract variable names for user guidance
                    if [ -n "$ENV_VARS" ]; then
                        print_info "Required environment variables found:"
                        echo "$ENV_VARS" | sed 's/.*import\.meta\.env\.\([A-Z_]*\).*/\1/' | sort -u | sed 's/^/  /'
                    fi
                    if [ -n "$PROCESS_ENV_VARS" ]; then
                        echo "$PROCESS_ENV_VARS" | sed 's/.*process\.env\.\([A-Z_]*\).*/\1/' | sort -u | sed 's/^/  /'
                    fi
                    exit_with_help "User chose to exit" "• Create a .env file with required variables:
  touch .env
• Add your environment variables like:
  VARIABLE_NAME=your_value
• Then run quick-deploy again"
                    ;;
                *)
                    print_warning "Invalid choice. Please enter 1, 2, or 3."
                    continue
                    ;;
            esac
        done
    fi
}

# Generic build function
generic_build() {
    echo "🏗️  Building project..."
    BUILD_SUCCESS=false

    case $PACKAGE_MANAGER in
        "pnpm")
            if pnpm build 2>&1 | tee /tmp/build_output.log; then
                check_build_success
            else
                BUILD_SUCCESS=false
            fi
            ;;
        "yarn")
            if yarn build 2>&1 | tee /tmp/build_output.log; then
                check_build_success
            else
                BUILD_SUCCESS=false
            fi
            ;;
        "bun")
            if bun run build 2>&1 | tee /tmp/build_output.log; then
                check_build_success
            else
                BUILD_SUCCESS=false
            fi
            ;;
        *)
            if npm run build 2>&1 | tee /tmp/build_output.log; then
                check_build_success
            else
                BUILD_SUCCESS=false
            fi
            ;;
    esac

    if [ "$BUILD_SUCCESS" = false ]; then
        handle_build_failure
    fi

    print_success "Build completed"
}

# Check if build was actually successful
check_build_success() {
    if grep -q "Failed to parse URL from undefined\|Invalid URL\|Error:\|BUILD FAILED\|Build failed" /tmp/build_output.log; then
        BUILD_SUCCESS=false
    elif grep -q "✓ Compiled successfully\|Complete!\|built in\|Build completed\|✓ Generating static pages\|Finalizing page optimization" /tmp/build_output.log; then
        BUILD_SUCCESS=true
    else
        BUILD_SUCCESS=true
    fi
}

# Handle build failures with specific error messages
handle_build_failure() {
    if grep -q "Failed to parse URL from undefined" /tmp/build_output.log; then
        exit_with_help "Build failed: Missing environment variables" "• This project requires environment variables that aren't set
• Look for variables in src/content.config.ts or similar files
• Create a .env file:
  touch .env
• Add your variables (example based on your error):
  MARBLE_WORKSPACE_KEY=your_workspace_key
  MARBLE_API_URL=https://your-marble-api-url.com
• If you don't have these API credentials, this project can't be built
• This appears to be a CMS-connected project requiring external service access"
    elif grep -q "Invalid URL" /tmp/build_output.log; then
        exit_with_help "Build failed: Invalid URL configuration" "• Check your environment variables for correct URLs
• Make sure all URLs start with http:// or https://
• Verify your .env file has correct values"
    else
        exit_with_help "Build failed with $PACKAGE_MANAGER" "• Check the build errors above
• Try: $PACKAGE_MANAGER run dev (to test if the project works)
• Make sure all dependencies are compatible
• Check your framework's documentation for build issues"
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
    elif [ -d ".output/public" ] && [ "$(ls -A .output/public 2>/dev/null)" ]; then
        BUILD_DIR="./.output/public"
        print_success "Using .output/public/ directory (Nuxt)"
    elif [ -d ".svelte-kit/output" ] && [ "$(ls -A .svelte-kit/output 2>/dev/null)" ]; then
        BUILD_DIR="./.svelte-kit/output"
        print_success "Using .svelte-kit/output/ directory (SvelteKit)"
    else
        exit_with_help "No build output found" "Check if the build created any output directories"
    fi
}
