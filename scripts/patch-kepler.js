

const fs = require('fs');
const path = require('path');

function patchUtils() {
  const targetFile = path.resolve(__dirname, '..', 'node_modules', '@amazon-devices', 'kepler-compatibility-metro-config', 'dist', 'src', 'utils.js');
  if (!fs.existsSync(targetFile)) {
    console.log('[patch-kepler] Note: utils.js not found at', targetFile);
    return;
  }

  let content = fs.readFileSync(targetFile, 'utf8');

  if (content.includes('// [PATCH-KEPLER-SPACES-FIX]')) {
    console.log('[patch-kepler] utils.js is already patched.');
    return;
  }

  const replacement = `function buildKeplerManifest(manifestBuilderBinary, packageDir = ['.'], packageJsonPath = './package.json') {
    // [PATCH-KEPLER-SPACES-FIX]
    try {
        const args = ['build'];
        for (const dir of packageDir) {
            args.push('-d', dir);
        }
        args.push('-p', packageJsonPath, '-s');

        let file = manifestBuilderBinary;
        let execArgs = args;

        if (manifestBuilderBinary.endsWith('.js') && fs.existsSync(manifestBuilderBinary)) {
            file = process.execPath;
            execArgs = [manifestBuilderBinary, ...args];
        } else {
            let candidate = manifestBuilderBinary;
            if (!path.extname(candidate)) {
                if (fs.existsSync(candidate + '.js')) {
                    file = process.execPath;
                    execArgs = [candidate + '.js', ...args];
                } else if (process.platform === 'win32' && fs.existsSync(candidate + '.cmd')) {
                    candidate = candidate + '.cmd';
                }
            }
            if (candidate.endsWith('.cmd') && fs.existsSync(candidate)) {
                try {
                    const content = fs.readFileSync(candidate, 'utf8');
                    const match = content.match(/%dp0%\\\\([^\\r\\n"]+?\\.js)/i);
                    if (match) {
                        const targetJs = path.resolve(path.dirname(candidate), match[1]);
                        if (fs.existsSync(targetJs)) {
                            file = process.execPath;
                            execArgs = [targetJs, ...args];
                        }
                    }
                } catch (_) {}
            }
            if (file === manifestBuilderBinary && fs.existsSync(manifestBuilderBinary)) {
                try {
                    const content = fs.readFileSync(manifestBuilderBinary, 'utf8');
                    const match = content.match(/\\$basedir\\/([^\\r\\n"]+?\\.js)/i);
                    if (match) {
                        const targetJs = path.resolve(path.dirname(manifestBuilderBinary), match[1]);
                        if (fs.existsSync(targetJs)) {
                            file = process.execPath;
                            execArgs = [targetJs, ...args];
                        }
                    }
                } catch (_) {}
            }
        }

        const useShell = process.platform === 'win32' && (file.endsWith('.cmd') || file.endsWith('.bat'));
        const output = child_process.execFileSync(file, execArgs, { encoding: 'utf8', shell: useShell });
        return JSON.parse(output);
    }
    catch (error) {
        throw new Error(\`Unable to generate a manifest: \${error}\`);
    }
}`;

  content = content.replace(/function buildKeplerManifest\([\s\S]*?exports\.buildKeplerManifest\s*=\s*buildKeplerManifest;/, replacement + '\nexports.buildKeplerManifest = buildKeplerManifest;');
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('[patch-kepler] Successfully patched utils.js');
}

function patchHermes() {
  const targetFile = path.resolve(__dirname, '..', 'node_modules', '@amazon-devices', 'kepler-cli-platform', 'dist', 'common', 'hermes.js');
  if (!fs.existsSync(targetFile)) {
    console.log('[patch-kepler] Note: hermes.js not found at', targetFile);
    return;
  }

  let content = fs.readFileSync(targetFile, 'utf8');
  if (content.includes('// [PATCH-KEPLER-HERMES-WIN32]') || (content.includes("hostOs === 'win32'") && content.includes('spawnSync'))) {
    console.log('[patch-kepler] hermes.js is already patched.');
    return;
  }

  // 1. Patch createBundle to use spawnSync without shell space splitting
  content = content.replace(
    /static async createBundle\(ctx, args\) \{[\s\S]*?shelljs_1\.default\.exec\(hermesCmd\.join\(' '\), \{ silent: true \}\);[\s\S]*?if \(result\.code !== 0\) \{[\s\S]*?\}[\s\S]*?\}/,
    `static async createBundle(ctx, args) {
        // [PATCH-KEPLER-HERMES-WIN32]
        fs_1.default.mkdirSync(path_1.default.dirname(args.out), { recursive: true });
        const hermesExec = Hermes.getHermesPath(ctx);
        const hermesArgs = [
            '--emit-binary',
            '-out',
            args.out,
            args.bundlePath,
            ...Hermes.parseOptions(args.hermesFlags),
        ];
        const child_process = require('child_process');
        const res = child_process.spawnSync(hermesExec, hermesArgs, { encoding: 'utf8' });
        if (res.status !== 0) {
            throw new cli_tools_1.CLIError(\`An error occurred while executing Hermes command \${hermesExec} \${hermesArgs.join(' ')}: \${res.stderr || res.stdout}\`);
        }
    }`
  );

  // 2. Patch getHermesPathHelper to support win32 and resolve hermesc.exe
  content = content.replace(
    /else if \(hostOs === 'darwin'\) \{[\s\S]*?platformDependentDir = 'osx-bin';[\s\S]*?\}[\s\S]*?else \{[\s\S]*?throw new cli_tools_1\.CLIError\(`Unsupported host OS: \${hostOs}`\);[\s\S]*?\}[\s\S]*?let hermesBinaryPath = path_1\.default\.join\(rnVegaPackagePath, 'sdks', 'hermesc', platformDependentDir, 'hermesc'\);/,
    `else if (hostOs === 'darwin') {
            platformDependentDir = 'osx-bin';
        }
        else if (hostOs === 'win32') {
            platformDependentDir = 'win64-bin';
        }
        else {
            throw new cli_tools_1.CLIError(\`Unsupported host OS: \${hostOs}\`);
        }
        const hermesBinaryName = hostOs === 'win32' ? 'hermesc.exe' : 'hermesc';
        let hermesBinaryPath = path_1.default.join(rnVegaPackagePath, 'sdks', 'hermesc', platformDependentDir, hermesBinaryName);
        if (!(0, fs_1.existsSync)(hermesBinaryPath) && hostOs === 'win32') {
            try {
                const hermesCompilerPkg = moduleUtils_1.ModuleUtils.getModulePath(ctx.root, 'hermes-compiler', false);
                const winHermes = path_1.default.join(hermesCompilerPkg, 'hermesc', 'win64-bin', 'hermesc.exe');
                if ((0, fs_1.existsSync)(winHermes)) {
                    hermesBinaryPath = winHermes;
                }
            } catch (_) {}
        }`
  );

  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('[patch-kepler] Successfully patched hermes.js');
}

function patchVegaExecutor() {
  const targetFile = path.resolve(__dirname, '..', 'node_modules', '@amazon-devices', 'kepler-cli-platform', 'dist', 'common', 'vegaExecutor.js');
  if (!fs.existsSync(targetFile)) {
    console.log('[patch-kepler] Note: vegaExecutor.js not found at', targetFile);
    return;
  }

  let content = fs.readFileSync(targetFile, 'utf8');
  if (content.includes('// [PATCH-KEPLER-VEGA-WIN32]') || content.includes("process.platform === 'win32' && resultCode === 1")) {
    console.log('[patch-kepler] vegaExecutor.js is already patched.');
    return;
  }

  content = content.replace(
    /\/\/ Exit code 127 means command not found[\s\S]*?if \(resultCode === 127\) \{[\s\S]*?log_1\.default\.debug\(`\${cliPath} executable not found`\);[\s\S]*?return null;[\s\S]*?\}/,
    `// [PATCH-KEPLER-VEGA-WIN32] Exit code 127 (POSIX) or code 1 with "not recognized" (Windows cmd) means command not found
        if (resultCode === 127 || (process.platform === 'win32' && resultCode === 1 && (shellString.stderr.includes('not recognized') || shellString.stdout.includes('not recognized')))) {
            log_1.default.debug(\`\${cliPath} executable not found\`);
            return null;
        }`
  );

  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('[patch-kepler] Successfully patched vegaExecutor.js');
}

patchUtils();
patchHermes();
patchVegaExecutor();
