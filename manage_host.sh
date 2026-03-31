#!/bin/bash
PRISM_DIR="/root/prism"
JAR_PATH="$PRISM_DIR/backend.jar"
LOG_PATH="$PRISM_DIR/backend.log"
source "$PRISM_DIR/.env"

case "$1" in
    start)
        # 仅使用最基本的启动参数，不再尝试通过 JAVA_OPTS 注入验证逻辑
        nohup java -Xms256m -Xmx512m -jar "$JAR_PATH" \
              --spring.datasource.url="jdbc:mysql://localhost:3306/$DB_NAME?useUnicode=true&characterEncoding=UTF-8" \
              --spring.datasource.username="$DB_USER" \
              --spring.datasource.password="$DB_PASSWORD" \
              --spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver \
              > "$LOG_PATH" 2>&1 &
        echo "后端已启动"
        ;;
    stop)
        fuser -k 50000/tcp
        ;;
esac
