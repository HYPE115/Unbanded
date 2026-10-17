$files = @(
  'src/core/storage.js',
  'src/core/adapter.js',
  'src/core/plugin-manager.js',
  'src/core/plugin-manager-builtin.js',
  'src/core/themes.js',
  'src/core/styles.js',
  'src/core/commands.js',
  'src/core/ui.js',
  'src/core/ui-panel.js',
  'src/core/ui-settings.js',
  'src/core/ui-hooks.js',
  'src/petpet-hand.js',
  'src/vendor/gifenc.js',
  'src/petpet-gif.js',
  'src/plugins/pet-pet.js',
  'src/main.js'
)

$env:ROOT = $PSScriptRoot
foreach ($f in $files) {
  $path = Join-Path $env:ROOT $f
  node --check $path
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Syntax error in $f"
    exit 1
  }
  Write-Host "$f OK"
}
Write-Host 'All source files OK' -ForegroundColor Green