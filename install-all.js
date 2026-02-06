#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;

function findPackageJsonDirs(dir, results = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.name === 'node_modules') continue;

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            findPackageJsonDirs(fullPath, results);
        } else if (entry.name === 'package.json') {
            results.push(dir);
        }
    }

    return results;
}

function main() {
    console.log('Finding all applications with package.json...\n');

    const appDirs = findPackageJsonDirs(rootDir);

    console.log(`Found ${appDirs.length} applications.\n`);

    let success = 0;
    let failed = 0;
    const failures = [];

    for (const appDir of appDirs) {
        const relativePath = path.relative(rootDir, appDir);
        console.log(`\n[${success + failed + 1}/${appDirs.length}] Installing dependencies in: ${relativePath || '.'}`);
        console.log('─'.repeat(60));

        try {
            execSync('npm install', {
                cwd: appDir,
                stdio: 'inherit'
            });
            success++;
            console.log(`✓ Success: ${relativePath || '.'}`);
        } catch (error) {
            failed++;
            failures.push(relativePath || '.');
            console.error(`✗ Failed: ${relativePath || '.'}`);
        }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Total applications: ${appDirs.length}`);
    console.log(`Successful: ${success}`);
    console.log(`Failed: ${failed}`);

    if (failures.length > 0) {
        console.log('\nFailed installations:');
        failures.forEach(f => console.log(`  - ${f}`));
        process.exit(1);
    }

    console.log('\nAll installations completed successfully!');
}

main();
