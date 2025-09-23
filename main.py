from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os

app = FastAPI()

# Монтируем папки если они существуют
if os.path.exists("css"):
    app.mount("/css", StaticFiles(directory="css"), name="css")
if os.path.exists("js"):
    app.mount("/js", StaticFiles(directory="js"), name="js")
if os.path.exists("favicon"):
    app.mount("/favicon", StaticFiles(directory="favicon"), name="favicon")

@app.get("/")
async def read_index():
    """Отдаем index.html"""
    return FileResponse('index.html')

@app.get("/{filename}")
async def read_file(filename: str):
    """Отдаем любой файл из корневой папки"""
    # Блокируем доступ к системным файлам
    if filename.startswith('.') or filename == 'main.py':
        return {"error": "Access denied"}
    
    file_path = Path(filename)
    if file_path.exists() and file_path.is_file():
        return FileResponse(filename)
    return {"error": "File not found"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
