# MurrayDash Deploy Script
# Deploys latest main branch to Synology NAS

$NAS_USER = "tpcmurray"
$NAS_HOST = "192.168.1.15"
$NAS_PORT = 11111
$APP_DIR = "/volume1/docker/murraydash/app"

Write-Host "Deploying MurrayDash to NAS..." -ForegroundColor Cyan

# SSH commands to run on NAS
$commands = @"
set -e
echo 'Downloading latest from GitHub...'
curl -sL https://github.com/tpcmurray/murraydash26/archive/refs/heads/main.tar.gz -o /tmp/murraydash.tar.gz
echo 'Extracting...'
rm -rf /tmp/murraydash26-main
tar -xzf /tmp/murraydash.tar.gz -C /tmp/
echo 'Backing up .env...'
cp $APP_DIR/.env /tmp/murraydash.env.bak
echo 'Replacing app files (preserving .env)...'
find $APP_DIR -mindepth 1 -maxdepth 1 ! -name '.env' -exec rm -rf {} +
cp -r /tmp/murraydash26-main/. $APP_DIR/
echo 'Restoring .env...'
cp /tmp/murraydash.env.bak $APP_DIR/.env
echo 'Fixing Dockerfile for npm install (lockfile drift)...'
sed -i 's/npm ci/npm install/' $APP_DIR/Dockerfile
echo 'Rebuilding container...'
cd $APP_DIR
sudo /usr/local/bin/docker compose up -d --build
echo 'Running schema sync...'
sleep 3
sudo /usr/local/bin/docker compose exec -T web sh -c 'echo y | npx drizzle-kit push' || echo 'WARN: schema sync failed; run manually if needed'
echo 'Cleaning up...'
rm -rf /tmp/murraydash26-main /tmp/murraydash.tar.gz /tmp/murraydash.env.bak
echo 'Deploy complete!'
"@

ssh -p $NAS_PORT "$NAS_USER@$NAS_HOST" $commands

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deploy successful!" -ForegroundColor Green
} else {
    Write-Host "Deploy failed!" -ForegroundColor Red
    exit 1
}
