# 🐳 Docker Deployment - File Server

Полная настройка для развертывания файлового сервера с nginx и SSL в Docker.

## 📁 Структура проекта

```
MARKETING_OAE/
├── Dockerfile                 # Docker образ для FastAPI
├── docker-compose.yml         # Разработка
├── docker-compose.prod.yml    # Продакшн с SSL
├── docker.env                 # Переменные окружения
├── nginx/
│   ├── nginx.conf            # Основная конфигурация nginx
│   ├── conf.d/
│   │   └── default.conf      # Конфигурация сайта
│   └── ssl/                  # SSL сертификаты (создается автоматически)
├── logs/nginx/               # Логи nginx
└── main.py                   # FastAPI приложение
```

## 🚀 Быстрый запуск

### 1. Настройка домена

Отредактируйте файл `docker.env`:
```bash
DOMAIN=your-domain.com
```

### 2. Запуск для разработки (без SSL)

```bash
docker-compose up -d
```

Доступ: http://localhost

### 3. Запуск для продакшна (с SSL)

```bash
# Сначала получаем SSL сертификат
docker-compose -f docker-compose.prod.yml run --rm certbot

# Запускаем все сервисы
docker-compose -f docker-compose.prod.yml up -d
```

Доступ: https://your-domain.com

## 🔧 Настройка SSL сертификатов

### Автоматическое получение Let's Encrypt

```bash
# 1. Замените your-domain.com на ваш домен в docker.env
# 2. Убедитесь что домен указывает на ваш сервер
# 3. Получите сертификат:
docker-compose -f docker-compose.prod.yml run --rm certbot

# 4. Запустите продакшн:
docker-compose -f docker-compose.prod.yml up -d
```

### Обновление сертификатов

```bash
# Автоматическое обновление (добавьте в cron):
docker-compose -f docker-compose.prod.yml run --rm certbot renew
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### Ручная установка сертификатов

Если у вас есть готовые сертификаты, поместите их в `nginx/ssl/`:
- `fullchain.pem` - полная цепочка сертификатов
- `privkey.pem` - приватный ключ

## 📊 Мониторинг и логи

### Просмотр логов

```bash
# Все логи
docker-compose logs -f

# Только nginx
docker-compose logs -f nginx

# Только FastAPI
docker-compose logs -f app
```

### Статус сервисов

```bash
# Проверка статуса
docker-compose ps

# Проверка здоровья
docker-compose exec nginx nginx -t
docker-compose exec app curl -f http://localhost:8000/api/files
```

## 🔒 Безопасность

### Настроенные заголовки безопасности:
- ✅ HSTS (Strict-Transport-Security)
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ X-XSS-Protection
- ✅ Referrer-Policy

### SSL настройки:
- ✅ TLS 1.2 и 1.3
- ✅ Современные шифры
- ✅ Perfect Forward Secrecy

### Дополнительная защита:
- ✅ Скрытие версии nginx
- ✅ Лимиты на размер запросов
- ✅ Таймауты соединений

## 🌐 Настройка домена

### DNS записи

Добавьте A-записи для вашего домена:
```
A    your-domain.com      -> IP_ВАШЕГО_СЕРВЕРА
A    www.your-domain.com  -> IP_ВАШЕГО_СЕРВЕРА
```

### Firewall

Откройте порты на сервере:
```bash
# Ubuntu/Debian
sudo ufw allow 80
sudo ufw allow 443

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

## 🔄 Обновление приложения

```bash
# Пересобрать и перезапустить
docker-compose build --no-cache
docker-compose up -d

# Или для продакшна
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

## 🛠 Полезные команды

```bash
# Остановить все
docker-compose down

# Остановить и удалить volumes
docker-compose down -v

# Просмотр конфигурации nginx
docker-compose exec nginx cat /etc/nginx/nginx.conf

# Перезагрузка nginx без остановки
docker-compose exec nginx nginx -s reload

# Вход в контейнер
docker-compose exec app bash
docker-compose exec nginx sh
```

## 📈 Производительность

### Оптимизации nginx:
- ✅ Gzip сжатие
- ✅ Кеширование статических файлов
- ✅ Keep-alive соединения
- ✅ Буферизация proxy

### Мониторинг ресурсов:
```bash
# Использование ресурсов
docker stats

# Размер образов
docker images
```

## 🆘 Troubleshooting

### Проблемы с SSL:
```bash
# Проверка сертификата
openssl x509 -in nginx/ssl/fullchain.pem -text -noout

# Тест SSL соединения
openssl s_client -connect your-domain.com:443
```

### Проблемы с nginx:
```bash
# Проверка конфигурации
docker-compose exec nginx nginx -t

# Перезапуск nginx
docker-compose restart nginx
```

### Проблемы с FastAPI:
```bash
# Проверка API
curl -f http://localhost:8000/api/files

# Логи приложения
docker-compose logs app
```

## 📞 Поддержка

Файловый сервер готов к продакшн использованию с:
- 🔒 SSL/TLS шифрованием
- 🚀 Высокой производительностью
- 📊 Мониторингом и логированием
- 🛡️ Настроенной безопасностью
