# 🚀 Инструкция по развертыванию File Server

## Быстрое развертывание

### 1. Подготовка сервера

```bash
# Обновление системы (Ubuntu/Debian)
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Перезагрузка для применения изменений
sudo reboot
```

### 2. Клонирование проекта

```bash
git clone <your-repo-url>
cd MARKETING_OAE
```

### 3. Настройка домена

```bash
# Копируем конфигурацию
cp config.env .env

# Редактируем домен
nano .env
# Измените: DOMAIN=your-domain.com
```

### 4. Настройка DNS

Убедитесь, что ваш домен указывает на IP сервера:
```bash
# A запись
your-domain.com    →    YOUR_SERVER_IP
www.your-domain.com →   YOUR_SERVER_IP
```

### 5. Запуск с SSL

```bash
# Автоматическая настройка SSL
chmod +x ssl-setup.sh
./ssl-setup.sh your-domain.com admin@your-domain.com

# Или ручной запуск
docker-compose -f docker-compose.prod.yml up -d
```

## Варианты развертывания

### 🔧 Разработка (localhost)

```bash
# HTTP доступ без SSL
docker-compose -f docker-compose.dev.yml up -d

# Доступ:
# - http://localhost (через Nginx)
# - http://localhost:8000 (прямо к FastAPI)
```

### 🌐 Продакшн без SSL

```bash
# Если SSL не нужен или настраивается отдельно
docker-compose -f docker-compose.prod.yml up -d

# Доступ: http://your-domain.com
```

### 🔐 Продакшн с SSL

```bash
# Полная настройка с HTTPS
./ssl-setup.sh your-domain.com admin@your-domain.com

# Доступ: https://your-domain.com
```

## Настройка SSL вручную

### Let's Encrypt (Certbot)

```bash
# Установка certbot
sudo apt install certbot

# Остановка nginx
docker-compose down nginx

# Получение сертификата
sudo certbot certonly --standalone \
  --email admin@your-domain.com \
  --agree-tos \
  --domains your-domain.com,www.your-domain.com

# Копирование сертификатов
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/
sudo chown $USER:$USER nginx/ssl/*.pem

# Запуск с SSL
docker-compose -f docker-compose.prod.yml up -d
```

### CloudFlare SSL

```bash
# 1. В панели CloudFlare включите "Full (strict)" SSL
# 2. Создайте Origin Certificate
# 3. Сохраните сертификат как nginx/ssl/fullchain.pem
# 4. Сохраните ключ как nginx/ssl/privkey.pem
# 5. Запустите контейнеры
docker-compose -f docker-compose.prod.yml up -d
```

## Мониторинг и обслуживание

### Проверка статуса

```bash
# Статус контейнеров
docker-compose ps

# Логи
docker-compose logs -f nginx
docker-compose logs -f app

# Использование ресурсов
docker stats
```

### Health checks

```bash
# Проверка Nginx
curl -f http://localhost/health

# Проверка FastAPI
curl -f http://localhost:8000/api/files

# Проверка SSL
curl -I https://your-domain.com
```

### Обновление

```bash
# Остановка сервисов
docker-compose down

# Обновление кода
git pull

# Пересборка и запуск
docker-compose up --build -d
```

### Резервное копирование

```bash
# Создание бэкапа конфигурации
tar -czf backup-$(date +%Y%m%d).tar.gz \
  nginx/ \
  config.env \
  docker-compose*.yml \
  main.py \
  requirements.txt

# Восстановление
tar -xzf backup-YYYYMMDD.tar.gz
```

## Автоматическое обновление SSL

### Cron задача для Let's Encrypt

```bash
# Добавление в crontab
crontab -e

# Добавить строку (обновление каждые 2 месяца)
0 3 1 */2 * /path/to/project/ssl-setup.sh your-domain.com admin@your-domain.com
```

## Firewall настройки

### UFW (Ubuntu)

```bash
# Разрешить HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Разрешить SSH (если нужно)
sudo ufw allow 22/tcp

# Включить firewall
sudo ufw enable
```

### iptables

```bash
# Разрешить HTTP/HTTPS
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Сохранить правила
sudo iptables-save > /etc/iptables/rules.v4
```

## Производительность

### Nginx оптимизация

Файл `nginx/nginx.conf` уже содержит оптимизации:
- Gzip сжатие
- Кеширование статики
- Keep-alive соединения
- Буферизация

### Docker оптимизация

```bash
# Ограничение ресурсов в docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
```

## Troubleshooting

### Проблемы с SSL

```bash
# Проверка сертификатов
openssl x509 -in nginx/ssl/fullchain.pem -text -noout

# Проверка ключа
openssl rsa -in nginx/ssl/privkey.pem -check

# Тест SSL соединения
openssl s_client -connect your-domain.com:443
```

### Проблемы с Docker

```bash
# Очистка Docker
docker system prune -a

# Пересборка без кеша
docker-compose build --no-cache

# Проверка логов
docker-compose logs --tail=100 app
```

### Проблемы с доменом

```bash
# Проверка DNS
nslookup your-domain.com
dig your-domain.com

# Проверка доступности портов
telnet your-domain.com 80
telnet your-domain.com 443
```

## Контакты

При возникновении проблем:
1. Проверьте логи: `docker-compose logs`
2. Убедитесь в правильности DNS настроек
3. Проверьте firewall правила
4. Обратитесь к документации Docker и Nginx
