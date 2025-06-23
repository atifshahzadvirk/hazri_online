@echo off
echo Beende Backend und Frontend...

taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM cmd.exe /FI "WINDOWTITLE eq C:\hazri_online\frontend*" >nul 2>&1

echo Alle zugehörigen Prozesse wurden beendet.
pause
