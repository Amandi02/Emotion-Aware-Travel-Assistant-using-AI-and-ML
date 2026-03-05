@echo off
REM Start the emotion detection backend (Windows)
REM Make sure you're in the backend folder and venv is activated, or run: venv\Scripts\activate && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
