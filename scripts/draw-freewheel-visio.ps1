param(
    [string]$StencilPath = "C:\Users\25902\Desktop\visio_stencil_copy.vssx",
    [string]$OutputDir = "E:\vscode\ielts-planner\visio-output",
    [int]$TimeoutSeconds = 60,
    [int]$StepDelayMs = 350
)

$ErrorActionPreference = "Stop"

$VsdxPath = Join-Path $OutputDir "freewheel_double_pulse_circuit.vsdx"
$SvgPath = Join-Path $OutputDir "freewheel_double_pulse_circuit.svg"
$LogPath = Join-Path $OutputDir "draw-freewheel-visio.log"

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
if (Test-Path -LiteralPath $LogPath) { Remove-Item -LiteralPath $LogPath -Force }

function Write-Log {
    param([string]$Message)
    $line = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Write-Host $line
    Add-Content -LiteralPath $LogPath -Value $line
}

function Escape-SingleQuoted {
    param([string]$Text)
    return $Text.Replace("'", "''")
}

function Start-StepWatchdog {
    param([string]$Name)

    $safeName = ($Name -replace "[^A-Za-z0-9_-]", "_")
    $marker = Join-Path $OutputDir ("watchdog_{0}.lock" -f $safeName)
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

    return [pscustomobject]@{ Job = $job; Marker = $marker; Name = $Name }
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
    param(
        [string]$Name,
        [scriptblock]$Action
    )
    Write-Log "STEP: $Name"
    $watchdog = Start-StepWatchdog -Name $Name
    try {
        & $Action
    }
    finally {
        Stop-StepWatchdog -Watchdog $watchdog
    }
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
    param($Shape, [string]$Color = "RGB(30,30,30)", [string]$Weight = "1.4 pt")
    try { $Shape.CellsU("LineColor").FormulaU = $Color } catch {}
    try { $Shape.CellsU("LineWeight").FormulaU = $Weight } catch {}
    try { $Shape.CellsU("BeginArrow").FormulaU = "0" } catch {}
    try { $Shape.CellsU("EndArrow").FormulaU = "0" } catch {}
}

function Add-Wire {
    param([double]$X1, [double]$Y1, [double]$X2, [double]$Y2)
    $line = $script:Page.DrawLine($X1, $Y1, $X2, $Y2)
    Set-LineStyle -Shape $line
    Pause-Drawing
    return $line
}

function Add-Label {
    param(
        [string]$Text,
        [double]$X,
        [double]$Y,
        [double]$W = 1.45,
        [double]$H = 0.32,
        [int]$Size = 9
    )
    $s = $script:Page.DrawRectangle($X - ($W / 2), $Y - ($H / 2), $X + ($W / 2), $Y + ($H / 2))
    $s.Text = $Text
    try { $s.CellsU("LinePattern").FormulaU = "0" } catch {}
    try { $s.CellsU("FillPattern").FormulaU = "0" } catch {}
    try { $s.CellsU("Char.Size").FormulaU = "$Size pt" } catch {}
    try { $s.CellsU("Para.HorzAlign").FormulaU = "1" } catch {}
    Pause-Drawing
    return $s
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

    Invoke-VisioStep "Open custom stencil" {
        $script:Stencil = $script:App.Documents.OpenEx($StencilPath, 2 + 64 + 128)
    }

    Invoke-VisioStep "Create blank drawing" {
        $script:Doc = $script:App.Documents.Add("")
        $script:Page = $script:App.ActivePage
        $script:Page.Name = "freewheel_double_pulse"
        $script:Page.PageSheet.CellsU("PageWidth").FormulaU = "11 in"
        $script:Page.PageSheet.CellsU("PageHeight").FormulaU = "8.5 in"
        try { $script:App.ActiveWindow.Zoom = 0.9 } catch {}
    }

    Invoke-VisioStep "Draw page title and node legend" {
        Add-Label "Low-side GaN FinFET DUT double-pulse circuit" 5.5 8.05 5.4 0.38 14 | Out-Null
        Add-Label "Nodes: 3 = DC bus, 2 = switch/drain, 1 = gate, 11 = driver, 0 = ground" 5.5 7.62 6.5 0.30 9 | Out-Null
    }

    Invoke-VisioStep "Draw ground bus and supplies" {
        Add-Wire 1.05 1.05 9.65 1.05 | Out-Null
        Drop-Part @("GND") 0.82 1.05 0.45 0.35 "GND_symbol" | Out-Null

        Drop-Part @("DC-V", "V-R") 2.0 3.75 0.70 1.05 "Vdd_DC_bus" | Out-Null
        Add-Wire 2.0 6.65 2.0 4.35 | Out-Null
        Add-Wire 2.0 3.10 2.0 1.05 | Out-Null
        Add-Label "Vdd`nVsource_pset`n(3,0)" 1.15 3.75 1.35 0.72 8 | Out-Null
        Add-Label "node 3" 1.95 6.95 0.85 0.26 8 | Out-Null
    }

    Invoke-VisioStep "Draw Lload and freewheel diode between node 3 and node 2" {
        Add-Wire 2.0 6.65 3.35 6.65 | Out-Null
        Drop-Part @("L") 4.05 6.65 1.10 0.55 "Lload" | Out-Null
        Add-Wire 4.75 6.65 5.75 6.65 | Out-Null
        Add-Wire 5.75 6.65 5.75 4.30 | Out-Null
        Add-Label "Lload`n@Ldsw@" 4.05 7.12 1.15 0.42 8 | Out-Null

        Add-Wire 2.0 5.42 3.30 5.42 | Out-Null
        Drop-Part @("Diode1", "Diode2", "LED") 4.05 5.42 0.80 0.52 "freewheel_diode" | Out-Null
        Add-Wire 4.78 5.42 5.75 5.42 | Out-Null
        Add-Wire 2.0 6.65 2.0 5.42 | Out-Null
        Add-Wire 5.75 5.42 5.75 4.30 | Out-Null
        Add-Label "freewheel diode`n(3,2)" 4.05 4.92 1.35 0.43 8 | Out-Null
        Add-Label "node 2`nswitch/drain" 6.45 4.37 1.12 0.42 8 | Out-Null
    }

    Invoke-VisioStep "Draw GaN FinFET DUT" {
        Drop-Part @("Nmos3.d", "Nmos4", "Nmos3.a") 6.12 2.75 0.92 1.65 "DUT_GaN_FinFET" | Out-Null
        Add-Wire 5.75 4.30 6.12 4.30 | Out-Null
        Add-Wire 6.12 4.30 6.12 3.58 | Out-Null
        Add-Wire 6.12 1.92 6.12 1.05 | Out-Null
        Add-Label "DUT`nGaN FinFET`ndrain=2`ngate=1`nsource=0" 7.42 2.75 1.55 0.85 8 | Out-Null
        Add-Label "v(2) ~= Vds" 6.70 4.78 1.10 0.30 8 | Out-Null
    }

    Invoke-VisioStep "Draw gate driver, Rg, and gate node" {
        Drop-Part @("DC-V", "V-R") 1.35 2.05 0.62 0.92 "vgdrv_source" | Out-Null
        Add-Wire 1.35 2.84 1.35 2.51 | Out-Null
        Add-Wire 1.35 1.57 1.35 1.05 | Out-Null
        Add-Label "vgdrv PWL`n(11,0)" 0.72 2.05 1.05 0.48 8 | Out-Null
        Add-Label "node 11" 1.35 3.15 0.88 0.26 8 | Out-Null

        Add-Wire 1.35 2.84 2.55 2.84 | Out-Null
        Drop-Part @("R") 3.25 2.84 0.95 0.38 "Rg" | Out-Null
        Add-Wire 3.95 2.84 5.47 2.84 | Out-Null
        Add-Wire 5.47 2.84 5.72 2.84 | Out-Null
        Add-Label "Rg`n@Rgsw@" 3.25 3.26 0.85 0.36 8 | Out-Null
        Add-Label "node 1`ngate" 5.08 3.26 0.88 0.36 8 | Out-Null
        Add-Label "v(11)" 2.00 3.10 0.60 0.25 8 | Out-Null
        Add-Label "v(1)" 4.72 3.10 0.60 0.25 8 | Out-Null
    }

    Invoke-VisioStep "Draw observables block" {
        $obs = @(
            "Plot n@node@_SW_circuit",
            "time()",
            "v(11), v(1), v(2), v(3)",
            "i(Vdd,3), i(vgdrv,11)"
        ) -join "`n"
        Add-Label $obs 8.95 6.25 2.7 1.10 8 | Out-Null
        Add-Wire 7.55 6.25 7.95 6.25 | Out-Null
        Add-Label "No circular junction markers: wires meet directly." 8.25 1.55 2.55 0.30 8 | Out-Null
    }

    Invoke-VisioStep "Final page cleanup" {
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
