@echo off
echo ==============================================
echo   PROMPTFORGE MULTI-LLM PLATFORM LAUNCHER
echo ==============================================
echo.
echo Starting all 4 background microservices...
echo.

echo [1/4] Starting Research Backend (Port 3000)...
start "Research Backend" cmd /k "cd research_backend && npm start"

echo [2/4] Starting Storage Backend (Port 8000)...
start "Storage Backend" cmd /k "cd storage && npm start"

echo [3/4] Starting Chatbot Iframe Server (Port 8081)...
start "Chatbot Shell" cmd /k "cd chatbot && npx -y serve -l 8081"

echo [4/4] Starting Central Website Frontend (Port 5173)...
start "Main Website" cmd /k "cd website && npm run dev"

echo.
echo All services are launching in separate windows!
echo Once they load, you can access the full website at:
echo ==============================================
echo         http://localhost:5173
echo ==============================================
timeout 5
