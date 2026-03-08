<#
.SYNOPSIS
    MurrayDash Development Setup Script
.DESCRIPTION
    Starts PostgreSQL via Docker (if not already running) and launches the Next.js dev server.
    Idempotent - safe to run multiple times.
#>

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "MurrayDash Development Setup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$CONTAINER_NAME = "murraydash-postgres"
$DB_USER = "murraydash"
$DB_PASS = "murraydash2026!"
$DB_NAME = "murraydash"
$DB_PORT = 5434

# Check if Docker is running
Write-Host "[1/5] Checking Docker..." -ForegroundColor Yellow
try {
    docker info 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker is not running"
    }
    Write-Host "  Docker is running" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Docker is not running or not installed" -ForegroundColor Red
    Write-Host "  Please start Docker Desktop and try again" -ForegroundColor Red
    exit 1
}

# Start PostgreSQL container (idempotent)
Write-Host "[2/5] Starting PostgreSQL container..." -ForegroundColor Yellow
$existingContainer = docker ps -a --format '{{.Names}}' | Where-Object { $_ -eq $CONTAINER_NAME }

if ($existingContainer) {
    # Container exists, check if running
    $isRunning = docker ps --format '{{.Names}}' | Where-Object { $_ -eq $CONTAINER_NAME }
    if ($isRunning) {
        Write-Host "  Container '$CONTAINER_NAME' is already running" -ForegroundColor Green
    } else {
        Write-Host "  Starting existing container '$CONTAINER_NAME'..." -ForegroundColor Cyan
        docker start $CONTAINER_NAME
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ERROR: Failed to start container" -ForegroundColor Red
            exit 1
        }
        Write-Host "  Container started" -ForegroundColor Green
    }
} else {
    # Create and start new container
    Write-Host "  Creating new PostgreSQL container..." -ForegroundColor Cyan
    docker run -d `
        --name $CONTAINER_NAME `
        -e POSTGRES_USER=$DB_USER `
        -e POSTGRES_PASSWORD=$DB_PASS `
        -e POSTGRES_DB=$DB_NAME `
        -p $DB_PORT`:5432 `
        postgres:16-alpine
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: Failed to create container" -ForegroundColor Red
        exit 1
    }
    Write-Host "  Container created and started" -ForegroundColor Green
}

# Wait for PostgreSQL to be ready
Write-Host "[3/5] Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
$maxRetries = 30
$retryCount = 0
$dbReady = $false

while ($retryCount -lt $maxRetries) {
    $result = docker exec $CONTAINER_NAME pg_isready -U $DB_USER -d $DB_NAME 2>$null
    if ($LASTEXITCODE -eq 0) {
        $dbReady = $true
        break
    }
    $retryCount++
    Write-Host "  Waiting... ($retryCount/$maxRetries)" -ForegroundColor Gray
    Start-Sleep -Seconds 1
}

if (-not $dbReady) {
    Write-Host "  ERROR: PostgreSQL did not become ready in time" -ForegroundColor Red
    exit 1
}
Write-Host "  PostgreSQL is ready" -ForegroundColor Green

# Ensure database exists
Write-Host "[4/5] Ensuring database exists..." -ForegroundColor Yellow
$dbExists = docker exec $CONTAINER_NAME psql -U $DB_USER -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>$null
if ($dbExists -notmatch "1") {
    docker exec $CONTAINER_NAME psql -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME" 2>$null | Out-Null
    Write-Host "  Database '$DB_NAME' created" -ForegroundColor Green
} else {
    Write-Host "  Database '$DB_NAME' already exists" -ForegroundColor Green
}

# Install dependencies if needed
Write-Host "[5/5] Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "  Running npm install..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: npm install failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "  Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  Dependencies already installed" -ForegroundColor Green
}

# Start Next.js dev server
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Starting Next.js development server..." -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Dashboard: http://localhost:3100" -ForegroundColor White
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

npm run dev:3100
