const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();

console.log('📦 Deploying frontend...\n');

conn.on('ready', () => {
    console.log('✅ SSH Connected\n');

    const distPath = path.join(__dirname, 'dist');

    conn.exec('rm -rf /opt/goxprint/goxprint-remote/dist && mkdir -p /opt/goxprint/goxprint-remote/dist/assets', (err) => {
        console.log('Cleared remote directory\n');
        console.log('Uploading files...\n');

        conn.sftp((err, sftp) => {
            const files = [
                { local: path.join(distPath, 'index.html'), remote: '/opt/goxprint/goxprint-remote/dist/index.html' }
            ];

            // Add assets
            const assetsDir = path.join(distPath, 'assets');
            if (fs.existsSync(assetsDir)) {
                fs.readdirSync(assetsDir).forEach(file => {
                    files.push({
                        local: path.join(assetsDir, file),
                        remote: `/opt/goxprint/goxprint-remote/dist/assets/${file}`
                    });
                });
            }

            let done = 0;
            console.log(`Uploading ${files.length} files...`);

            files.forEach(f => {
                sftp.fastPut(f.local, f.remote, (err) => {
                    if (err) {
                        console.error(`  ❌ ${path.basename(f.remote)}: ${err.message}`);
                    } else {
                        process.stdout.write('.');
                    }

                    if (++done === files.length) {
                        console.log('\n\n✅ Deployment complete!');
                        console.log('   Visit: https://goxprint.com\n');
                        conn.end();
                    }
                });
            });
        });
    });
}).on('error', (err) => {
    console.error('❌ Connection failed:', err.message);
    console.log('\n💡 Try manual upload:');
    console.log('   scp -r dist/* root@103.82.193.18:/opt/goxprint/goxprint-remote/dist/\n');
}).connect({
    host: '103.82.193.18',
    port: 22,
    username: 'root',
    password: '2wgqsmEecBHYyQbP'
});
