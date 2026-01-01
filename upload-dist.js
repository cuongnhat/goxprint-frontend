import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('📤 Uploading dist folder...\n');

const conn = new Client();
let uploadedFiles = 0;

conn.on('ready', () => {
    console.log('✅ Connected\n');

    conn.sftp((err, sftp) => {
        // Upload all files from dist
        const distPath = path.join(__dirname, 'dist');
        const remotePath = '/opt/goxprint/goxprint-remote/dist';

        // Clear old files first
        conn.exec(`rm -rf ${remotePath}/* && mkdir -p ${remotePath}`, (err) => {
            console.log('Cleared old files\n');

            // Upload index.html
            const files = ['index.html'];
            const assetsDir = path.join(distPath, 'assets');

            if (fs.existsSync(assetsDir)) {
                fs.readdirSync(assetsDir).forEach(file => {
                    files.push(`assets/${file}`);
                });
            }

            // Create assets dir
            sftp.mkdir(`${remotePath}/assets`, (err) => {
                console.log(`Uploading ${files.length} files...\n`);

                files.forEach(file => {
                    const local = path.join(distPath, file);
                    const remote = `${remotePath}/${file}`;

                    sftp.fastPut(local, remote, (err) => {
                        if (err) {
                            console.error(`❌ ${file}:`, err.message);
                        } else {
                            uploadedFiles++;
                            process.stdout.write('.');

                            if (uploadedFiles === files.length) {
                                console.log(`\n\n✅ Uploaded ${upload edFiles} files!`);
                                conn.end();
                            }
                        }
                    });
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
