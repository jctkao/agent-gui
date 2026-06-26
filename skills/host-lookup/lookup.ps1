param(
    [Parameter(Mandatory = $true)]
    [string]$HostName
)

$hostsFile = Join-Path $PSScriptRoot "hosts.txt"

if (-not (Test-Path $hostsFile)) {
    Write-Output "hosts.txt not found at: $hostsFile"
    exit 1
}

$entries = @()

foreach ($line in Get-Content $hostsFile) {
    $trimmed = $line.Trim()
    if ($trimmed -eq '' -or $trimmed.StartsWith('#')) { continue }

    $parts = $trimmed -split '=', 2
    if ($parts.Length -ne 2) { continue }

    $entries += [PSCustomObject]@{ Name = $parts[0].Trim(); IP = $parts[1].Trim() }
}

$words = $HostName -split '\s+' | Where-Object { $_ -ne '' }

if ($words.Count -le 1) {
    # Single-word: existing substring match
    $matches = $entries | Where-Object { $_.Name -like "*$HostName*" }

    if ($matches.Count -eq 0) {
        Write-Output "No host matching '$HostName' found in hosts.txt"
    } elseif ($matches.Count -eq 1) {
        Write-Output $matches[0].IP
    } else {
        $list = ($matches | ForEach-Object { "$($_.Name) ($($_.IP))" }) -join ', '
        Write-Output "Multiple hosts match '$HostName': $list. Ask the user to specify."
    }
} else {
    # Multi-word: AND/OR ranked matching
    $andMatches = @()
    $orMatches  = @()

    foreach ($entry in $entries) {
        $matchCount = ($words | Where-Object { $entry.Name -like "*$_*" }).Count
        if ($matchCount -eq $words.Count) {
            $andMatches += $entry
        } elseif ($matchCount -gt 0) {
            $orMatches += $entry
        }
    }

    if ($andMatches.Count -eq 1) {
        Write-Output $andMatches[0].IP
    } elseif ($andMatches.Count -eq 0 -and $orMatches.Count -eq 0) {
        Write-Output "No host matching '$HostName' found in hosts.txt"
    } else {
        $ranked = $andMatches + $orMatches
        $list = ($ranked | ForEach-Object { "$($_.Name) ($($_.IP))" }) -join ', '
        Write-Output "Multiple hosts match '$HostName': $list. Ask the user to specify."
    }
}
