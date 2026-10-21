#!/usr/bin/env node

/**
 * Guardia Deployment Verification Hook
 *
 * Computes a Merkle tree fingerprint of source files and verifies
 * it against the approved fingerprint via the Guardia API.
 *
 * Usage:
 *   node verify.js [--config path/to/.guardia.json]
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - One or more checks failed
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
// Zero external dependencies — uses only Node built-in modules.
// No npm install required, so package.json stays untouched and the
// Merkle fingerprint remains stable after hook export.

// ─── Hash scope ──────────────────────────────────────────────────────
// Must mirror guardia.engine.file_walker.walk_for_fingerprint() in the
// Python scanner.
//
// PRIMARY: Uses `git ls-files` so only committed, git-tracked files are
// hashed — exactly the same set that GitHub Actions (or any CI) checks
// out. Gitignored local files (.env, .env.local, secrets, etc.) are
// automatically excluded on BOTH sides without any manual configuration.
//
// FALLBACK: Raw filesystem walk when git is unavailable (non-git repos).
//
// The .guardia/ runtime sub-paths (logs, cache, .last_run, .state) are
// excluded because they mutate every time verify.js runs.

// Filename-level noise (matches NOISE_FILENAMES in file_walker.py).
const NOISE_FILENAMES = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini']);

// File patterns always excluded (matches DEFAULT_EXCLUDE_PATTERNS in file_walker.py).
const EXCLUDE_EXACT = new Set(['package-lock.json', 'yarn.lock', 'poetry.lock']);
const EXCLUDE_SUFFIXES = ['.min.js', '.min.css', '.map', '.lock'];

// Transient .guardia/ sub-paths to exclude (matches GUARDIA_TRANSIENT_PATHS).
const GUARDIA_TRANSIENT_PREFIXES = [
    '.guardia/logs',
    '.guardia/cache',
    '.guardia/runtime',
    '.guardia/.last_run',
    '.guardia/.state',
];

// Directories always excluded — used only in the filesystem fallback.
const EXCLUDED_DIRS = new Set([
    'node_modules', 'dist', 'build', '__pycache__', '.git',
    '.venv', 'venv', 'env', '.env', '.tox', '.mypy_cache',
    '.pytest_cache', 'coverage', '.next', '.nuxt',
]);

// ANSI colors
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m',
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function loadConfig(configPath) {
    // Search order: explicit path → .guardia/config.json → .guardia.json (legacy)
    const candidates = configPath
        ? [configPath]
        : [
            path.join(process.cwd(), '.guardia', 'config.json'),
            path.join(process.cwd(), '.guardia.json'),
          ];

    let resolvedPath = null;
    for (const p of candidates) {
        if (fs.existsSync(p)) {
            resolvedPath = p;
            break;
        }
    }

    if (!resolvedPath) {
        log('red', 'Error: No Guardia configuration found.');
        log('yellow', 'Expected .guardia/config.json (created by Guardia export)');
        log('yellow', 'or .guardia.json in the project root.');
        process.exit(1);
    }

    log('blue', `Config: ${resolvedPath}`);
    const config = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));

    // Allow overriding from environment variables (for CI/CD)
    if (process.env.GUARDIA_PROJECT_ID) {
        config.project_id = process.env.GUARDIA_PROJECT_ID;
    }
    if (process.env.GUARDIA_API_KEY) {
        config.api_key = process.env.GUARDIA_API_KEY;
    }
    if (process.env.GUARDIA_API_URL) {
        config.api_base_url = process.env.GUARDIA_API_URL;
    }

    if (!config.project_id || !config.api_base_url) {
        log('red', 'Error: Config must contain "project_id" and "api_base_url"');
        process.exit(1);
    }
    return config;
}

function isTransientGuardiaPath(relPathPosix) {
    for (const prefix of GUARDIA_TRANSIENT_PREFIXES) {
        if (relPathPosix === prefix || relPathPosix.startsWith(prefix + '/')) {
            return true;
        }
    }
    return false;
}

function applyFileFilters(relNorm) {
    const filename = path.basename(relNorm);
    if (NOISE_FILENAMES.has(filename)) return false;
    if (EXCLUDE_EXACT.has(filename)) return false;
    if (EXCLUDE_SUFFIXES.some(s => filename.endsWith(s))) return false;
    if (isTransientGuardiaPath(relNorm)) return false;
    return true;
}

// Sub-dirs of .guardia/ pruned at the directory level (mutate at runtime).
const GUARDIA_TRANSIENT_DIRS = new Set(['logs', 'cache', 'runtime']);

function walkDirectoryFallback(rootDir) {
    // Raw filesystem walk — used only when git is unavailable.
    const files = [];

    function shouldExcludeDir(dirName) {
        return EXCLUDED_DIRS.has(dirName) || dirName.startsWith('.');
    }

    function walk(dir) {
        const relDir = path.relative(rootDir, dir).split(path.sep).join('/') || '.';
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (relDir === '.' && entry.name === '.guardia') {
                    walk(fullPath);
                    continue;
                }
                if (relDir === '.guardia' && GUARDIA_TRANSIENT_DIRS.has(entry.name)) {
                    continue;
                }
                if (!shouldExcludeDir(entry.name)) {
                    walk(fullPath);
                }
            } else if (entry.isFile()) {
                const relPath = path.relative(rootDir, fullPath).split(path.sep).join('/');
                if (applyFileFilters(relPath)) {
                    files.push(relPath);
                }
            }
        }
    }

    walk(rootDir);
    return files.sort();
}

function walkDirectory(rootDir) {
    // PRIMARY: use git ls-files — only committed, tracked files are hashed.
    // This is identical to what CI checks out, so gitignored local files
    // (.env, secrets, etc.) are automatically excluded on both sides.
    try {
        const output = execSync('git ls-files --cached --others --exclude-standard', {
            cwd: rootDir,
            encoding: 'utf-8',
            timeout: 30000,
            stdio: ['ignore', 'pipe', 'ignore'],
        });
        const gitFiles = output
            .split('\n')
            .map(f => f.trim())
            .filter(f => f.length > 0)
            .filter(applyFileFilters)
            .sort();
        log('blue', `File source: git ls-files (${gitFiles.length} tracked files)`);
        return gitFiles;
    } catch (_) {
        // FALLBACK: not a git repo or git not available — use filesystem walk.
        log('yellow', 'Warning: git unavailable, falling back to filesystem walk');
        return walkDirectoryFallback(rootDir);
    }
}

function computeFileHash(filePath) {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
}

function computeMerkleRoot(rootDir, files) {
    const leafHashes = {};
    for (const relPath of files) {
        const absPath = path.join(rootDir, relPath);
        leafHashes[relPath] = computeFileHash(absPath);
    }

    // Sort by file path and concatenate hashes
    const sortedKeys = Object.keys(leafHashes).sort();
    const concatenated = sortedKeys.map(k => leafHashes[k]).join('');
    const rootHash = crypto.createHash('sha256').update(concatenated, 'utf-8').digest('hex');

    return { rootHash, leafHashes, fileCount: files.length };
}

function httpRequest(url, method, body, headers) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const lib = parsed.protocol === 'https:' ? require('https') : require('http');
        const payload = body ? JSON.stringify(body) : null;
        if (payload) {
            headers['Content-Length'] = Buffer.byteLength(payload);
        }

        const req = lib.request({
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname + (parsed.search || ''),
            method,
            headers,
            timeout: 30000,
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (_) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
        if (payload) req.write(payload);
        req.end();
    });
}

function httpPost(url, body, headers) {
    return httpRequest(url, 'POST', body, headers);
}

// ─────────────────────────────────────────────────────────────────────
// Internal check A: fingerprint integrity (runs first internally)
// ─────────────────────────────────────────────────────────────────────
async function verifyHash(config, rootHash, leafHashes) {
    const url = `${config.api_base_url}/api/v1/verify`;
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (config.api_key) headers['X-API-Key'] = config.api_key;

        const response = await httpPost(url, {
            project_id: config.project_id,
            submitted_hash: rootHash,
            leaf_hashes: leafHashes,
        }, headers);

        if (response.status >= 200 && response.status < 300) {
            return response.data;
        }
        const detail = response.data && response.data.detail;
        let message = 'API error';
        if (typeof detail === 'string') message = detail;
        else if (detail) message = JSON.stringify(detail);
        return { matched: false, result_status: 'error', message };
    } catch (error) {
        throw error;
    }
}

// ─────────────────────────────────────────────────────────────────────
// Internal check B: compliance scan (runs second internally)
// ─────────────────────────────────────────────────────────────────────
async function runComplianceScan(config, rootDir, files) {
    const url = `${config.api_base_url}/api/v1/rescan`;
    try {
        const scannableFiles = {};
        for (const relPath of files) {
            const ext = relPath.split('.').pop().toLowerCase();
            if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) {
                const absPath = path.join(rootDir, relPath);
                try {
                    scannableFiles[relPath] = fs.readFileSync(absPath, 'utf-8');
                } catch (err) {
                    log('yellow', `Warning: Could not read ${relPath}: ${err.message}`);
                }
            }
        }

        if (Object.keys(scannableFiles).length === 0) {
            log('blue', 'No JS/TS files to scan — compliance check skipped');
            return { scan_passed: true, total_findings: 0, compliance_score: 100.0 };
        }

        log('blue', `Scanning ${Object.keys(scannableFiles).length} JS/TS files for privacy violations...`);

        const headers = { 'Content-Type': 'application/json' };
        if (config.api_key) headers['X-API-Key'] = config.api_key;

        const response = await httpPost(url, {
            project_id: config.project_id,
            files: scannableFiles,
        }, headers);

        if (response.status >= 200 && response.status < 300) {
            return response.data;
        }

        const detail = response.data && response.data.detail;
        let message = 'Rescan API error';
        if (typeof detail === 'string') message = detail;
        else if (detail) message = JSON.stringify(detail);
        return { scan_passed: false, message, total_findings: -1 };
    } catch (error) {
        throw error;
    }
}

// ─────────────────────────────────────────────────────────────────────
// Report compliance failure back to the API so the desktop app
// can show the correct status instead of "Awaiting Deployment".
// Fire-and-forget — never blocks or fails the CI job exit.
// ─────────────────────────────────────────────────────────────────────
async function reportComplianceFailure(config, totalFindings, complianceScore, findings) {
    const url = `${config.api_base_url}/api/v1/report-compliance-failure`;
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (config.api_key) headers['X-API-Key'] = config.api_key;

        const topFindings = (findings || []).slice(0, 10).map(f => ({
            rule_name: f.rule_name || '',
            file_path: f.file_path || '',
            severity: f.severity || '',
        }));

        await httpPost(url, {
            project_id: config.project_id,
            total_findings: totalFindings,
            compliance_score: complianceScore,
            findings: topFindings,
        }, headers);
    } catch (_) {
        // Silently ignore — status report is best-effort
    }
}

async function main() {
    log('cyan', '╔══════════════════════════════════════════╗');
    log('cyan', '║     Guardia Deployment Verification    ║');
    log('cyan', '╚══════════════════════════════════════════╝');
    console.log();

    // Parse arguments
    const args = process.argv.slice(2);
    let configPath = null;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--config' && args[i + 1]) {
            configPath = args[i + 1];
        }
    }

    // Load config
    const config = loadConfig(configPath);
    log('blue', `Project ID: ${config.project_id}`);
    log('blue', `API URL: ${config.api_base_url}`);
    console.log();

    // Walk directory
    const rootDir = process.cwd();
    log('yellow', 'Scanning files...');
    const files = walkDirectory(rootDir);
    log('blue', `Found ${files.length} source files`);
    console.log();

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PHASE 1: Code Integrity Check (fingerprint verification)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    log('cyan', '╔══════════════════════════════════════════╗');
    log('cyan', '║  PHASE 1: Code Integrity Check         ║');
    log('cyan', '╚══════════════════════════════════════════╝');
    console.log();

    log('yellow', 'Computing Merkle tree fingerprint...');
    const { rootHash, leafHashes, fileCount } = computeMerkleRoot(rootDir, files);
    log('blue', `Root hash: ${rootHash}`);
    log('blue', `Files hashed: ${fileCount}`);
    console.log();

    log('yellow', 'Verifying hash with Guardia API...');
    let phase1Passed = false;
    try {
        const hashResult = await verifyHash(config, rootHash, leafHashes);
        console.log();

        if (hashResult.matched) {
            log('green', `${colors.bold}✅ PHASE 1 PASSED${colors.reset}`);
            log('green', `Status: ${hashResult.result_status}`);
            log('green', hashResult.message);
            phase1Passed = true;
        } else {
            log('red', `${colors.bold}❌ PHASE 1 FAILED${colors.reset}`);
            log('red', `Status: ${hashResult.result_status}`);
            log('red', hashResult.message);
            if (hashResult.approved_hash) {
                log('yellow', `Expected: ${hashResult.approved_hash}`);
                log('yellow', `Got:      ${rootHash}`);
            }
            console.log();
            log('yellow', 'Your code has changed since the last approved fingerprint.');
            log('yellow', 'Scan your project in Guardia desktop app and approve the new fingerprint.');
            process.exit(1);
        }
    } catch (error) {
        log('red', `${colors.bold}❌ PHASE 1 ERROR${colors.reset}`);
        log('red', `Could not reach Guardia API: ${error.message}`);
        process.exit(1);
    }

    console.log();

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PHASE 2: Privacy Compliance Check (only reached if Phase 1 passed)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    log('cyan', '╔══════════════════════════════════════════╗');
    log('cyan', '║  PHASE 2: Privacy Compliance Check     ║');
    log('cyan', '╚══════════════════════════════════════════╝');
    console.log();

    let complianceScore = 0;
    let totalFindings = 0;

    try {
        const scanResult = await runComplianceScan(config, rootDir, files);

        if (scanResult.total_findings === -1) {
            log('red', `${colors.bold}❌ PHASE 2 FAILED${colors.reset}`);
            log('red', `Reason: ${scanResult.message || 'Compliance scan API error'}`);
            process.exit(1);
        }

        complianceScore = scanResult.compliance_score || 0;
        totalFindings = scanResult.total_findings || 0;

        if (scanResult.scan_passed) {
            log('green', `${colors.bold}✅ PHASE 2 PASSED${colors.reset}`);
            log('green', `Compliance Score: ${complianceScore.toFixed(1)}%`);
            log('green', `Privacy Violations: ${totalFindings}`);
        } else {
            log('red', `${colors.bold}❌ PHASE 2 FAILED${colors.reset}`);
            log('red', `Compliance Score: ${complianceScore.toFixed(1)}%`);
            log('red', `Privacy Violations Found: ${totalFindings}`);
            console.log();

            if (scanResult.findings && scanResult.findings.length > 0) {
                log('yellow', 'Violations detected:');
                const top = scanResult.findings.slice(0, 5);
                for (const f of top) {
                    const sev = f.severity.toUpperCase();
                    const col = sev === 'CRITICAL' || sev === 'HIGH' ? 'red' : 'yellow';
                    log(col, `  • [${sev}] ${f.rule_name} in ${f.file_path}:${f.line_number || '?'}`);
                }
                if (scanResult.findings.length > 5) {
                    log('yellow', `  ... and ${scanResult.findings.length - 5} more`);
                }
            }

            console.log();
            log('yellow', 'Fix these violations in your code, rescan in Guardia desktop app,');
            log('yellow', 'approve the new fingerprint, then push again.');

            // Report failure to the API so the desktop app reflects the real status.
            await reportComplianceFailure(
                config,
                totalFindings,
                complianceScore,
                scanResult.findings || []
            );

            process.exit(1);
        }
    } catch (error) {
        log('red', `${colors.bold}❌ PHASE 2 ERROR${colors.reset}`);
        log('red', `Could not complete compliance scan: ${error.message}`);
        process.exit(1);
    }

    console.log();

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ALL CHECKS PASSED
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    log('green', `${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    log('green', `${colors.bold}✅ ALL CHECKS PASSED - DEPLOYMENT APPROVED${colors.reset}`);
    log('green', `${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log();
    log('green', `✓ Phase 1: Code integrity verified (hash matched)`);
    log('green', `✓ Phase 2: Privacy compliance verified (${complianceScore.toFixed(1)}%)`);
    process.exit(0);
}

main();
