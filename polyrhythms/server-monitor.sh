#!/bin/bash

# Kill any existing Python server processes
echo "Stopping any existing flexible-server.py processes..."
pkill -f "python3 flexible-server.py" || echo "No server processes found"

# Wait a moment for ports to be freed
sleep 1

# Check if ports are in use
echo "Checking if ports are in use..."

PORTS_TO_CHECK=(5555 8000 8080 3000)
PORTS_IN_USE=()

for PORT in "${PORTS_TO_CHECK[@]}"; do
    if lsof -i:$PORT > /dev/null; then
        echo "Port $PORT is in use by:"
        lsof -i:$PORT
        PORTS_IN_USE+=($PORT)
    else
        echo "Port $PORT is available"
    fi
done

# Start the server
echo "Starting flexible-server.py..."
python3 flexible-server.py &

# Wait for the server to start
sleep 2

# Check which port it's running on
echo "Server should now be running. Checking ports again..."
for PORT in "${PORTS_TO_CHECK[@]}"; do
    if lsof -i:$PORT | grep -q "python"; then
        echo "Server is running on http://localhost:$PORT"
        echo "Opening in browser..."
        open "http://localhost:$PORT"
        break
    fi
done

echo "Server monitor completed. Use the following commands if needed:"
echo "- To stop the server: pkill -f 'python3 flexible-server.py'"
echo "- To check server processes: ps aux | grep 'flexible-server.py'" 