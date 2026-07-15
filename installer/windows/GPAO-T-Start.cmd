@echo off
setlocal
set "GPAO_T_PACKAGE_ROOT=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%GPAO_T_PACKAGE_ROOT%installer\windows\GPAO-T-Windows.ps1" -Mode Start %*
exit /b %ERRORLEVEL%
