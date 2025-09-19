# File Server - Микросервис для раздачи файлов

FastAPI микросервис для раздачи всех файлов из корневого каталога проекта с поддержкой Docker и Nginx.

## Возможности

- 🌐 Красивая веб-страница со списком всех файлов
- 📥 Прямое скачивание файлов через браузер
- 🔒 Безопасность: защита от path traversal атак
- 📊 Статистика по файлам (количество, размер, типы)
- 📱 Адаптивный дизайн для мобильных устройств
- 🚀 REST API для получения списка файлов в JSON
- 🐳 Docker контейнеризация
- 🔄 Nginx reverse proxy
- 🔐 SSL/HTTPS поддержка
- 📈 Health checks и мониторинг

## Быстрый старт

### Docker (Рекомендуется)

#### Разработка (HTTP)
```bash
# Запуск для разработки
docker-compose -f docker-compose.dev.yml up -d

# Доступ: http://localhost
# FastAPI напрямую: http://localhost:8000
```

#### Продакшн (HTTPS)
```bash
# 1. Настройте домен в config.env
cp config.env .env
nano .env  # Измените DOMAIN=your-domain.com

# 2. Настройте SSL (Linux/macOS)
chmod +x ssl-setup.sh
./ssl-setup.sh your-domain.com admin@your-domain.com

# 3. Или запустите без SSL
docker-compose -f docker-compose.prod.yml up -d
```

### Локальная установка

#### 1. Установка зависимостей
```bash
pip install -r requirements.txt
```

#### 2. Запуск сервера
```bash
python main.py
```

#### 3. Открыть в браузере
Перейдите по адресу: http://localhost:8000

## API Endpoints

### Главная страница
- **GET** `/` - Веб-интерфейс со списком файлов

### Скачивание файлов
- **GET** `/files/{filename}` - Скачать конкретный файл

### API для разработчиков
- **GET** `/api/files` - Получить список файлов в JSON формате

## Пример API ответа

```json
{
  "files": [
    {
      "name": "index.html",
      "size": 12345,
      "type": "text/html",
      "path": "/files/index.html"
    },
    {
      "name": "style.css",
      "size": 6789,
      "type": "text/css", 
      "path": "/files/style.css"
    }
  ]
}
```

## Безопасность

- Файл `main.py` (сам сервер) исключен из раздачи
- Защита от path traversal атак
- Доступ только к файлам в корневом каталоге

## Docker команды

### Разработка
```bash
# Сборка и запуск
docker-compose -f docker-compose.dev.yml up --build -d

# Просмотр логов
docker-compose -f docker-compose.dev.yml logs -f

# Остановка
docker-compose -f docker-compose.dev.yml down
```

### Продакшн
```bash
# Сборка и запуск
docker-compose -f docker-compose.prod.yml up --build -d

# Просмотр логов
docker-compose -f docker-compose.prod.yml logs -f nginx
docker-compose -f docker-compose.prod.yml logs -f app

# Перезапуск nginx
docker-compose -f docker-compose.prod.yml restart nginx

# Остановка
docker-compose -f docker-compose.prod.yml down
```

## SSL сертификаты

### Автоматическая настройка (Linux/macOS)
```bash
./ssl-setup.sh your-domain.com admin@your-domain.com
```

### Ручная настройка
1. Получите SSL сертификаты (Let's Encrypt, CloudFlare, etc.)
2. Поместите файлы в `nginx/ssl/`:
   - `fullchain.pem` - полная цепочка сертификатов
   - `privkey.pem` - приватный ключ
3. Обновите домен в `config.env`
4. Перезапустите контейнеры

## Мониторинг

### Health checks
- **Nginx**: `http://your-domain.com/health`
- **FastAPI**: `http://your-domain.com/api/files`

### Логи
```bash
# Логи Nginx
docker-compose logs nginx

# Логи FastAPI
docker-compose logs app

# Все логи
docker-compose logs -f
```

## Структура проекта

```
MARKETING_OAE/
├── main.py                    # FastAPI сервер
├── Dockerfile                 # Docker образ
├── requirements.txt           # Зависимости Python
├── docker-compose.yml         # Docker Compose (основной)
├── docker-compose.dev.yml     # Docker Compose (разработка)
├── docker-compose.prod.yml    # Docker Compose (продакшн)
├── config.env                 # Конфигурация
├── ssl-setup.sh              # Скрипт настройки SSL
├── nginx/                    # Конфигурация Nginx
│   ├── nginx.conf            # Основная конфигурация
│   ├── conf.d/
│   │   ├── default.conf      # HTTPS конфигурация
│   │   └── localhost.conf    # HTTP конфигурация
│   └── ssl/                  # SSL сертификаты
├── logs/nginx/               # Логи Nginx
├── SERVER_README.md          # Документация сервера
├── index.html               # Лендинг страница
├── style.css                # Стили
├── form.js                  # JavaScript для форм
├── navigation.js            # JavaScript для навигации
├── animation.js             # JavaScript для анимаций
├── README.md                # Документация проекта
└── sample_email.txt         # Пример email
```

## Технологии

- **FastAPI** - современный веб-фреймворк для Python
- **Uvicorn** - ASGI сервер
- **Nginx** - reverse proxy и веб-сервер
- **Docker** - контейнеризация
- **Let's Encrypt** - SSL сертификаты
- **HTML/CSS/JS** - фронтенд интерфейс

## Порты

- **80** - HTTP (редирект на HTTPS в продакшене)
- **443** - HTTPS (только в продакшене)
- **8000** - FastAPI (прямой доступ в разработке)

## Автор

Микросервис создан для раздачи файлов проекта Neon Insight Lab с поддержкой Docker и Nginx.
