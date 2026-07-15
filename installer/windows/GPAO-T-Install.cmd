@echo off
setlocal
set "GPAO_T_PACKAGE_ROOT=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%GPAO_T_PACKAGE_ROOT%installer\windows\GPAO-T-Windows.ps1" -Mode Install %*
set "GPAO_T_EXIT=%ERRORLEVEL%"
if not "%GPAO_T_EXIT%"=="0" (
  echo.
  echo GPAO-T installation did not complete.
  echo Press any key to close this window.
  pause >nul
)
exit /b %GPAO_T_EXIT%
