param([Parameter(Mandatory = $true)][int]$RootPid)
# Keeps an E2E run's own processes out of Windows power throttling (EcoQoS).
#
# Windows 11 runs background, windowless processes under EcoQoS. On a hybrid CPU that
# confines them to the efficiency cores: on the i5-14400F this suite was measured on,
# eight headless Chromium workers held all 4 E-cores at 98-100 % while the 12
# performance threads idled at 10-35 %, and the Playwright workers waiting on those
# browsers went unscheduled for up to 96 s, so tests timed out in random steps.
#
# Every half second this opts each new descendant of $RootPid (the Playwright runner:
# its workers, the browsers, the preview server) out of execution-speed throttling
# with SetProcessInformation, the documented per-process switch. Nothing outside
# that process tree is touched, and no system setting changes. It exits on its own
# when the runner is gone.
$ErrorActionPreference = 'SilentlyContinue'
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class ZooWorkersQos {
  [StructLayout(LayoutKind.Sequential)]
  public struct PowerThrottlingState { public uint Version; public uint ControlMask; public uint StateMask; }
  [DllImport("kernel32.dll", SetLastError = true)]
  static extern IntPtr OpenProcess(uint access, bool inherit, int pid);
  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool SetProcessInformation(IntPtr process, int infoClass, ref PowerThrottlingState info, int size);
  [DllImport("kernel32.dll")]
  static extern bool CloseHandle(IntPtr handle);
  // ProcessPowerThrottling = 4; PROCESS_SET_INFORMATION = 0x0200;
  // PROCESS_POWER_THROTTLING_EXECUTION_SPEED = 1, StateMask 0 = never throttle.
  public static bool OptOut(int pid) {
    IntPtr handle = OpenProcess(0x0200, false, pid);
    if (handle == IntPtr.Zero) return false;
    var state = new PowerThrottlingState { Version = 1, ControlMask = 1, StateMask = 0 };
    bool ok = SetProcessInformation(handle, 4, ref state, Marshal.SizeOf(typeof(PowerThrottlingState)));
    CloseHandle(handle);
    return ok;
  }
}
"@
[void][ZooWorkersQos]::OptOut($PID)
$seen = @{}
while (Get-Process -Id $RootPid) {
  $byParent = @{}
  foreach ($p in Get-CimInstance Win32_Process -Property ProcessId, ParentProcessId) {
    $parent = [int]$p.ParentProcessId
    if (-not $byParent.ContainsKey($parent)) { $byParent[$parent] = New-Object System.Collections.ArrayList }
    [void]$byParent[$parent].Add([int]$p.ProcessId)
  }
  $pending = New-Object System.Collections.Stack
  $pending.Push($RootPid)
  while ($pending.Count -gt 0) {
    $id = $pending.Pop()
    if (-not $seen.ContainsKey($id)) { $seen[$id] = [ZooWorkersQos]::OptOut($id) }
    if ($byParent.ContainsKey($id)) { foreach ($child in $byParent[$id]) { if ($child -ne $id) { $pending.Push($child) } } }
  }
  Start-Sleep -Milliseconds 500
}
