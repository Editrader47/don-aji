@echo off
echo ========================================
echo   Don Aji POS - Compilando instalador
echo ========================================

:: Verificar si se ejecuta como administrador
net session >nul 2>&1
if errorlevel 1 (
    echo.
    echo IMPORTANTE: Ejecuta este archivo como Administrador
    echo Clic derecho sobre compilar.bat - Ejecutar como administrador
    echo.
    pause
    exit
)

cd /d "%~dp0"

echo.
echo [1/3] Limpiando cache de winCodeSign...
rd /s /q "%LOCALAPPDATA%\electron-builder\Cache\winCodeSign" 2>nul
echo Cache limpiado.

echo.
echo [2/3] Compilando Don Aji POS...
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npx electron-builder --win --x64

echo.
echo [3/3] Proceso terminado.
if exist "dist\*.exe" (
    echo EXITO - Instalador creado en carpeta dist\
    explorer dist
) else (
    echo Revisa los errores arriba.
)
echo.
pause
