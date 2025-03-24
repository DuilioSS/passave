@echo off
rem Verifica se Docker è installato
where docker >nul 2>&1
if errorlevel 1 (
    echo Errore: Docker non è installato o non è presente nel PATH.
    echo Installalo da: https://docs.docker.com/get-docker/
    pause
    exit /b 1
)

rem Verifica se docker-compose o il plugin "docker compose" è disponibile
set "DOCKER_COMPOSE_CMD="
where docker-compose >nul 2>&1
if not errorlevel 1 (
    set "DOCKER_COMPOSE_CMD=docker-compose"
) else (
    docker compose version >nul 2>&1
    if not errorlevel 1 (
        set "DOCKER_COMPOSE_CMD=docker compose"
    ) else (
        echo Errore: docker-compose non è disponibile.
        echo Installalo da: https://docs.docker.com/compose/install/
        pause
        exit /b 1
    )
)

echo Utilizzo del comando Docker Compose: %DOCKER_COMPOSE_CMD%

rem Verifica se il file .env esiste
if not exist .env (
    echo Errore: il file .env è mancante.
    echo Crea un file .env con le variabili necessarie.
    pause
    exit /b 1
)

echo Costruzione e avvio dei container Docker...
%DOCKER_COMPOSE_CMD% up --build -d

echo Attendi che i servizi vengano avviati...
timeout /t 10 >nul

%DOCKER_COMPOSE_CMD% ps | findstr /C:"Up" >nul
if %errorlevel%==0 (
    echo Il sito è disponibile su: http://localhost:3000
    echo.
    echo Premi Invio per continuare...
    pause
) else (
    echo Errore: i servizi non sono partiti correttamente.
    %DOCKER_COMPOSE_CMD% logs
    pause
    exit /b 1
)
