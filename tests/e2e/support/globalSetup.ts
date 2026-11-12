import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * On Windows, keep this run's processes out of power throttling (EcoQoS) for as long as
 * the runner lives; see scripts/e2e-windows-qos.ps1 for the measured cause. Elsewhere,
 * or with E2E_WINDOWS_QOS=0 (to reproduce the throttled behaviour), it does nothing.
 */
export default function globalSetup(): (() => void) | undefined {
  if (process.platform !== 'win32' || process.env.E2E_WINDOWS_QOS === '0') return undefined;
  const script = fileURLToPath(new URL('../../../scripts/e2e-windows-qos.ps1', import.meta.url));
  const helper = spawn(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      script,
      '-RootPid',
      String(process.pid),
    ],
    { stdio: 'ignore', windowsHide: true },
  );
  helper.on('error', (error) => {
    console.warn(`e2e: could not start the Windows power-throttling opt-out (${error.message}).`);
  });
  // On stderr, so a reporter that writes to stdout (json, junit) stays parseable.
  process.stderr.write(
    'e2e: Windows power throttling (EcoQoS) is off for this run’s own processes.\n',
  );
  return () => {
    if (helper.exitCode === null) helper.kill();
  };
}
