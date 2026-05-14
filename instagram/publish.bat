@echo off
cd /d "C:\Users\check\Desktop\Proyecto\Marketing\instagram"
echo [%date% %time%] Publicando: %1 >> publish.log
"C:\Program Files\nodejs\node.exe" post.js %1 >> publish.log 2>&1
echo [%date% %time%] Finalizado. >> publish.log
