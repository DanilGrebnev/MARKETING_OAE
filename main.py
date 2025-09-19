from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
import os
from pathlib import Path
import mimetypes
from typing import List

app = FastAPI(
    title="File Server",
    description="Микросервис для раздачи файлов из корневого каталога",
    version="1.0.0"
)

# Получаем путь к корневому каталогу проекта
ROOT_DIR = Path(__file__).parent

def get_files_list() -> List[dict]:
    """Получить список всех файлов в корневом каталоге"""
    files = []
    
    for item in ROOT_DIR.iterdir():
        if item.is_file() and item.name != "main.py":  # Исключаем сам сервер
            file_info = {
                "name": item.name,
                "size": item.stat().st_size,
                "type": mimetypes.guess_type(item.name)[0] or "application/octet-stream",
                "path": f"/files/{item.name}"
            }
            files.append(file_info)
    
    return sorted(files, key=lambda x: x["name"])

@app.get("/", response_class=HTMLResponse)
async def root():
    """Главная страница со списком файлов"""
    files = get_files_list()
    
    html_content = """
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>File Server - Список файлов</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
            }
            
            .container {
                max-width: 1000px;
                margin: 0 auto;
                background: rgba(255, 255, 255, 0.95);
                border-radius: 15px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            
            .header {
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            
            .header h1 {
                font-size: 2.5em;
                margin-bottom: 10px;
                font-weight: 300;
            }
            
            .header p {
                font-size: 1.1em;
                opacity: 0.9;
            }
            
            .stats {
                background: #f8f9fa;
                padding: 20px 30px;
                border-bottom: 1px solid #e9ecef;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .stats-item {
                text-align: center;
            }
            
            .stats-number {
                font-size: 2em;
                font-weight: bold;
                color: #4facfe;
            }
            
            .stats-label {
                color: #6c757d;
                font-size: 0.9em;
            }
            
            .files-grid {
                padding: 30px;
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 20px;
            }
            
            .file-card {
                background: white;
                border: 1px solid #e9ecef;
                border-radius: 10px;
                padding: 20px;
                transition: all 0.3s ease;
                cursor: pointer;
            }
            
            .file-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                border-color: #4facfe;
            }
            
            .file-icon {
                font-size: 2.5em;
                margin-bottom: 15px;
                text-align: center;
            }
            
            .file-name {
                font-weight: 600;
                margin-bottom: 8px;
                color: #2c3e50;
                word-break: break-word;
            }
            
            .file-info {
                display: flex;
                justify-content: space-between;
                color: #6c757d;
                font-size: 0.9em;
                margin-bottom: 15px;
            }
            
            .download-btn {
                width: 100%;
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                color: white;
                border: none;
                padding: 10px 15px;
                border-radius: 5px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.3s ease;
                text-decoration: none;
                display: inline-block;
                text-align: center;
            }
            
            .download-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(79, 172, 254, 0.4);
            }
            
            .empty-state {
                text-align: center;
                padding: 60px 30px;
                color: #6c757d;
            }
            
            .empty-state-icon {
                font-size: 4em;
                margin-bottom: 20px;
                opacity: 0.5;
            }
            
            @media (max-width: 768px) {
                .files-grid {
                    grid-template-columns: 1fr;
                    padding: 20px;
                }
                
                .stats {
                    flex-direction: column;
                    gap: 20px;
                }
                
                .header h1 {
                    font-size: 2em;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📁 File Server</h1>
                <p>Микросервис для раздачи файлов из корневого каталога</p>
            </div>
            
            <div class="stats">
                <div class="stats-item">
                    <div class="stats-number">""" + str(len(files)) + """</div>
                    <div class="stats-label">Всего файлов</div>
                </div>
                <div class="stats-item">
                    <div class="stats-number">""" + str(sum(f["size"] for f in files)) + """</div>
                    <div class="stats-label">Байт</div>
                </div>
                <div class="stats-item">
                    <div class="stats-number">""" + str(len(set(f["type"].split("/")[0] for f in files))) + """</div>
                    <div class="stats-label">Типов файлов</div>
                </div>
            </div>
    """
    
    if files:
        html_content += '<div class="files-grid">'
        
        for file in files:
            # Определяем иконку по типу файла
            if file["type"].startswith("text/html"):
                icon = "🌐"
            elif file["type"].startswith("text/css"):
                icon = "🎨"
            elif file["type"].startswith("text/javascript") or file["name"].endswith(".js"):
                icon = "⚡"
            elif file["type"].startswith("text/"):
                icon = "📄"
            elif file["type"].startswith("image/"):
                icon = "🖼️"
            else:
                icon = "📄"
            
            # Форматируем размер файла
            size = file["size"]
            if size < 1024:
                size_str = f"{size} B"
            elif size < 1024 * 1024:
                size_str = f"{size / 1024:.1f} KB"
            else:
                size_str = f"{size / (1024 * 1024):.1f} MB"
            
            html_content += f"""
            <div class="file-card">
                <div class="file-icon">{icon}</div>
                <div class="file-name">{file["name"]}</div>
                <div class="file-info">
                    <span>{file["type"]}</span>
                    <span>{size_str}</span>
                </div>
                <a href="{file["path"]}" class="download-btn" download>
                    📥 Скачать
                </a>
            </div>
            """
        
        html_content += '</div>'
    else:
        html_content += """
        <div class="empty-state">
            <div class="empty-state-icon">📂</div>
            <h3>Нет доступных файлов</h3>
            <p>В корневом каталоге не найдено файлов для раздачи</p>
        </div>
        """
    
    html_content += """
        </div>
    </body>
    </html>
    """
    
    return html_content

@app.get("/files/{filename}")
async def download_file(filename: str):
    """Скачать конкретный файл"""
    file_path = ROOT_DIR / filename
    
    # Проверяем, что файл существует и находится в корневом каталоге
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    # Проверяем, что файл действительно в корневом каталоге (защита от path traversal)
    if file_path.parent != ROOT_DIR:
        raise HTTPException(status_code=403, detail="Доступ запрещен")
    
    # Исключаем сам файл сервера
    if filename == "main.py":
        raise HTTPException(status_code=403, detail="Доступ к этому файлу запрещен")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type=mimetypes.guess_type(filename)[0] or "application/octet-stream"
    )

@app.get("/api/files")
async def list_files():
    """API endpoint для получения списка файлов в JSON формате"""
    return {"files": get_files_list()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
