$filePath = 'c:\Users\DAH\Downloads\cement-delivery-scheduler\frontend\src\components\OrdersPage.jsx'
$content = Get-Content -Path $filePath -Raw

# Update FormControl components with className
$content = $content -replace '(\s*<FormControl fullWidth size="small")([^>]*)>', '$1 className={styles.formField}$2>'

# Save the updated content
$content | Set-Content -Path $filePath -NoNewline
