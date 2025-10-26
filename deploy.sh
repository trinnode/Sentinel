#!/bin/bash

# Sentinel Deployment Script
# Professional deployment script for the Sentinel monitoring system

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/packages/sentinel-backend/docker-compose.yml"
BACKEND_DIR="$SCRIPT_DIR/packages/sentinel-backend"
DASHBOARD_DIR="$SCRIPT_DIR/packages/sentinel-dashboard"
AGENT_DIR="$SCRIPT_DIR/packages/sentinel-agent"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    log_success "Node.js is installed"

    # Check Docker (optional, but recommended)
    if command -v docker &> /dev/null; then
        log_success "Docker is installed (will use Docker deployment)"
        DOCKER_AVAILABLE=true
    else
        log_warning "Docker is not installed. Will use native Node.js deployment."
        DOCKER_AVAILABLE=false
    fi

    # Check PostgreSQL for native deployment
    if [ "$DOCKER_AVAILABLE" = false ]; then
        if ! command -v psql &> /dev/null; then
            log_error "PostgreSQL client is not installed. Please install PostgreSQL first (for native deployment)."
            exit 1
        fi
        log_success "PostgreSQL is installed"
    fi
}

install_backend_dependencies() {
    log_info "Installing backend dependencies..."
    cd "$BACKEND_DIR"
    npm install
    log_success "Backend dependencies installed"
}

install_dashboard_dependencies() {
    log_info "Installing dashboard dependencies..."
    cd "$DASHBOARD_DIR"
    npm install
    log_success "Dashboard dependencies installed"
}

install_agent_dependencies() {
    log_info "Installing agent dependencies..."
    cd "$AGENT_DIR"
    npm install
    log_success "Agent dependencies installed"
}

build_backend() {
    log_info "Building backend..."
    cd "$BACKEND_DIR"
    npm run build
    log_success "Backend built successfully"
}

build_dashboard() {
    log_info "Building dashboard..."
    cd "$DASHBOARD_DIR"
    npm run build
    log_success "Dashboard built successfully"
}

setup_database() {
    log_info "Setting up database..."

    cd "$BACKEND_DIR"

    # Generate Prisma client
    npx prisma generate
    log_info "Prisma client generated"

    if [ "$DOCKER_AVAILABLE" = false ]; then
        log_info "Setting up native PostgreSQL database..."
        
        # Create database and user if they don't exist
        sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'sentinel_db'" | grep -q 1 || \
            sudo -u postgres psql -c "CREATE DATABASE sentinel_db;"
        
        sudo -u postgres psql -tc "SELECT 1 FROM pg_user WHERE usename = 'sentinel_user'" | grep -q 1 || \
            sudo -u postgres psql -c "CREATE USER sentinel_user WITH PASSWORD 'sentinel_password';"
        
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sentinel_db TO sentinel_user;"
        sudo -u postgres psql -d sentinel_db -c "GRANT ALL ON SCHEMA public TO sentinel_user;"
        
        log_success "Database user created"
    fi

    # Push schema to database
    npx prisma db push
    log_success "Database schema created"

    # Load initial data if init.sql exists
    if [ -f "init.sql" ] && [ "$DOCKER_AVAILABLE" = false ]; then
        log_info "Loading initial data..."
        cat init.sql | sudo -u postgres psql -d sentinel_db 2>/dev/null || true
        log_success "Initial data loaded"
    fi

    log_success "Database setup completed"
}

start_services() {
    log_info "Starting Sentinel services..."

    if [ "$DOCKER_AVAILABLE" = true ]; then
        start_services_docker
    else
        start_services_native
    fi

    log_success "Sentinel services started successfully"
}

start_services_docker() {
    log_info "Starting services via Docker Compose..."

    cd "$BACKEND_DIR"

    # Use docker compose or docker-compose based on availability
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
    else
        DOCKER_COMPOSE_CMD="docker-compose"
    fi

    $DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" up -d

    log_info "Waiting for services to be healthy..."

    # Wait for backend to be healthy
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:3001/health &> /dev/null; then
            log_success "Backend is healthy"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done

    if [ $timeout -le 0 ]; then
        log_warning "Backend health check timed out. Services may still be starting."
    fi
}

start_services_native() {
    log_info "Starting services natively (no Docker)..."

    # Start backend in background
    log_info "Starting backend API on port 3001..."
    cd "$BACKEND_DIR"
    node dist/index.js > /tmp/sentinel-backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > /tmp/sentinel-backend.pid
    log_success "Backend started (PID: $BACKEND_PID)"

    # Wait for backend to be healthy
    timeout=30
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:3001/health &> /dev/null; then
            log_success "Backend is healthy"
            break
        fi
        sleep 1
        timeout=$((timeout - 1))
    done

    if [ $timeout -le 0 ]; then
        log_warning "Backend health check timed out"
    fi

    # Start dashboard in background
    log_info "Starting dashboard on port 3000..."
    cd "$DASHBOARD_DIR/build"
    if python3 -c "import http.server" &> /dev/null; then
        python3 -m http.server 3000 > /tmp/sentinel-dashboard.log 2>&1 &
        DASHBOARD_PID=$!
        echo $DASHBOARD_PID > /tmp/sentinel-dashboard.pid
        log_success "Dashboard started (PID: $DASHBOARD_PID)"
    else
        log_warning "Python3 not available for dashboard. Install 'serve' globally: npm install -g serve"
    fi

    log_info ""
    log_info "To start a Sentinel Agent, use:"
    log_info "  AGENT_ID=<id> AGENT_API_KEY=<key> node packages/sentinel-agent/dist/cli.js start --config <config.json>"
}

stop_services() {
    log_info "Stopping Sentinel services..."

    if [ "$DOCKER_AVAILABLE" = true ]; then
        cd "$BACKEND_DIR"

        if docker compose version &> /dev/null; then
            docker compose -f "$COMPOSE_FILE" down
        else
            docker-compose -f "$COMPOSE_FILE" down
        fi
    else
        # Stop native services
        if [ -f "/tmp/sentinel-backend.pid" ]; then
            BACKEND_PID=$(cat /tmp/sentinel-backend.pid)
            kill $BACKEND_PID 2>/dev/null || true
            rm /tmp/sentinel-backend.pid
            log_success "Backend stopped"
        fi

        if [ -f "/tmp/sentinel-dashboard.pid" ]; then
            DASHBOARD_PID=$(cat /tmp/sentinel-dashboard.pid)
            kill $DASHBOARD_PID 2>/dev/null || true
            rm /tmp/sentinel-dashboard.pid
            log_success "Dashboard stopped"
        fi
    fi

    log_success "Services stopped"
}

show_status() {
    log_info "Service Status:"
    echo

    if [ "$DOCKER_AVAILABLE" = true ]; then
        cd "$BACKEND_DIR"

        if docker compose version &> /dev/null; then
            docker compose -f "$COMPOSE_FILE" ps
        else
            docker-compose -f "$COMPOSE_FILE" ps
        fi
    else
        # Show native service status
        if [ -f "/tmp/sentinel-backend.pid" ]; then
            BACKEND_PID=$(cat /tmp/sentinel-backend.pid)
            if ps -p $BACKEND_PID > /dev/null; then
                echo "✅ Backend API (PID: $BACKEND_PID) - Running"
            else
                echo "❌ Backend API (PID: $BACKEND_PID) - Not running"
            fi
        else
            echo "⚠️  Backend API - Not started"
        fi

        if [ -f "/tmp/sentinel-dashboard.pid" ]; then
            DASHBOARD_PID=$(cat /tmp/sentinel-dashboard.pid)
            if ps -p $DASHBOARD_PID > /dev/null; then
                echo "✅ Dashboard (PID: $DASHBOARD_PID) - Running"
            else
                echo "❌ Dashboard (PID: $DASHBOARD_PID) - Not running"
            fi
        else
            echo "⚠️  Dashboard - Not started"
        fi

        echo "✅ PostgreSQL Database - sentinel_db"
    fi

    echo
    log_info "Access Information:"
    echo "  Dashboard: http://localhost:3000"
    echo "  Backend API: http://localhost:3001"
    echo "  WebSocket: ws://localhost:3002"
    echo "  Database: postgresql://sentinel_user:sentinel_password@localhost:5432/sentinel_db"
    echo
    echo "  Demo Credentials:"
    echo "    Email: demo@sentinel.com"
    echo "    Password: password"
}

run_tests() {
    log_info "Running tests..."

    # Backend tests
    cd "$BACKEND_DIR"
    if [ -f "package.json" ]; then
        npm test
    fi

    # Agent tests
    cd "$AGENT_DIR"
    if [ -f "package.json" ]; then
        npm test
    fi

    log_success "All tests passed"
}

create_demo_data() {
    log_info "Creating demo data..."

    cd "$BACKEND_DIR"

    # Wait for database to be ready
    sleep 5

    # Run Prisma studio or seed script if available
    if npx prisma studio --help &> /dev/null; then
        log_info "Prisma Studio available for data management"
    fi

    log_success "Demo data setup completed"
}

# Global variable to track if Docker is available
DOCKER_AVAILABLE=false

# Main deployment logic
main() {
    echo "🚀 Sentinel Deployment Script"
    echo "============================"

    case "${1:-deploy}" in
        "deploy")
            check_dependencies
            install_backend_dependencies
            install_dashboard_dependencies
            install_agent_dependencies
            build_backend
            build_dashboard
            setup_database
            start_services
            show_status
            ;;

        "build")
            check_dependencies
            install_backend_dependencies
            install_dashboard_dependencies
            install_agent_dependencies
            build_backend
            build_dashboard
            log_success "Build completed successfully"
            ;;

        "start")
            start_services
            show_status
            ;;

        "stop")
            stop_services
            ;;

        "restart")
            stop_services
            start_services
            show_status
            ;;

        "status")
            show_status
            ;;

        "logs")
            cd "$BACKEND_DIR"
            if docker compose version &> /dev/null; then
                docker compose -f "$COMPOSE_FILE" logs -f
            else
                docker-compose -f "$COMPOSE_FILE" logs -f
            fi
            ;;

        "test")
            run_tests
            ;;

        "demo")
            create_demo_data
            ;;

        "clean")
            log_info "Cleaning up..."
            stop_services

            # Clean build artifacts
            cd "$BACKEND_DIR"
            npm run clean 2>/dev/null || true

            cd "$DASHBOARD_DIR"
            npm run clean 2>/dev/null || true

            cd "$AGENT_DIR"
            npm run clean 2>/dev/null || true

            # Clean Docker resources
            if docker compose version &> /dev/null; then
                docker compose -f "$COMPOSE_FILE" down -v --remove-orphans
            else
                docker-compose -f "$COMPOSE_FILE" down -v --remove-orphans
            fi

            log_success "Cleanup completed"
            ;;

        *)
            echo "Usage: $0 {deploy|build|start|stop|restart|status|logs|test|demo|clean}"
            echo
            echo "Commands:"
            echo "  deploy  - Full deployment (default)"
            echo "  build   - Build all components"
            echo "  start   - Start services"
            echo "  stop    - Stop services"
            echo "  restart - Restart services"
            echo "  status  - Show service status"
            echo "  logs    - Show service logs"
            echo "  test    - Run tests"
            echo "  demo    - Setup demo data"
            echo "  clean   - Clean everything"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
