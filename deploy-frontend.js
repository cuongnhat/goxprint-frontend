// Deploy goxprint-remote to VPS
import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VPS_IP = '103.82.193.18';
const VPS_USER = 'root';
const VPS_PASS = '2wgqsmEecBHYyQbP';
const REMOTE_PATH = '/opt/goxprint/goxprint-remote/dist';

console.log('🚀 Deploying goxprint-remote frontend...\n');

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH connected!\n');

    console.log('[1/3] Removing old dist folder...');
    conn.exec(`rm -rf ${REMOTE_PATH}/*`, (err, stream) => {
        stream.on('close', () => {
            console.log('✅ Old files removed\n');

            console.log('[2/3] Uploading new build...');
            conn.sftp((err, sftp) => {
                if (err) {
                    console.error('❌ SFTP error:', err);
                    conn.end();
                    return;
                }

                // Upload dist folder
                const localDist = path.join(__dirname, 'dist');
                uploadDirectory(sftp, localDist, REMOTE_PATH, () => {
                    console.log('✅ Upload complete!\n');

                    console.log('[3/3] Verifying deployment...');
                    conn.exec('curl -I http://localhost/ 2>&1 | head -3', (err, stream) => {
                        let output = '';
                        stream.on('data', (data) => output += data);
                        stream.on('close', () => {
                            console.log(output);

                            if (output.includes('200 OK')) {
                                console.log('\n🎉 Deployment successful!');
                                console.log('   Visit: https://goxprint.com');
                            } else {
                                console.log('\n⚠️  Verification inconclusive');
                            }

                            conn.end();
                        });
                    });
                });
            });
        });
    });

}).connect({
    host: VPS_IP,
    port: 22,
    username: VPS_USER,
    password: VPS_PASS
});

function uploadDirectory(sftp, localDir, remoteDir, callback) {
    const files = fs.readdirSync(localDir);
    let pending = files.length;

    if (pending === 0) {
        callback();
        return;
    }

    files.forEach(file => {
        const localPath = path.join(localDir, file);
        const remotePath = `${remoteDir}/${file}`;
        const stat = fs.statSync(localPath);

        if (stat.isDirectory()) {
            sftp.mkdir(remotePath, err => {
                uploadDirectory(sftp, localPath, remotePath, () => {
                    if (--pending === 0) callback();
                });
            });
        } else {
            sftp.fastPut(localPath, remotePath, err => {
                if (err) console.error(`Error uploading ${file}:`, err.message);
                else process.stdout.write('.');
                if (--pending === 0) callback();
            });
        }
    });
}
