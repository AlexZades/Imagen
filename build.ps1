# PixelVault Docker Build Script for PowerShell

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("build", "run", "compose-up", "compose-down", "clean")]
    [string]$Action = "build",
    
    [Parameter(Mandatory=$false)]
    [switch]$NoCache
)

$ImageName = "pixelvault:latest"
$ContainerName = "pixelvault-web"
$Port = "4144:4144"
$DatabaseUrl = "postgresql://admin:internal1234@192.168.0.17:5432/Imagen?schema=public"
$ComfyUIUrl = "http://192.168.0.16:3000"

function Build-Image {
    Write-Host "Building Docker image..." -ForegroundColor Green
    
    if ($NoCache) {
        docker build --no-cache -t $ImageName .
    } else {
        docker build -t $ImageName .
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Build successful!" -ForegroundColor Green
    } else {
        Write-Host "Build failed!" -ForegroundColor Red
        exit 1
    }
}

function Run-Container {
    Write-Host "Running Docker container..." -ForegroundColor Green
    
    # Stop existing container if running
    docker stop $ContainerName 2>$null
    docker rm $ContainerName 2>$null
    
    docker run -d `
        --name $ContainerName `
        -p $Port `
        -e DATABASE_URL="$DatabaseUrl" `
        -e COMFYUI_API_URL="$ComfyUIUrl" `
        -v pixelvault_uploads:/app/public/uploads `
        $ImageName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Container started successfully!" -ForegroundColor Green
        Write-Host "Access the app at: http://localhost:4144" -ForegroundColor Cyan
    } else {
        Write-Host "Failed to start container!" -ForegroundColor Red
        exit 1
    }
}

function Start-Compose {
    Write-Host "Starting with Docker Compose..." -ForegroundColor Green
    
    if ($NoCache) {
        docker compose build --no-cache
    }
    
    docker compose up --build -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Docker Compose started successfully!" -ForegroundColor Green
        Write-Host "Access the app at: http://localhost:4144" -ForegroundColor Cyan
        Write-Host "View logs with: docker compose logs -f" -ForegroundColor Yellow
    } else {
        Write-Host "Failed to start Docker Compose!" -ForegroundColor Red
        exit 1
    }
}

function Stop-Compose {
    Write-Host "Stopping Docker Compose..." -ForegroundColor Green
    docker compose down
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Docker Compose stopped successfully!" -ForegroundColor Green
    }
}

function Clean-Docker {
    Write-Host "Cleaning Docker resources..." -ForegroundColor Yellow
    
    # Stop and remove container
    docker stop $ContainerName 2>$null
    docker rm $ContainerName 2>$null
    
    # Remove image
    docker rmi $ImageName 2>$null
    
    # Clean build cache
    docker builder prune -f
    
    Write-Host "Cleanup complete!" -ForegroundColor Green
}

# Main execution
switch ($Action) {
    "build" {
        Build-Image
    }
    "run" {
        Build-Image
        Run-Container
    }
    "compose-up" {
        Start-Compose
    }
    "compose-down" {
        Stop-Compose
    }
    "clean" {
        Clean-Docker
    }
}