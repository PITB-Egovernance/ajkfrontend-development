$files = Get-ChildItem -Path "src" -Recurse -Include *.jsx,*.js
foreach ($file in $files) {
    $content = Get-Content $file.FullName
    if ($content -match 'Config.productionUrl') {
        $newContent = $content -replace 'Config.productionUrl', 'Config.apiUrl'
        $newContent | Set-Content $file.FullName
        Write-Host "Updated: $($file.FullName)"
    }
}
