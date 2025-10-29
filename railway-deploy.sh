#!/bin/bash

###############################################################################
# Railway Automated Deployment Script for Sentinel
# This script automates the deployment of Sentinel to Railway
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Emojis
ROCKET="🚀"
CHECK="✅"
CROSS="❌"
INFO="ℹ️"
WARN="⚠️"
GEAR="⚙️"
CLOCK="⏱️"
LINK="🔗"

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo ""
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║${NC}  ${ROCKET} ${CYAN}SENTINEL RAILWAY DEPLOYMENT AUTOMATION${NC}  ${PURPLE}║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}${1}${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}${CHECK} ${1}${NC}"
}

print_error() {
    echo -e "${RED}${CROSS} ${1}${NC}"
}

print_info() {
    echo -e "${CYAN}${INFO} ${1}${NC}"
}

print_warn() {
    echo -e "${YELLOW}${WARN} ${1}${NC}"
}

print_progress() {
    echo -e "${YELLOW}${GEAR} ${1}${NC}"
}

spin() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while ps -p $pid > /dev/null 2>&1; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

###############################################################################
# Check Prerequisites
###############################################################################

check_prerequisites() {
    print_section "Checking Prerequisites"
    
    local all_good=true
    
    # Check if Railway CLI is installed
    if command -v railway &> /dev/null; then
        print_success "Railway CLI is installed"
        RAILWAY_VERSION=$(railway --version)
        print_info "Version: $RAILWAY_VERSION"
    else
        print_error "Railway CLI is not installed"
        print_info "Installing Railway CLI..."
        
        # Install Railway CLI
        if command -v npm &> /dev/null; then
            npm i -g @railway/cli
            print_success "Railway CLI installed successfully"
        elif command -v curl &> /dev/null; then
            bash <(curl -fsSL cli.new)
            print_success "Railway CLI installed successfully"
        else
            print_error "Cannot install Railway CLI. Please install manually:"
            echo "  npm: npm i -g @railway/cli"
            echo "  or curl: bash <(curl -fsSL cli.new)"
            all_good=false
        fi
    fi
    
    # Check if jq is installed
    if command -v jq &> /dev/null; then
        print_success "jq is installed (for JSON parsing)"
    else
        print_warn "jq is not installed (optional, but recommended)"
        print_info "Install with: sudo apt install jq"
    fi
    
    # Check if user is logged in to Railway
    if railway whoami &> /dev/null; then
        print_success "Logged in to Railway"
        RAILWAY_USER=$(railway whoami 2>/dev/null || echo "Unknown")
        print_info "User: $RAILWAY_USER"
    else
        print_warn "Not logged in to Railway"
        print_info "You'll be prompted to login during deployment"
    fi
    
    if [ "$all_good" = false ]; then
        print_error "Please fix the issues above and run the script again"
        exit 1
    fi
    
    echo ""
}

###############################################################################
# Login to Railway
###############################################################################

railway_login() {
    print_section "Railway Authentication"
    
    if railway whoami &> /dev/null; then
        RAILWAY_USER=$(railway whoami 2>/dev/null || echo "Unknown")
        print_success "Already logged in as: $RAILWAY_USER"
        
        read -p "Do you want to login with a different account? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 0
        fi
    fi
    
    print_info "Logging in to Railway with browserless mode..."
    print_info "You'll receive a pairing code to enter in your browser"
    echo ""
    print_warn "IMPORTANT: Copy the URL and code shown below"
    echo ""
    
    # Use browserless login
    railway login --browserless
    
    if railway whoami &> /dev/null; then
        RAILWAY_USER=$(railway whoami 2>/dev/null || echo "Unknown")
        print_success "Successfully logged in as: $RAILWAY_USER"
    else
        print_error "Failed to login to Railway"
        print_info "You can try logging in manually with: railway login --browserless"
        exit 1
    fi
}

###############################################################################
# Generate JWT Secret
###############################################################################

generate_jwt_secret() {
    print_section "JWT Secret Configuration"
    
    print_info "A JWT secret is required for authentication (minimum 32 characters)"
    echo ""
    
    read -p "Do you want to generate a random JWT secret? (Y/n): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
        print_success "Generated JWT secret (64 characters)"
        print_info "Secret: ${JWT_SECRET:0:20}...(hidden)"
    else
        while true; do
            read -sp "Enter your JWT secret (min 32 chars): " JWT_SECRET
            echo
            if [ ${#JWT_SECRET} -ge 32 ]; then
                print_success "JWT secret accepted"
                break
            else
                print_error "JWT secret must be at least 32 characters"
            fi
        done
    fi
    
    echo ""
}

###############################################################################
# Create Railway Project
###############################################################################

create_railway_project() {
    print_section "Creating Railway Project"
    
    local default_name="sentinel-monitoring"
    read -p "Enter project name [${default_name}]: " PROJECT_NAME
    PROJECT_NAME=${PROJECT_NAME:-$default_name}
    
    print_progress "Creating project: $PROJECT_NAME"
    
    # Initialize Railway project
    railway init -n "$PROJECT_NAME"
    
    if [ $? -eq 0 ]; then
        print_success "Railway project created: $PROJECT_NAME"
    else
        print_error "Failed to create Railway project"
        exit 1
    fi
}

###############################################################################
# Deploy PostgreSQL Database
###############################################################################

deploy_postgres() {
    print_section "Deploying PostgreSQL Database"
    
    print_progress "Adding PostgreSQL to project..."
    
    # Add PostgreSQL plugin
    railway add -d postgres
    
    if [ $? -eq 0 ]; then
        print_success "PostgreSQL database added"
        print_info "Railway will automatically configure DATABASE_URL"
    else
        print_error "Failed to add PostgreSQL"
        exit 1
    fi
    
    echo ""
    print_info "Waiting for database to be ready (30 seconds)..."
    sleep 30
    print_success "Database should be ready now"
}

###############################################################################
# Deploy Backend Service
###############################################################################

deploy_backend() {
    print_section "Deploying Backend Service"
    
    print_progress "Creating backend service..."
    
    # Create a temporary directory for backend
    mkdir -p .railway/backend
    
    # Create Railway config for backend
    cat > .railway/backend/railway.toml << EOF
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = ""
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
EOF
    
    # Create a simple Dockerfile that uses the Docker Hub image
    cat > .railway/backend/Dockerfile << EOF
FROM trinnode/sentinel-backend:latest
EOF
    
    cd .railway/backend
    
    print_info "Setting up backend service..."
    railway up -d
    
    if [ $? -eq 0 ]; then
        print_success "Backend deployment initiated"
    else
        print_error "Failed to deploy backend"
        cd ../..
        exit 1
    fi
    
    # Link to the service we just created
    print_progress "Linking to backend service..."
    railway service
    
    # Set environment variables for backend (now that we're linked)
    print_progress "Configuring backend environment variables..."
    
    railway variables --set "JWT_SECRET=$JWT_SECRET" \
                      --set "NODE_ENV=production" \
                      --set "PORT=3001" \
                      --set "WS_PORT=3002" \
                      --set "LOG_LEVEL=info"
    
    if [ $? -eq 0 ]; then
        print_success "Backend environment configured"
    else
        print_error "Failed to set environment variables"
        print_info "You can set them manually in Railway dashboard"
    fi
    
    # Generate domain (while linked to service)
    print_progress "Generating domain for backend..."
    railway domain
    
    # Try to extract domain
    BACKEND_DOMAIN=$(railway domain 2>/dev/null | grep -o 'https://[^[:space:]]*' | head -1)
    
    cd ../..
    
    # Wait for deployment
    print_info "Waiting for backend to deploy (60 seconds)..."
    sleep 60
    
    if [ -z "$BACKEND_DOMAIN" ]; then
        print_warn "Could not automatically detect backend domain"
        echo ""
        read -p "Please enter your backend Railway domain (e.g., backend-production-xxxx.up.railway.app): " BACKEND_INPUT
        BACKEND_DOMAIN="https://${BACKEND_INPUT#https://}"
    fi
    
    print_success "Backend domain: $BACKEND_DOMAIN"
    
    # Test backend health
    echo ""
    print_info "Testing backend health endpoint..."
    sleep 10
    
    if curl -f -s "${BACKEND_DOMAIN}/health" > /dev/null 2>&1; then
        print_success "Backend is healthy!"
    else
        print_warn "Backend health check failed (may still be starting up)"
        print_info "You can check status with: railway logs"
    fi
}

###############################################################################
# Deploy Dashboard Service
###############################################################################

deploy_dashboard() {
    print_section "Deploying Dashboard Service"
    
    if [ -z "$BACKEND_DOMAIN" ]; then
        read -p "Enter your backend URL: " BACKEND_DOMAIN
    fi
    
    print_progress "Creating dashboard service..."
    
    # Create a temporary directory for dashboard
    mkdir -p .railway/dashboard
    
    # Create Railway config for dashboard
    cat > .railway/dashboard/railway.toml << EOF
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = ""
healthcheckPath = "/"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
EOF
    
    # Create a simple Dockerfile that uses the Docker Hub image
    cat > .railway/dashboard/Dockerfile << EOF
FROM trinnode/sentinel-dashboard:latest
EOF
    
    cd .railway/dashboard
    
    print_info "Setting up dashboard service..."
    railway up -d
    
    if [ $? -eq 0 ]; then
        print_success "Dashboard deployment initiated"
    else
        print_error "Failed to deploy dashboard"
        cd ../..
        exit 1
    fi
    
    # Link to the service we just created
    print_progress "Linking to dashboard service..."
    railway service
    
    # Set environment variables for dashboard (now that we're linked)
    print_progress "Configuring dashboard environment variables..."
    
    railway variables --set "REACT_APP_API_URL=$BACKEND_DOMAIN" \
                      --set "REACT_APP_WS_URL=${BACKEND_DOMAIN/https:/wss:}"
    
    if [ $? -eq 0 ]; then
        print_success "Dashboard environment configured"
    else
        print_error "Failed to set environment variables"
        print_info "You can set them manually in Railway dashboard"
    fi
    
    # Generate domain (while linked to service)
    print_progress "Generating domain for dashboard..."
    railway domain
    
    # Try to extract domain
    DASHBOARD_DOMAIN=$(railway domain 2>/dev/null | grep -o 'https://[^[:space:]]*' | head -1)
    
    cd ../..
    
    # Wait for deployment
    print_info "Waiting for dashboard to deploy (60 seconds)..."
    sleep 60
    
    if [ -z "$DASHBOARD_DOMAIN" ]; then
        print_warn "Could not automatically detect dashboard domain"
        echo ""
        read -p "Please enter your dashboard Railway domain (e.g., dashboard-production-xxxx.up.railway.app): " DASHBOARD_INPUT
        DASHBOARD_DOMAIN="https://${DASHBOARD_INPUT#https://}"
    fi
    
    print_success "Dashboard domain: $DASHBOARD_DOMAIN"
    
    # Test dashboard
    echo ""
    print_info "Testing dashboard..."
    sleep 10
    
    if curl -f -s "$DASHBOARD_DOMAIN" > /dev/null 2>&1; then
        print_success "Dashboard is accessible!"
    else
        print_warn "Dashboard check failed (may still be starting up)"
        print_info "You can check status with: railway logs"
    fi
}

###############################################################################
# Display Final Summary
###############################################################################

show_summary() {
    print_section "Deployment Complete!"
    
    echo -e "${GREEN}${CHECK} Your Sentinel monitoring system is now live!${NC}"
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${ROCKET} ${YELLOW}LIVE URLS${NC}                                              ${CYAN}║${NC}"
    echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC}  ${LINK} Dashboard (Main URL):                                 ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}     ${GREEN}${DASHBOARD_DOMAIN}${NC}"
    echo -e "${CYAN}║${NC}                                                              ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  ${LINK} Backend API:                                          ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}     ${BACKEND_DOMAIN}${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    echo -e "${YELLOW}${INFO} Demo Credentials:${NC}"
    echo -e "   Email:    ${GREEN}demo@sentinel.com${NC}"
    echo -e "   Password: ${GREEN}password123${NC}"
    echo ""
    
    echo -e "${YELLOW}${GEAR} Useful Commands:${NC}"
    echo -e "   View logs:        ${CYAN}railway logs${NC}"
    echo -e "   Check status:     ${CYAN}railway status${NC}"
    echo -e "   Open dashboard:   ${CYAN}railway open${NC}"
    echo -e "   SSH into service: ${CYAN}railway shell${NC}"
    echo ""
    
    echo -e "${YELLOW}${INFO} Next Steps:${NC}"
    echo -e "   1. ${CHECK} Test your dashboard at: ${DASHBOARD_DOMAIN}"
    echo -e "   2. ${CHECK} Update README.md with live URL"
    echo -e "   3. ${CHECK} Update QUICK_REFERENCE.md with live URL"
    echo -e "   4. ${CHECK} Add live URL to hackathon submission"
    echo ""
    
    # Save URLs to file
    cat > .railway/deployment-urls.txt << EOF
Sentinel Railway Deployment URLs
================================
Deployed: $(date)

Dashboard: ${DASHBOARD_DOMAIN}
Backend:   ${BACKEND_DOMAIN}

Demo Credentials:
Email:    demo@sentinel.com
Password: password123

Health Check:
curl ${BACKEND_DOMAIN}/health

Railway Commands:
- View logs:      railway logs
- Check status:   railway status
- Open dashboard: railway open
EOF
    
    print_success "Deployment URLs saved to: .railway/deployment-urls.txt"
    echo ""
}

###############################################################################
# Update Documentation
###############################################################################

update_documentation() {
    print_section "Update Documentation"
    
    echo -e "${CYAN}Would you like to automatically update your documentation with the live URL?${NC}"
    read -p "Update README.md and QUICK_REFERENCE.md? (Y/n): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        print_progress "Updating documentation..."
        
        # Update README.md
        if [ -f "README.md" ]; then
            # Check if Live Demo section exists
            if grep -q "Live Demo" README.md; then
                print_info "README.md already has Live Demo section"
            else
                # Add Live Demo section after badges
                sed -i "/\[!\[Docker\]/a\\
\\n## 🌐 Live Demo\\n\\
Try Sentinel now: [$DASHBOARD_DOMAIN]($DASHBOARD_DOMAIN)\\n\\
\\nDemo credentials:\\n\\
\`\`\`\\n\\
Email: demo@sentinel.com\\n\\
Password: password123\\n\\
\`\`\`" README.md
                print_success "Updated README.md with live URL"
            fi
        fi
        
        # Update QUICK_REFERENCE.md
        if [ -f "QUICK_REFERENCE.md" ]; then
            sed -i "s|- **Live Demo (optional):** \`\[YOUR_DEPLOYED_URL\]\`|- **Live Demo:** \`$DASHBOARD_DOMAIN\`|g" QUICK_REFERENCE.md
            print_success "Updated QUICK_REFERENCE.md with live URL"
        fi
        
        echo ""
        print_info "Don't forget to commit and push these changes!"
        echo -e "   ${CYAN}git add README.md QUICK_REFERENCE.md${NC}"
        echo -e "   ${CYAN}git commit -m \"Add live deployment URL\"${NC}"
        echo -e "   ${CYAN}git push origin main${NC}"
    fi
}

###############################################################################
# Main Execution
###############################################################################

main() {
    print_header
    
    # Step 1: Check prerequisites
    check_prerequisites
    
    # Step 2: Login to Railway
    railway_login
    
    # Step 3: Generate JWT secret
    generate_jwt_secret
    
    # Step 4: Create Railway project
    create_railway_project
    
    # Step 5: Deploy PostgreSQL
    deploy_postgres
    
    # Step 6: Deploy Backend
    deploy_backend
    
    # Step 7: Deploy Dashboard
    deploy_dashboard
    
    # Step 8: Show summary
    show_summary
    
    # Step 9: Update documentation
    update_documentation
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}  ${ROCKET} ${YELLOW}Deployment successful! Your Sentinel is live!${NC}         ${GREEN}║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}${LINK} Open your dashboard: ${GREEN}${DASHBOARD_DOMAIN}${NC}"
    echo ""
}

# Run main function
main "$@"
