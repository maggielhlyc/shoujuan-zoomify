@echo off
echo 正在启动私人美术馆本地服务器...
echo 提示：首次运行可能会下载必要的运行库，请稍候片刻。
echo.
npx --yes http-server -p 8888 -c-1 -o
pause