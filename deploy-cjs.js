const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

console.log('📦 Deploying frontend to VPS...\n');

const distPath = path.join(__dirname, 'dist');
const files = [];

function getFiles(dir, prefix = '') {
    fs.readdirSync(dir).forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            getFiles(fullPath, prefix + item + '/');
        } else {
            files.push({ local: fullPath, remote: prefix + item });
        }
    });
}

getFiles(distPath);

console.log(`Found ${files.length} files\n`);

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ Connected\n');

    conn.sftp((err, sftp) => {
        const remotePath = '/opt/goxprint/goxprint-remote/dist';

        conn.exec(`rm -rf ${remotePath} && mkdir -p ${remotePath}/assets`, (err) => {
            console.log('Uploading...\n');

            let done = 0;
            files.forEach(f => {
                sftp.fastPut(f.local, `${remotePath}/${f.remote}`, (err) => {
                    if (err) console.error(`  ❌ ${f.remote}`);
                    else process.stdout.write('.');

                    if (++done === files.length) {
                        console.log(`\n\n✅ Deployed!`);
                        conn.end();
                    }
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
