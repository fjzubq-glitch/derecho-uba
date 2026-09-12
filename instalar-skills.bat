@echo off
echo ========================================
echo  Instalador de Skills de Diseno Web
echo  para OpenCode
echo ========================================
echo.

:: 1. Clonar o actualizar el repo
echo [1/3] Clonando repositorio...
if exist "derecho-uba" (
    echo  Repo ya existe, actualizando...
    cd derecho-uba
    git pull origin main
    cd ..
) else (
    git clone https://github.com/fjzubq-glitch/derecho-uba.git
)

if %errorlevel% neq 0 (
    echo  ERROR: No se pudo clonar el repo. Verifica tu conexion.
    pause
    exit /b 1
)

echo  Listo.
echo.

:: 2. Crear carpetas destino si no existen
echo [2/3] Copiando skills...
if not exist "%USERPROFILE%\.config\opencode\skills\web-design" (
    mkdir "%USERPROFILE%\.config\opencode\skills\web-design"
)
if not exist "%USERPROFILE%\.config\opencode\skills\ui-components" (
    mkdir "%USERPROFILE%\.config\opencode\skills\ui-components"
)

:: 3. Copiar archivos
copy /Y "derecho-uba\.agents\skills\web-design\SKILL.md" "%USERPROFILE%\.config\opencode\skills\web-design\SKILL.md"
copy /Y "derecho-uba\.agents\skills\ui-components\SKILL.md" "%USERPROFILE%\.config\opencode\skills\ui-components\SKILL.md"

if %errorlevel% neq 0 (
    echo  ERROR: No se pudieron copiar los archivos.
    pause
    exit /b 1
)

echo  Skills copiadas correctamente.
echo.

:: 4. Limpiar (opcional - dejar repo para uso futuro)
echo [3/3] Limpieza...
echo  El repositorio se conserva por si lo necesitas despues.
echo.

echo ========================================
echo  INSTALACION COMPLETA
echo ========================================
echo.
echo  Skills instaladas en:
echo    %USERPROFILE%\.config\opencode\skills\
echo.
echo  Reinicia OpenCode para que las detecte.
echo.
pause
