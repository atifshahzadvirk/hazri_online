@echo off
echo Starte Backend...
start cmd /k "cd /d C:\hazri_online\backend && node server.js"

echo Starte Frontend...
start cmd /k "cd /d C:\hazri_online\frontend && npm start"

pause
