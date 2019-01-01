param([String] $VERSION_MODE)

function Update-Version([String] $filename, [String] $mode) {
    "Updating version in $filename with a $mode update."

    # get contents of file
    $json = Get-Content $filename | ConvertFrom-Json
    
    $version = [version] $json.version

    if ($mode -eq "major") { $newMajor = $version.Major + 1 } else { $newMajor = $version.Major }
    if ($mode -eq "minor") { $newMinor = $version.Minor + 1 } else { $newMinor = $version.Minor }
    if ($mode -eq "patch") { $newPatch = $version.Build + 1 } else { $newPatch = $version.Build }

    $newVersion = "$newMajor.$newMinor.$newPatch"
    $json.version = $newVersion

    "Updating version to $newVersion"

    Set-Content -Path $filename -Value ($json | ConvertTo-Json)
}

Update-Version "packages\Server\package.json" $VERSION_MODE
Update-Version "packages\Client\package.json" $VERSION_MODE
Update-Version "package.json" $VERSION_MODE
Update-Version "lerna.json" $VERSION_MODE