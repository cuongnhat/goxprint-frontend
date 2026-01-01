import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('📦 Deploying frontend to VPS...\n');

// Create zip of dist folder
console.log('[1/3] Creating archive...');
const output = fs.createWriteStream('dist.zip');
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
    console.log(`✅ Archive created (${archive.pointer()} bytes)\n`);

    // Upload to VPS
    console.log('[2/3] Uploading to VPS...');
    const conn = new Client();

    conn.on('ready', () => {
        conn.sftp((err, sftp) => {
            sftp.fastPut('dist.zip', '/tmp/goxprint-dist.zip', (err) => {
                if (err) {
                    console.error('❌ Upload failed:', err);
                    conn.end();
                    return;
                }

                console.log('✅ Uploaded!\n');
                console.log('[3/3] Extracting and deploying...');

                const deployCmd = `
cd /tmp
unzip -o goxprint-dist.zip -d /opt/goxprint/goxprint-remote/
rm goxprint-dist.zip
echo "Deployment complete"
                `.trim();

                conn.exec(deployCmd, (err, stream) => {
                    stream.on('data', (data) => process.stdout.write(data));
                    stream.on('close', () => {
                        console.log('\n✅ Frontend deployed!');
                        conn.end();

                        // Cleanup
                        fs.unlinkSync('dist.zip');
                    });
                });
            });
        });
    }).connect({
        host: '103.82.193.18',
        port: 22,
        username: 'root',
        password: '2wgqsmEecBHYyQbP'
    });
});

archive.pipe(output);
archive.directory('dist/', false);
archive.finalize();
