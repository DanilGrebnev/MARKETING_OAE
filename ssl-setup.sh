#!/bin/bash

# Скрипт для настройки SSL сертификатов
# Использует Let's Encrypt через certbot

DOMAIN=${1:-"your-domain.com"}
EMAIL=${2:-"admin@${DOMAIN}"}

echo "🔒 Настройка SSL сертификатов для домена: $DOMAIN"
echo "📧 Email для уведомлений: $EMAIL"

# Создаем директории
mkdir -p nginx/ssl
mkdir -p logs/nginx

# Проверяем, установлен ли certbot
if ! command -v certbot &> /dev/null; then
    echo "❌ Certbot не установлен. Устанавливаем..."
    
    # Для Ubuntu/Debian
    if command -v apt &> /dev/null; then
        sudo apt update
        sudo apt install -y certbot
    # Для CentOS/RHEL
    elif command -v yum &> /dev/null; then
        sudo yum install -y certbot
    # Для macOS
    elif command -v brew &> /dev/null; then
        brew install certbot
    else
        echo "❌ Не удалось установить certbot автоматически"
        echo "Установите certbot вручную: https://certbot.eff.org/"
        exit 1
    fi
fi

echo "🚀 Получаем SSL сертификат..."

# Останавливаем nginx если запущен
docker-compose -f docker-compose.prod.yml down nginx 2>/dev/null || true

# Получаем сертификат
sudo certbot certonly \
    --standalone \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --domains "$DOMAIN,www.$DOMAIN"

# Копируем сертификаты
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" nginx/ssl/
    sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" nginx/ssl/
    sudo chown $(whoami):$(whoami) nginx/ssl/*.pem
    
    echo "✅ SSL сертификаты успешно настроены!"
    echo "📁 Сертификаты сохранены в nginx/ssl/"
    
    # Обновляем конфигурацию
    sed -i "s/your-domain.com/$DOMAIN/g" config.env
    
    echo "🔄 Запускаем сервисы..."
    docker-compose -f docker-compose.prod.yml up -d
    
    echo "🎉 Готово! Сайт доступен по адресу: https://$DOMAIN"
else
    echo "❌ Не удалось получить SSL сертификат"
    echo "Проверьте:"
    echo "1. Домен $DOMAIN указывает на этот сервер"
    echo "2. Порты 80 и 443 открыты"
    echo "3. Нет других сервисов на портах 80/443"
fi
