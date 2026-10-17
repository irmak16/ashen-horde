#!/bin/bash
# Oyunu uygulama olarak başlatır; sunucu Terminal'den bağımsız çalışır, bu pencere hemen kapanabilir.
cd "$(dirname "$0")"
open "./Ashen Horde.app" || { echo "Uygulama açılamadı. Yukarıdaki hatayı bana ilet."; exit 1; }
sleep 1
osascript -e 'tell application "Terminal" to close (every window whose name contains "Oyna")' >/dev/null 2>&1
exit 0
