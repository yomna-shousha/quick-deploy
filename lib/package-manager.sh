#!/bin/bash

# Package manager detection and setup

setup_package_manager() {
    # Package manager detection with bulletproof auto-install
    PACKAGE_MANAGER="npm"
    LOCKFILE_FOUND=""

    if [ -f "pnpm-lock.yaml" ]; then
        LOCKFILE_FOUND="pnpm-lock.yaml"
        print_info "Found pnpm-lock.yaml, checking for pnpm..."
        
        if command -v pnpm >/dev/null 2>&1; then
            # Test if pnpm actually works with a timeout to avoid hanging
            if timeout 3s pnpm --version >/dev/null 2>&1; then
                PACKAGE_MANAGER="pnpm"
                print_success "pnpm is available and working"
            else
                print_warning "pnpm found but not functioning properly"
                PACKAGE_MANAGER="npm"
                print_info "Using npm instead (will work with existing lockfile)"
            fi
        else
            handle_missing_pnpm
        fi

    elif [ -f "yarn.lock" ]; then
        LOCKFILE_FOUND="yarn.lock"
        print_info "Found yarn.lock, checking for yarn..."
        
        if command -v yarn >/dev/null 2>&1; then
            # Test yarn with timeout
            if timeout 3s yarn --version >/dev/null 2>&1; then
                PACKAGE_MANAGER="yarn"
                print_success "yarn is available"
            else
                print_warning "yarn found but not working properly"
                PACKAGE_MANAGER="npm"
                print_info "Using npm instead"
            fi
        else
            handle_missing_yarn
        fi

    elif [ -f "bun.lockb" ]; then
        LOCKFILE_FOUND="bun.lockb"
        print_info "Found bun.lockb, checking for bun..."
        
        if command -v bun >/dev/null 2>&1; then
            PACKAGE_MANAGER="bun"
            print_success "bun is available"
        else
            exit_with_help "bun.lockb found but bun not available" "• Install bun: curl -fsSL https://bun.sh/install | bash
• Then restart your terminal and run the script again
• Or delete bun.lockb to use npm instead"
        fi
    fi

    echo "📦 Using $PACKAGE_MANAGER for dependencies..."
    if [ -n "$LOCKFILE_FOUND" ]; then
        print_info "Detected lockfile: $LOCKFILE_FOUND"
    fi

    # Verify package manager works before proceeding
    verify_package_manager
}

handle_missing_pnpm() {
    print_warning "pnpm-lock.yaml found but pnpm not available"
    
    # Check if we have working npm as fallback
    if command -v npm >/dev/null 2>&1 && npm --version >/dev/null 2>&1; then
        print_info "System npm is available (v$(npm --version))"
        echo "🤔 Options:"
        echo "  1. Try to install pnpm"
        echo "  2. Use npm instead (recommended - will work fine)"
        echo "  3. Exit and install pnpm manually"
        echo ""
        read -p "Choose option (1/2/3): " -n 1 -r CHOICE
        echo ""
        
        case $CHOICE in
            1)
                install_pnpm
                ;;
            2)
                PACKAGE_MANAGER="npm"
                print_info "Using npm (will work fine with pnpm-lock.yaml)"
                ;;
            3)
                exit_with_help "User chose to exit" "• Install pnpm manually:
  - Via npm: npm install -g pnpm
  - Via Homebrew: brew install pnpm  
  - Via curl: curl -fsSL https://get.pnpm.io/install.sh | sh -
• Then run quick-deploy again"
                ;;
            *)
                print_info "Invalid choice, defaulting to npm"
                PACKAGE_MANAGER="npm"
                ;;
        esac
    else
        exit_with_help "No working package manager found" "• Install Node.js: https://nodejs.org
• Or fix your current installation
• Current node: $(node --version 2>/dev/null || echo 'not found')
• Current npm: $(npm --version 2>/dev/null || echo 'not found')"
    fi
}

install_pnpm() {
    if command -v volta >/dev/null 2>&1; then
        echo "🔧 Attempting to install pnpm via Volta..."
        if timeout 10s volta install pnpm >/dev/null 2>&1 && command -v pnpm >/dev/null 2>&1; then
            PACKAGE_MANAGER="pnpm"
            print_success "pnpm installed via Volta"
        else
            print_warning "Volta pnpm installation failed (likely network/cert issue)"
            print_info "Falling back to npm"
            PACKAGE_MANAGER="npm"
        fi
    else
        echo "🔧 Attempting to install pnpm globally..."
        if npm install -g pnpm >/dev/null 2>&1 && command -v pnpm >/dev/null 2>&1; then
            PACKAGE_MANAGER="pnpm"
            print_success "pnpm installed globally"
        else
            print_warning "Global pnpm installation failed"
            print_info "Falling back to npm"
            PACKAGE_MANAGER="npm"
        fi
    fi
}

handle_missing_yarn() {
    print_warning "yarn.lock found but yarn not available"
    echo "🔧 Installing yarn globally..."
    if npm install -g yarn >/dev/null 2>&1; then
        PACKAGE_MANAGER="yarn"
        print_success "yarn installed globally"
    else
        print_warning "Yarn install failed, using npm"
        PACKAGE_MANAGER="npm"
    fi
}

verify_package_manager() {
    echo "🔍 Testing package manager..."
    case $PACKAGE_MANAGER in
        "pnpm")
            if ! timeout 3s pnpm --version >/dev/null 2>&1; then
                print_warning "pnpm test failed, switching to npm"
                PACKAGE_MANAGER="npm"
            fi
            ;;
        "yarn")
            if ! timeout 3s yarn --version >/dev/null 2>&1; then
                print_warning "yarn test failed, switching to npm"
                PACKAGE_MANAGER="npm"
            fi
            ;;
        "bun")
            if ! bun --version >/dev/null 2>&1; then
                exit_with_help "bun is not working properly" "• Install bun: curl -fsSL https://bun.sh/install | bash
• Restart terminal and try again"
            fi
            ;;
        *)
            if ! npm --version >/dev/null 2>&1; then
                exit_with_help "npm is not available" "• Install Node.js: https://nodejs.org
• Then run the script again"
            fi
            ;;
    esac
}

install_dependencies() {
    echo "🔄 Installing dependencies..."
    case $PACKAGE_MANAGER in
        "pnpm")
            if ! pnpm install; then
                exit_with_help "pnpm install failed" "• Try: rm -rf node_modules pnpm-lock.yaml && npm install
• Or check if you have write permissions in this directory
• Check the error messages above for specific issues"
            fi
            ;;
        "yarn")
            install_with_yarn
            ;;
        "bun")
            if ! bun install; then
                exit_with_help "bun install failed" "• Try: rm -rf node_modules bun.lockb && npm install
• Or check if you have write permissions in this directory
• Check the error messages above for specific issues"
            fi
            ;;
        *)
            if ! npm install; then
                exit_with_help "npm install failed" "• Try: rm -rf node_modules package-lock.json && npm install
• Check if you have write permissions in this directory
• Make sure you have a stable internet connection
• Check the error messages above for specific issues"
            fi
            ;;
    esac

    print_success "Dependencies installed"
}

install_with_yarn() {
    if ! yarn install 2>&1 | tee /tmp/install_output.log; then
        # Check for Corepack/Yarn version mismatch
        if grep -q "packageManager.*yarn" /tmp/install_output.log && grep -q "Corepack" /tmp/install_output.log; then
            handle_yarn_corepack_issue
        else
            exit_with_help "yarn install failed" "• Try: rm -rf node_modules yarn.lock && npm install
• Or check if you have write permissions in this directory
• Check the error messages above for specific issues"
        fi
    fi
}

handle_yarn_corepack_issue() {
    print_warning "Yarn version mismatch detected - project requires newer Yarn via Corepack"
    echo "Options:"
    echo "  1. Enable Corepack and use project's Yarn version (recommended)"
    echo "  2. Use npm instead (delete yarn.lock)"
    echo "  3. Exit and handle manually"
    echo ""
    read -p "Choose option (1/2/3): " -n 1 -r YARN_CHOICE
    echo ""
    
    case $YARN_CHOICE in
        1)
            echo "🔧 Enabling Corepack and using project's Yarn version..."
            if corepack enable 2>/dev/null && corepack install 2>/dev/null; then
                print_success "Corepack enabled, retrying with correct Yarn version"
                if yarn install; then
                    print_success "Dependencies installed with Corepack Yarn"
                else
                    print_warning "Corepack Yarn install failed, falling back to npm"
                    PACKAGE_MANAGER="npm"
                    npm install
                fi
            else
                print_warning "Corepack setup failed, falling back to npm"
                PACKAGE_MANAGER="npm"
                npm install
            fi
            ;;
        2)
            print_info "Switching to npm (yarn.lock will be ignored)"
            PACKAGE_MANAGER="npm"
            npm install
            ;;
        3)
            exit_with_help "User chose to exit" "• Enable Corepack manually: corepack enable
• Install project's Yarn version: corepack install  
• Then run quick-deploy again
• Or use npm: delete yarn.lock and run with npm"
            ;;
        *)
            print_info "Invalid choice, falling back to npm"
            PACKAGE_MANAGER="npm"
            npm install
            ;;
    esac
}
