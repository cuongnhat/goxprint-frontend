import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('📦 Simple frontend deployment...\n');

const distFiles = [];
const distPath = path.join(__dirname, 'dist');

// Get all files
function getFiles(dir, prefix = '') {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            getFiles(fullPath, prefix + item + '/');
        } else {
            distFiles.push({
                local: fullPath,
                remote: prefix + item,
                size: stat.size
            });
        }
    });
}

getFiles(distPath);

console.log(`Found ${distFiles.length} files to upload\n`);

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Connected\n');

    conn.sftp((err, sftp) => {
        if (err) {
            console.error('❌ SFTP error:', err);
            conn.end();
            return;
        }

        const remotePath = '/opt/goxprint/goxprint-remote/dist';

        // Clear and recreate structure
        conn.exec(`rm -rf ${remotePath} && mkdir -p ${remotePath}/assets`, (err) => {
            console.log('Creating directories...\n');

            let uploaded = 0;
            let errors = 0;

            console.log('Uploading files:');

            distFiles.forEach(file => {
                const dest = `${remotePath}/${file.remote}`;

                sftp.fastPut(file.local, dest, (err) => {
                    uploaded++;

                    if (err) {
                        errors++;
                        console.error(`  ❌ ${file.remote}`);
                    } else {
                        process.stdout.write('.');
                    }

                    if (uploaded === distFiles.length) {
                        console.log(`\n\n✅ Upload complete! (${uploaded - errors}/${uploaded} successful)`);

                        if (errors > 0) {
                            console.log(`⚠️  ${errors} files failed`);
                        }

                        conn.end();
                    }
                });
            });
        });
    });
}).on('error', (err) => {
    console.error('❌ Connection error:', err.message);
}).connect({
    host: '103.82.193.18',
    port: 22,
    username: 'root',
    password: '2wgqsmEecBHYyQbP'
});
