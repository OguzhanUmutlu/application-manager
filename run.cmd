@echo off
if not exist "node_modules" (
    echo "Installing dependencies..."
    npm install
)
echo "Starting the server..."
node index