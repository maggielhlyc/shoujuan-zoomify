@echo off
chcp 65001 >nul
echo 正在启动私人美术馆全自动切片引擎...
echo ========================================

for %%i in (*.tif *.tiff *.psb *.jpg) do (
    echo [正在处理] %%i ...
    vips dzsave "%%i" "%%~ni" --layout zoomify
    echo [处理完成] %%i
    echo ----------------------------------------
)

echo ========================================
echo 所有画作均已切割完毕！
pause