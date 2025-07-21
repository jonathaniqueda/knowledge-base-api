#!/bin/bash

# Docker management scripts for Knowledge Base API

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Build production image
build_production() {
    print_header "Building Production Image"
    docker build -t knowledge-base-api:latest .
    print_status "Production image built successfully"
}

# Build development image
build_development() {
    print_header "Building Development Image"
    docker build -f Dockerfile.dev -t knowledge-base-api:dev .
    print_status "Development image built successfully"
}

# Start production services
start_production() {
    print_header "Starting Production Services"
    docker-compose up -d
    print_status "Production services started"
    print_status "API available at: http://localhost:3000"
    print_status "Health check: http://localhost:3000/health"
}

# Start development services
start_development() {
    print_header "Starting Development Services"
    docker-compose --profile dev up -d knowledge-base-api-dev
    print_status "Development services started"
    print_status "API available at: http://localhost:3001"
    print_status "Health check: http://localhost:3001/health"
}

# Start with nginx proxy
start_with_proxy() {
    print_header "Starting Services with Nginx Proxy"
    docker-compose --profile production up -d
    print_status "Services with proxy started"
    print_status "API available at: http://localhost"
    print_status "Health check: http://localhost/health"
}

# Start with caching
start_with_cache() {
    print_header "Starting Services with Redis Cache"
    docker-compose --profile cache up -d
    print_status "Services with cache started"
    print_status "Redis available at: localhost:6379"
}

# Stop all services
stop_services() {
    print_header "Stopping All Services"
    docker-compose down
    print_status "All services stopped"
}

# Clean up everything
cleanup() {
    print_header "Cleaning Up Docker Resources"
    docker-compose down -v --remove-orphans
    docker system prune -f
    print_status "Cleanup completed"
}

# View logs
view_logs() {
    local service=${1:-knowledge-base-api}
    print_header "Viewing Logs for $service"
    docker-compose logs -f "$service"
}

# Run tests in container
run_tests() {
    print_header "Running Tests in Container"
    docker run --rm -v "$(pwd):/app" -w /app node:20-alpine sh -c "npm ci && npm test"
    print_status "Tests completed"
}

# Health check
health_check() {
    print_header "Performing Health Check"
    
    # Check if container is running
    if docker-compose ps | grep -q "knowledge-base-api.*Up"; then
        print_status "Container is running"
        
        # Check API health endpoint
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            print_status "API health check passed"
        else
            print_warning "API health check failed"
        fi
    else
        print_error "Container is not running"
    fi
}

# Show container stats
show_stats() {
    print_header "Container Statistics"
    docker stats --no-stream
}

# Backup data
backup_data() {
    local backup_dir="./backups/$(date +%Y%m%d_%H%M%S)"
    print_header "Backing Up Data"
    
    mkdir -p "$backup_dir"
    
    # Backup volume data
    docker run --rm -v knowledge_base_data:/data -v "$(pwd)/$backup_dir:/backup" alpine tar czf /backup/data.tar.gz -C /data .
    
    print_status "Data backed up to: $backup_dir"
}

# Restore data
restore_data() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        print_error "Please provide backup file path"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_header "Restoring Data from $backup_file"
    
    # Stop services first
    docker-compose down
    
    # Restore data
    docker run --rm -v knowledge_base_data:/data -v "$(pwd):/backup" alpine sh -c "cd /data && tar xzf /backup/$backup_file"
    
    # Start services
    docker-compose up -d
    
    print_status "Data restored successfully"
}

# Show help
show_help() {
    echo "Knowledge Base API Docker Management Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  build-prod          Build production Docker image"
    echo "  build-dev           Build development Docker image"
    echo "  start-prod          Start production services"
    echo "  start-dev           Start development services"
    echo "  start-proxy         Start services with Nginx proxy"
    echo "  start-cache         Start services with Redis cache"
    echo "  stop                Stop all services"
    echo "  cleanup             Stop services and clean up resources"
    echo "  logs [service]      View logs (default: knowledge-base-api)"
    echo "  test                Run tests in container"
    echo "  health              Perform health check"
    echo "  stats               Show container statistics"
    echo "  backup              Backup application data"
    echo "  restore [file]      Restore data from backup file"
    echo "  help                Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 build-prod       # Build production image"
    echo "  $0 start-dev        # Start development environment"
    echo "  $0 logs nginx       # View nginx logs"
    echo "  $0 restore backups/20231201_120000/data.tar.gz"
}

# Main script logic
case "$1" in
    "build-prod")
        build_production
        ;;
    "build-dev")
        build_development
        ;;
    "start-prod")
        start_production
        ;;
    "start-dev")
        start_development
        ;;
    "start-proxy")
        start_with_proxy
        ;;
    "start-cache")
        start_with_cache
        ;;
    "stop")
        stop_services
        ;;
    "cleanup")
        cleanup
        ;;
    "logs")
        view_logs "$2"
        ;;
    "test")
        run_tests
        ;;
    "health")
        health_check
        ;;
    "stats")
        show_stats
        ;;
    "backup")
        backup_data
        ;;
    "restore")
        restore_data "$2"
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    "")
        print_error "No command provided"
        show_help
        exit 1
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac

