param(
    [int]$InitialNonVideoPid = 0,
    [int]$MaxDays = 5
)

$ErrorActionPreference = 'Stop'

$source = 'C:\Users\25902\OneDrive\佑的文件\文档\文件（学习）整理'
$destination = 'D:\文件（学习）整理'
$logDir = 'D:\onedrive_copy_logs'
$deadline = (Get-Date).AddDays($MaxDays)

$videoMasks = @(
    '*.mp4', '*.mov', '*.mkv', '*.avi', '*.wmv', '*.m4v', '*.webm',
    '*.flv', '*.mpg', '*.mpeg', '*.3gp', '*.ts', '*.mts', '*.m2ts'
)

New-Item -ItemType Directory -Force -Path $destination | Out-Null
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Write-Status {
    param([string]$Message)
    $line = '{0:u} {1}' -f (Get-Date), $Message
    Add-Content -LiteralPath (Join-Path $logDir 'sequence_status.log') -Value $line
}

function Invoke-CopyOnlyRobocopy {
    param(
        [string]$Name,
        [string[]]$FileMasks = @('*.*'),
        [string[]]$ExcludeMasks = @()
    )

    $timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $logPath = Join-Path $logDir "$Name`_$timestamp.log"

    $args = @($source, $destination) + $FileMasks + @(
        '/E',
        '/COPY:DAT',
        '/DCOPY:DAT',
        '/R:5',
        '/W:30',
        '/MT:16',
        '/XJ',
        '/NP',
        "/LOG:$logPath"
    )

    if ($ExcludeMasks.Count -gt 0) {
        $args += @('/XF') + $ExcludeMasks
    }

    Write-Status "Starting $Name. Log: $logPath"
    & robocopy.exe @args
    $code = $LASTEXITCODE
    Write-Status "Finished $Name with robocopy exit code $code."
    return $code
}

if ($InitialNonVideoPid -gt 0) {
    $existing = Get-Process -Id $InitialNonVideoPid -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Status "Waiting for existing non-video robocopy PID $InitialNonVideoPid."
        Wait-Process -Id $InitialNonVideoPid -ErrorAction SilentlyContinue
        Write-Status "Existing non-video robocopy PID $InitialNonVideoPid ended."
    }
}

while ((Get-Date) -lt $deadline) {
    $nonVideoCode = Invoke-CopyOnlyRobocopy -Name 'nonvideo_copyonly' -ExcludeMasks $videoMasks
    $videoCode = Invoke-CopyOnlyRobocopy -Name 'video_copyonly' -FileMasks $videoMasks

    if (($nonVideoCode -lt 8) -and ($videoCode -lt 8)) {
        Write-Status 'Copy sequence completed without robocopy failure codes.'
        exit 0
    }

    Write-Status 'One or more robocopy passes reported failures. Sleeping 10 minutes before retry.'
    Start-Sleep -Seconds 600
}

Write-Status "Stopped after reaching ${MaxDays}-day retry window."
exit 1
