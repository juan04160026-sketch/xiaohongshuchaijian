@echo off
chcp 65001 >nul
echo ========================================
echo   小红书自动发布
echo ========================================
echo.
cd /d "E:\小红书项目\飞书插件"
node publish-from-feishu.js
echo.
echo 按任意键关闭...
pause >nul
