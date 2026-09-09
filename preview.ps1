# Локальный просмотр сайта без Node.js.
# Запуск: правой кнопкой -> "Выполнить с помощью PowerShell", либо в терминале:
#   powershell -ExecutionPolicy Bypass -File .\preview.ps1
# Затем откройте http://localhost:8080
# Заявки с формы в этом режиме печатаются в окно консоли (боевой приём заявок — в папке server, см. README).

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8080
$prefix = "http://localhost:$port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Сайт iAuto.kz запущен: $prefix" -ForegroundColor Green
Write-Host "Для остановки закройте это окно или нажмите Ctrl+C"
$mime = @{ '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.js'='application/javascript; charset=utf-8'; '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.svg'='image/svg+xml'; '.json'='application/json'; '.ico'='image/x-icon'; '.webp'='image/webp'; '.md'='text/plain; charset=utf-8' }
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request; $res = $ctx.Response
  try {
    $path = [Uri]::UnescapeDataString($req.Url.AbsolutePath)
    if ($path -eq '/') { $path = '/index.html' }
    if ($req.HttpMethod -eq 'POST' -and $path -eq '/api/lead') {
      $sr = New-Object IO.StreamReader($req.InputStream, [Text.Encoding]::UTF8); $body = $sr.ReadToEnd()
      Write-Host ("[{0}] Заявка: {1}" -f (Get-Date -Format 'HH:mm:ss'), $body) -ForegroundColor Cyan
      $buf = [Text.Encoding]::UTF8.GetBytes('{"ok":true,"id":"preview"}')
      $res.ContentType = 'application/json'; $res.OutputStream.Write($buf, 0, $buf.Length)
    } else {
      $file = Join-Path $root ($path.TrimStart('/') -replace '/', '\')
      if ((Test-Path $file -PathType Leaf) -and ([IO.Path]::GetFullPath($file)).StartsWith($root)) {
        $bytes = [IO.File]::ReadAllBytes($file)
        $ext = [IO.Path]::GetExtension($file).ToLower()
        $res.ContentType = if ($mime[$ext]) { $mime[$ext] } else { 'application/octet-stream' }
        $res.Headers.Add('Cache-Control', 'no-cache')
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      } else {
        $res.StatusCode = 404; $buf = [Text.Encoding]::UTF8.GetBytes('404 Not Found'); $res.OutputStream.Write($buf, 0, $buf.Length)
      }
    }
  } catch { $res.StatusCode = 500 }
  $res.Close()
}
