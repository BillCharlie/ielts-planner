param(
    [string]$StencilPath = "C:\Users\25902\Desktop\visio_stencil_copy.vssx",
    [string]$OutputDir = "E:\vscode\ielts-planner\visio-output",
    [int]$TimeoutSeconds = 60,
    [int]$StepDelayMs = 260
)

$ErrorActionPreference = "Stop"

$VsdxPath = Join-Path $OutputDir "llc_half_bridge_converter.vsdx"
$SvgPath = Join-Path $OutputDir "llc_half_bridge_converter.svg"
$LogPath = Join-Path $OutputDir "draw-llc-converter-visio.log"

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
if (Test-Path -LiteralPath $LogPath) { Remove-Item -LiteralPath $LogPath -Force }

function Write-Log {
    param([string]$Message)
    $line = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Write-Host $line
    Add-Content -LiteralPath $LogPath -Value $line
}

function Start-StepWatchdog {
    param([string]$Name)

    $safeName = ($Name -replace "[^A-Za-z0-9_-]", "_")
    $marker = Join-Path $OutputDir ("watchdog_llc_{0}.lock" -f $safeName)
    Set-Content -LiteralPath $marker -Value $Name

    $job = Start-Job -ScriptBlock {
        param($MarkerPath, $VisioPid, $StepName, $Seconds, $LogFile)
        Start-Sleep -Seconds $Seconds
        if (Test-Path -LiteralPath $MarkerPath) {
            $line = "{0}  TIMEOUT after {1}s: {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Seconds, $StepName
            Add-Content -LiteralPath $LogFile -Value $line
            if ($VisioPid -gt 0) {
                try { Stop-Process -Id $VisioPid -Force -ErrorAction Stop } catch {}
            }
            try { Remove-Item -LiteralPath $MarkerPath -Force -ErrorAction SilentlyContinue } catch {}
        }
    } -ArgumentList $marker, $script:VisioPid, $Name, $TimeoutSeconds, $LogPath

    return [pscustomobject]@{ Job = $job; Marker = $marker }
}

function Stop-StepWatchdog {
    param($Watchdog)
    if ($null -eq $Watchdog) { return }
    if (Test-Path -LiteralPath $Watchdog.Marker) {
        Remove-Item -LiteralPath $Watchdog.Marker -Force -ErrorAction SilentlyContinue
    }
    if ($Watchdog.Job.State -eq "Running") {
        Stop-Job -Job $Watchdog.Job -ErrorAction SilentlyContinue | Out-Null
    }
    Remove-Job -Job $Watchdog.Job -Force -ErrorAction SilentlyContinue | Out-Null
}

function Invoke-VisioStep {
    param([string]$Name, [scriptblock]$Action)
    Write-Log "STEP: $Name"
    $watchdog = Start-StepWatchdog -Name $Name
    try { & $Action }
    finally { Stop-StepWatchdog -Watchdog $watchdog }
}

function Pause-Drawing {
    Start-Sleep -Milliseconds $StepDelayMs
}

function Set-ShapeSize {
    param($Shape, [double]$Width, [double]$Height)
    try { $Shape.CellsU("LockWidth").FormulaU = "0" } catch {}
    try { $Shape.CellsU("LockHeight").FormulaU = "0" } catch {}
    try { $Shape.CellsU("Width").FormulaU = "$Width in" } catch {}
    try { $Shape.CellsU("Height").FormulaU = "$Height in" } catch {}
}

function Set-ShapeAngle {
    param($Shape, [string]$AngleFormula)
    try { $Shape.CellsU("Angle").FormulaU = $AngleFormula } catch {}
}

function Set-LineStyle {
    param(
        $Shape,
        [string]$Color = "RGB(35,35,35)",
        [string]$Weight = "1.35 pt",
        [int]$EndArrow = 0
    )
    try { $Shape.CellsU("LineColor").FormulaU = $Color } catch {}
    try { $Shape.CellsU("LineWeight").FormulaU = $Weight } catch {}
    try { $Shape.CellsU("BeginArrow").FormulaU = "0" } catch {}
    try { $Shape.CellsU("EndArrow").FormulaU = "$EndArrow" } catch {}
}

function Add-Wire {
    param([double]$X1, [double]$Y1, [double]$X2, [double]$Y2)
    $line = $script:Page.DrawLine($X1, $Y1, $X2, $Y2)
    Set-LineStyle -Shape $line
    Pause-Drawing
    return $line
}

function Add-Arrow {
    param([double]$X1, [double]$Y1, [double]$X2, [double]$Y2)
    $line = $script:Page.DrawLine($X1, $Y1, $X2, $Y2)
    Set-LineStyle -Shape $line -Color "RGB(220,35,35)" -Weight "1.7 pt" -EndArrow 4
    Pause-Drawing
    return $line
}

function Add-Text {
    param(
        [string]$Text,
        [double]$X,
        [double]$Y,
        [double]$W = 0.9,
        [double]$H = 0.3,
        [int]$Size = 9,
        [string]$Color = "RGB(30,30,30)"
    )
    $s = $script:Page.DrawRectangle($X - ($W / 2), $Y - ($H / 2), $X + ($W / 2), $Y + ($H / 2))
    $s.Text = $Text
    try { $s.CellsU("LinePattern").FormulaU = "0" } catch {}
    try { $s.CellsU("FillPattern").FormulaU = "0" } catch {}
    try { $s.CellsU("Char.Size").FormulaU = "$Size pt" } catch {}
    try { $s.CellsU("Char.Color").FormulaU = $Color } catch {}
    try { $s.CellsU("Para.HorzAlign").FormulaU = "1" } catch {}
    Pause-Drawing
    return $s
}

function Add-Dot {
    param([double]$X, [double]$Y, [double]$R = 0.045)
    $dot = $script:Page.DrawOval($X - $R, $Y - $R, $X + $R, $Y + $R)
    try { $dot.CellsU("FillForegnd").FormulaU = "RGB(20,20,20)" } catch {}
    try { $dot.CellsU("LinePattern").FormulaU = "0" } catch {}
    Pause-Drawing
    return $dot
}

function Get-Master {
    param([string[]]$Names)
    foreach ($name in $Names) {
        foreach ($master in $script:Stencil.Masters) {
            if ($master.NameU -ieq $name -or $master.Name -ieq $name) {
                return $master
            }
        }
    }
    throw "None of these masters were found in stencil: $($Names -join ', ')"
}

function Drop-Part {
    param(
        [string[]]$MasterNames,
        [double]$X,
        [double]$Y,
        [double]$W,
        [double]$H,
        [string]$Name,
        [string]$Angle = $null
    )
    $master = Get-Master -Names $MasterNames
    $shape = $script:Page.Drop($master, $X, $Y)
    $shape.Name = $Name
    Set-ShapeSize -Shape $shape -Width $W -Height $H
    if ($Angle) { Set-ShapeAngle -Shape $shape -AngleFormula $Angle }
    Pause-Drawing
    return $shape
}

function Find-NewVisioPid {
    param([int[]]$BeforeIds)
    Start-Sleep -Milliseconds 800
    $after = @(Get-Process -Name VISIO -ErrorAction SilentlyContinue)
    $new = @($after | Where-Object { $BeforeIds -notcontains $_.Id } | Sort-Object StartTime -Descending | Select-Object -First 1)
    if ($new.Count -gt 0) { return [int]$new[0].Id }
    $latest = @($after | Sort-Object StartTime -Descending | Select-Object -First 1)
    if ($latest.Count -gt 0) { return [int]$latest[0].Id }
    return 0
}

if (-not (Test-Path -LiteralPath $StencilPath)) {
    throw "Stencil not found: $StencilPath"
}

$script:VisioPid = 0
$script:App = $null
$script:Doc = $null
$script:Stencil = $null
$script:Page = $null

try {
    $beforeVisioIds = @(Get-Process -Name VISIO -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })

    Write-Log "Starting Microsoft Visio with visible window."
    $script:App = New-Object -ComObject Visio.Application
    $script:App.Visible = $true
    $script:App.AlertResponse = 1
    $script:VisioPid = Find-NewVisioPid -BeforeIds $beforeVisioIds
    Write-Log "Visio PID detected: $script:VisioPid"

    Invoke-VisioStep "Open custom electrical stencil" {
        $script:Stencil = $script:App.Documents.OpenEx($StencilPath, 2 + 64 + 128)
    }

    Invoke-VisioStep "Create drawing page" {
        $script:Doc = $script:App.Documents.Add("")
        $script:Page = $script:App.ActivePage
        $script:Page.Name = "LLC half bridge converter"
        $script:Page.PageSheet.CellsU("PageWidth").FormulaU = "11.5 in"
        $script:Page.PageSheet.CellsU("PageHeight").FormulaU = "6.4 in"
        try { $script:App.ActiveWindow.Zoom = 0.92 } catch {}
    }

    Invoke-VisioStep "Draw input source and rails" {
        Add-Wire 0.90 5.55 2.55 5.55 | Out-Null
        Add-Wire 0.90 1.05 2.55 1.05 | Out-Null
        Add-Wire 0.90 5.55 0.90 4.20 | Out-Null
        Add-Wire 0.90 2.20 0.90 1.05 | Out-Null
        Drop-Part @("DC-V", "V-R") 0.90 3.20 0.60 1.05 "Vin_source" | Out-Null
        Add-Text "V_in" 0.35 3.25 0.62 0.30 11 | Out-Null
    }

    Invoke-VisioStep "Draw S1 and S2 half bridge" {
        Drop-Part @("Nmos3.d", "Nmos4", "Nmos3.a") 2.55 4.55 0.72 0.92 "S1_switch" | Out-Null
        Drop-Part @("Diode1", "Diode2") 2.92 4.55 0.48 0.28 "S1_body_diode" "90 deg" | Out-Null
        Add-Wire 2.55 5.55 2.55 5.08 | Out-Null
        Add-Wire 2.55 4.05 2.55 3.30 | Out-Null
        Add-Wire 2.18 4.35 1.88 4.35 | Out-Null
        Add-Text "S1" 1.62 4.60 0.50 0.34 12 | Out-Null

        Drop-Part @("Nmos3.d", "Nmos4", "Nmos3.a") 2.55 2.10 0.72 0.92 "S2_switch" | Out-Null
        Drop-Part @("Diode1", "Diode2") 2.92 2.10 0.48 0.28 "S2_body_diode" "90 deg" | Out-Null
        Add-Wire 2.55 3.30 2.55 2.62 | Out-Null
        Add-Wire 2.55 1.60 2.55 1.05 | Out-Null
        Add-Wire 2.18 1.90 1.88 1.90 | Out-Null
        Add-Text "S2" 1.62 2.12 0.50 0.34 12 | Out-Null
    }

    Invoke-VisioStep "Draw resonant tank Cr Lr Lm" {
        Add-Wire 2.55 3.30 3.15 3.30 | Out-Null
        Drop-Part @("C") 3.55 3.30 0.55 0.50 "Cr_capacitor" | Out-Null
        Add-Wire 3.88 3.30 4.18 3.30 | Out-Null
        Drop-Part @("L") 4.72 3.30 0.95 0.48 "Lr_inductor" | Out-Null
        Add-Wire 5.30 3.30 5.78 3.30 | Out-Null

        Drop-Part @("L") 5.55 2.18 1.55 0.42 "Lm_inductor" "90 deg" | Out-Null
        Add-Wire 5.55 3.30 5.55 2.93 | Out-Null
        Add-Wire 5.55 1.42 5.55 1.05 | Out-Null

        Add-Text "C_r" 3.55 3.78 0.50 0.28 11 | Out-Null
        Add-Text "L_r" 4.72 3.78 0.50 0.28 11 | Out-Null
        Add-Text "L_m" 5.02 2.14 0.55 0.28 10 | Out-Null
        Add-Arrow 4.42 3.05 5.08 3.05 | Out-Null
        Add-Text "i_Lr" 4.74 2.77 0.60 0.25 9 "RGB(220,35,35)" | Out-Null
    }

    Invoke-VisioStep "Draw transformer T1" {
        Drop-Part @("L") 6.05 2.18 1.85 0.42 "T1_primary_winding" "90 deg" | Out-Null
        Add-Wire 5.78 3.30 6.05 3.30 | Out-Null
        Add-Wire 6.05 1.05 6.05 1.25 | Out-Null
        Add-Wire 5.55 1.05 6.05 1.05 | Out-Null
        Add-Dot 5.84 2.98 | Out-Null

        Add-Wire 6.38 5.10 6.38 1.18 | Out-Null
        Add-Wire 6.49 5.10 6.49 1.18 | Out-Null
        Add-Text "T1" 6.30 4.92 0.45 0.28 11 | Out-Null

        Drop-Part @("L") 6.88 4.25 1.22 0.38 "T1_secondary_top" "90 deg" | Out-Null
        Drop-Part @("L") 6.88 2.00 1.22 0.38 "T1_secondary_bottom" "90 deg" | Out-Null
        Add-Dot 6.65 4.70 | Out-Null
        Add-Dot 6.65 2.45 | Out-Null
        Add-Wire 6.88 3.64 6.88 3.05 | Out-Null
        Add-Wire 6.88 2.61 6.88 3.05 | Out-Null
        Add-Wire 6.88 3.05 8.10 3.05 | Out-Null
    }

    Invoke-VisioStep "Draw D1 D2 rectifier" {
        Add-Wire 6.88 4.86 7.35 4.86 | Out-Null
        Drop-Part @("Diode1", "Diode2") 7.75 4.86 0.55 0.36 "D1_rectifier" | Out-Null
        Add-Wire 8.15 4.86 10.55 4.86 | Out-Null
        Add-Text "D1" 7.70 5.28 0.50 0.28 11 | Out-Null

        Add-Wire 6.88 1.39 7.35 1.39 | Out-Null
        Drop-Part @("Diode1", "Diode2") 7.75 1.39 0.55 0.36 "D2_rectifier" | Out-Null
        Add-Wire 8.15 1.39 8.15 4.86 | Out-Null
        Add-Text "D2" 7.75 0.96 0.50 0.28 11 | Out-Null
    }

    Invoke-VisioStep "Draw output filter and load" {
        Add-Wire 8.10 3.05 10.55 3.05 | Out-Null
        Drop-Part @("C") 9.15 3.95 1.10 0.48 "Co_output_capacitor" "90 deg" | Out-Null
        Add-Wire 9.15 4.86 9.15 4.50 | Out-Null
        Add-Wire 9.15 3.40 9.15 3.05 | Out-Null
        Add-Text "C_o" 8.70 3.92 0.55 0.28 12 | Out-Null

        Drop-Part @("R") 10.20 3.95 1.20 0.45 "R_load" "90 deg" | Out-Null
        Add-Wire 10.20 4.86 10.20 4.58 | Out-Null
        Add-Wire 10.20 3.32 10.20 3.05 | Out-Null
        Add-Text "R" 10.72 3.95 0.38 0.28 12 | Out-Null
    }

    Invoke-VisioStep "Annotate and fit view" {
        Add-Text "Half-bridge LLC resonant converter" 5.75 6.05 3.40 0.34 13 | Out-Null
        Add-Text "Direct wire joints; labels are offset from symbols." 5.75 0.50 3.15 0.25 8 | Out-Null
        try { $script:App.ActiveWindow.ViewFit = 1 } catch {}
        Pause-Drawing
    }

    Invoke-VisioStep "Save VSDX" {
        if (Test-Path -LiteralPath $VsdxPath) { Remove-Item -LiteralPath $VsdxPath -Force }
        $script:Doc.SaveAs($VsdxPath)
    }

    Invoke-VisioStep "Export SVG preview" {
        if (Test-Path -LiteralPath $SvgPath) { Remove-Item -LiteralPath $SvgPath -Force }
        $script:Page.Export($SvgPath)
    }

    Write-Log "DONE: Saved $VsdxPath"
    Write-Log "DONE: Exported $SvgPath"
}
catch {
    Write-Log ("ERROR: " + $_.Exception.Message)
    throw
}
finally {
    if ($script:Doc) {
        try { $script:Doc.Saved = $true } catch {}
    }
    if ($script:Stencil) {
        try { $script:Stencil.Close() | Out-Null } catch {}
    }
    Write-Log "Script finished. Visio is left open for inspection."
}
