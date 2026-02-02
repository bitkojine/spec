#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const pkgPath = join(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

const ITERATIONS = 5;

console.log(`🚀 Starting Performance Benchmark for version ${pkg.version}...`);

// Bump version for this benchmark run
try {
    execSync('npm version patch --no-git-tag-version', { stdio: 'inherit' });
    const newPkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    console.log(`✅ Version bumped to ${newPkg.version}`);

    for (let i = 1; i <= ITERATIONS; i++) {
        console.log(`\n🏃 Iteration ${i}/${ITERATIONS}...`);
        execSync('npm run test:stress', {
            stdio: 'inherit',
            env: { ...process.env, STRESS_TEST: 'true', LOG_LEVEL: 'info' }
        });
    }

    console.log(`\n🎉 Benchmark complete! 5 iterations recorded for version ${newPkg.version}.`);
} catch (error) {
    console.error('❌ Benchmark failed:', error.message);
    process.exit(1);
}
