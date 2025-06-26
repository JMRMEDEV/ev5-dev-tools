import dgram from 'dgram';
import { parseArgs } from './common.mjs';
import fs from 'fs';
import path from 'path';

export async function handleWifiUpload(args) {
    const opts = parseArgs(args);
    if (!opts.wiFiUpload || !opts.program || !opts.ip || !opts.code) {
        throw new Error('Missing required arguments');
    }
    await wifiUpload(opts);
}

class WiFiUploader {
    constructor() {
        this.socket = null;
        this.targetIP = null;
        this.targetPort = 28000;
        this.pairingCode = 123456;
        this.isConnected = false;
        this.isDownloading = false;
        this.downloadStep = 0;
        this.pageCount = 0;
        this.pageSum = 0;
        this.binFileData = null;
        this.binFileName = '';
        this.lastCheckSum = 0;
        this.downloadFinish = false;
        this.downloadResendId = null;
        this.startTime = 0;
    }

    async connect(ip, code) {
        return new Promise((resolve, reject) => {
            this.targetIP = ip;
            this.pairingCode = parseInt(code);
            this.socket = dgram.createSocket('udp4');

            this.socket.on('message', (msg, rinfo) => {
                this.handleMessage(msg, rinfo);
            });

            this.socket.on('error', (err) => {
                reject(err);
            });

            this.socket.bind(36803, () => {
                console.log('UDP socket bound to port 36803');
                // Send both pairing code packet and ESP8266 shake hand
                this.sendPairingCodePacket(ip, this.targetPort, this.pairingCode);
                this.sendEsp8266Shakehand(ip, this.targetPort, this.pairingCode);

                setTimeout(() => {
                    if (this.isConnected) {
                        resolve();
                    } else {
                        reject(new Error('Connection timeout'));
                    }
                }, 5000);
            });
        });
    }

    handleMessage(msg, rinfo) {
        console.log(`Received ${msg.length} bytes from ${rinfo.address}:${rinfo.port}`);
        console.log('Data:', Array.from(msg).map(b => b.toString(16).padStart(2, '0')).join(' '));
        try {
            this.parseUDPPacket(rinfo.address, rinfo.port, msg);
        } catch (error) {
            console.error('Error parsing UDP packet:', error);
        }
    }

    parseUDPPacket(srcIP, srcPort, data) {
        if (data.length < 7) return;

        const packetLength = (data[2] << 8) + data[3];
        if (data[0] === 120 && data[1] === 205 && packetLength === data.length && data[data.length - 1] === 190) {
            const cmd1 = data[4];
            const cmd2 = data[5];
            const payload = data.slice(6, data.length - 1);

            console.log(`Packet: cmd1=${cmd1}, cmd2=${cmd2}`);

            // Handle shake hand response
            if ((cmd1 === 221 && cmd2 === 204) || (cmd1 === 1 && cmd2 === 170)) {
                const receivedCode = (payload[0] << 16) + (payload[1] << 8) + payload[2];
                console.log(`Received pairing code: ${receivedCode}, expected: ${this.pairingCode}`);
                if (this.pairingCode === receivedCode) {
                    this.targetIP = srcIP;
                    this.targetPort = srcPort;
                    this.isConnected = true;
                    console.log('Connected successfully to', srcIP);
                }
            }

            // Handle download responses
            if (cmd1 === 3 && cmd2 === 170 && this.isDownloading) {
                this.parseDownloadPacket(payload);
            }

            // Handle regular command responses during download
            if (cmd1 === 255 && cmd2 === 238 && this.isDownloading) {
                console.log('Received command response during download');
                this.parseScratchCmdPacket(payload);
            }
        }
    }

    sendPairingCodePacket(ip, port, code) {
        const packet = Buffer.alloc(10);
        packet[0] = 120; // 0x78
        packet[1] = 205; // 0xCD
        packet[2] = 0;
        packet[3] = 10;
        packet[4] = 204; // 0xCC
        packet[5] = 221; // 0xDD
        packet[6] = code >> 16;
        packet[7] = code >> 8;
        packet[8] = code & 0xFF;
        packet[9] = 190; // 0xBE

        console.log('Sending pairing code packet:', Array.from(packet).map(b => b.toString(16).padStart(2, '0')).join(' '));
        this.socket.send(packet, port, ip, (err) => {
            if (err) console.error('Error sending pairing code packet:', err);
        });
    }

    sendEsp8266Shakehand(ip, port, code) {
        // Get local IP for the packet
        const ipParts = ip.split('.');
        const localIP = [192, 168, parseInt(ipParts[2]), 1]; // Assume local IP pattern

        const packet = Buffer.alloc(14);
        packet[0] = 120; // 0x78
        packet[1] = 205; // 0xCD
        packet[2] = 0;
        packet[3] = 14;
        packet[4] = 170; // 0xAA
        packet[5] = 1;
        packet[6] = code >> 16;
        packet[7] = code >> 8;
        packet[8] = code & 0xFF;
        packet[9] = localIP[0];
        packet[10] = localIP[1];
        packet[11] = localIP[2];
        packet[12] = localIP[3];
        packet[13] = 190; // 0xBE

        console.log('Sending ESP8266 shake hand:', Array.from(packet).map(b => b.toString(16).padStart(2, '0')).join(' '));
        this.socket.send(packet, port, ip, (err) => {
            if (err) console.error('Error sending ESP8266 shake hand:', err);
        });
    }

    parseDownloadPacket(data) {
        if (data.length < 3) return;

        const receivedCode = (data[0] << 16) + (data[1] << 8) + data[2];
        if (this.pairingCode !== receivedCode) return;

        const payload = data.slice(3);
        this.parseDownload_V1(payload);
    }

    parseScratchCmdPacket(data) {
        if (data.length < 3) return;

        const receivedCode = (data[0] << 16) + (data[1] << 8) + data[2];
        if (this.pairingCode !== receivedCode) return;

        const payload = data.slice(3);
        console.log('Command response payload:', Array.from(payload).map(b => b.toString(16).padStart(2, '0')).join(' '));
        this.parseDownload_V1(payload);
    }

    parseDownload_V1(data) {
        console.log('Parsing download response:', Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' '));

        if (data.length < 2) return;

        if (data[0] === 86 && data[1] === 171) {
            const cmd = data[2];
            console.log(`Download command response: ${cmd}`);

            if (cmd === 3) {
                const deviceType = data[3];
                console.log(`Device type: ${deviceType}`);
                this.downloadStep++;
                this.downloadStep_V1();
            }

            if (cmd === 5) {
                const status = data[3];
                console.log(`Download status: ${status}`);
                if (status === 1) {
                    this.downloadStep++;
                    // For step 5 (start download), move directly to data transfer
                    if (this.downloadStep === 6) {
                        console.log('Ready for data transfer');
                    }
                    this.downloadStep_V1();
                } else if (status === 3) {
                    // Ready for data transfer - move to data phase
                    if (this.downloadStep === 5) {
                        this.downloadStep = 6;
                        // Add 100ms delay before starting data transfer
                        setTimeout(() => {
                            this.downloadStep_V1();
                        }, 100);
                        return;
                    }
                    this.downloadStep_V1();
                } else if (status === 4) {
                    const checkSum = data[4];
                    console.log(`Received checksum: ${checkSum}, expected: ${this.lastCheckSum}`);
                    if (checkSum === this.lastCheckSum) {
                        this.pageCount++;
                        console.log(`Page ${this.pageCount - 1} acknowledged, moving to page ${this.pageCount}`);
                    }
                    // Continue with next data packet
                    this.downloadStep_V1();
                }
            }
        }
    }

    buildDownloadPacket(data) {
        const packet = Buffer.alloc(data.length + 7);
        packet[0] = 120; // 0x78
        packet[1] = 205; // 0xCD
        packet[2] = (packet.length >> 8) & 0xFF;
        packet[3] = packet.length & 0xFF;
        packet[4] = 238; // 0xEE
        packet[5] = 255; // 0xFF
        data.copy(packet, 6);
        packet[packet.length - 1] = 190; // 0xBE

        return packet;
    }

    send(data) {
        // Prepend pairing code to data
        const fullData = Buffer.alloc(data.length + 3);
        fullData[0] = this.pairingCode >> 16;
        fullData[1] = this.pairingCode >> 8;
        fullData[2] = this.pairingCode & 0xFF;
        data.copy(fullData, 3);

        const packet = this.buildDownloadPacket(fullData);
        console.log('Sending packet:', Array.from(packet).map(b => b.toString(16).padStart(2, '0')).join(' '));
        this.socket.send(packet, this.targetPort, this.targetIP, (err) => {
            if (err) console.error('Error sending data:', err);
        });
    }

    sendDataPacket(data) {
        // For file data, use download protocol [0xAA, 0x03]
        const fullData = Buffer.alloc(data.length + 3);
        fullData[0] = this.pairingCode >> 16;
        fullData[1] = this.pairingCode >> 8;
        fullData[2] = this.pairingCode & 0xFF;
        data.copy(fullData, 3);

        const packet = Buffer.alloc(fullData.length + 7);
        packet[0] = 120; // 0x78
        packet[1] = 205; // 0xCD
        packet[2] = (packet.length >> 8) & 0xFF;
        packet[3] = packet.length & 0xFF;
        packet[4] = 170; // 0xAA
        packet[5] = 3;   // 0x03
        fullData.copy(packet, 6);
        packet[packet.length - 1] = 190; // 0xBE

        console.log('Sending data packet:', Array.from(packet).map(b => b.toString(16).padStart(2, '0')).join(' '));
        this.socket.send(packet, this.targetPort, this.targetIP, (err) => {
            if (err) console.error('Error sending data packet:', err);
        });
    }

    async startDownload(filePath) {
        if (!this.isConnected) {
            throw new Error('Not connected to device');
        }

        if (!fs.existsSync(filePath)) {
            throw new Error('File does not exist');
        }

        this.binFileData = fs.readFileSync(filePath);
        this.binFileName = path.basename(filePath);
        this.isDownloading = true;
        this.downloadFinish = false;
        this.downloadStep = 0;
        this.pageCount = 0;
        this.pageSum = Math.ceil(this.binFileData.length / 1024);
        this.startTime = Date.now();

        console.log(`Starting download: ${this.binFileName}`);
        console.log(`File size: ${this.binFileData.length} bytes`);
        console.log(`Pages: ${this.pageSum}`);

        // Call WiFiDownloadToUserSpace before starting download steps
        this.wiFiDownloadToUserSpace();
        this.wiFiDownloadToUserSpace();
        this.downloadStep_V1();
    }

    downloadStep_V1() {
        if (this.downloadResendId) {
            clearTimeout(this.downloadResendId);
        }

        if (this.downloadStep === 0) {
            console.log('Getting RCU type...');
            this.getRCUType();
        } else if (this.downloadStep === 1) {
            console.log('Sending file name...');
            this.setFileName(this.binFileName);
        } else if (this.downloadStep === 2) {
            console.log('Sending file date...');
            this.setFileDate();
        } else if (this.downloadStep === 3) {
            console.log('Sending page size...');
            this.setPageSize(1024);
        } else if (this.downloadStep === 4) {
            console.log('Sending page sum...');
            this.setPageSum(this.pageSum);
        } else if (this.downloadStep === 5) {
            console.log('Starting download...');
            this.setStartDownload_V1();
        } else if (this.downloadStep === 6) {
            console.log(`Sending file data... ${Math.floor(this.pageCount / this.pageSum * 100)}%`);
            this.sendFileData_V1(this.pageCount);
        }

        // Only set timeout for non-data transfer steps
        if (this.downloadStep < 6) {
            this.downloadResendId = setTimeout(() => {
                this.downloadStep_V1();
            }, 1000);
        }

        if (this.downloadFinish) {
            console.log('Download finished!');
            this.downloadComplete();
        }
    }

    wiFiDownloadToUserSpace() {
        const data = Buffer.alloc(6);
        data[0] = 86;  // 0x56
        data[1] = 171; // 0xAB
        data[2] = 6;
        data[3] = 254; // 0xFE
        data[4] = 0;
        data[5] = 0;
        this.send(data);
    }

    getRCUType() {
        const data = Buffer.alloc(13);
        data[0] = 86;  // 0x56
        data[1] = 171; // 0xAB
        data[2] = 2;
        data.writeUInt32BE(0, 3);
        data.writeUInt32BE(0, 7);
        data[11] = 2;   // checksum
        data[12] = 207; // 0xCF
        this.send(data);
    }

    setFileName(fileName) {
        if (fileName.includes('.bin')) {
            fileName = fileName.substring(0, fileName.indexOf('.bin'));
        }

        const nameBuffer = Buffer.alloc(8, 32); // Fill with spaces (32)
        Buffer.from(fileName, 'ascii').copy(nameBuffer, 0, 0, Math.min(fileName.length, 8));

        let checksum = 7;
        for (let i = 0; i < nameBuffer.length; i++) {
            checksum += nameBuffer[i];
        }

        const data = Buffer.alloc(13);
        data[0] = 86;  // 0x56
        data[1] = 171; // 0xAB
        data[2] = 7;
        nameBuffer.copy(data, 3);
        data[11] = checksum & 0xFF;
        data[12] = 207; // 0xCF

        this.send(data);
    }

    setFileDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const hour = now.getHours();
        const minute = now.getMinutes();

        const time = (hour << 11) | (minute << 5);
        const date = ((year - 1980) << 9) | (month << 5) | day;

        const data = Buffer.alloc(13);
        data[0] = 86;  // 0x56
        data[1] = 171; // 0xAB
        data[2] = 8;
        data.writeUInt16LE(time, 3);
        data.writeUInt16LE(date, 5);
        data.writeUInt32LE(0, 7);
        data[11] = (8 + data[3] + data[4] + data[5] + data[6]) & 0xFF;
        data[12] = 207; // 0xCF

        this.send(data);
    }

    setPageSize(size) {
        const low = size & 0xFF;
        const high = (size >> 8) & 0xFF;

        const data = Buffer.alloc(13);
        data[0] = 86;  // 0x56
        data[1] = 171; // 0xAB
        data[2] = 9;
        data[3] = low;
        data[4] = high;
        data.writeUInt16BE(0, 5);
        data.writeUInt32BE(0, 7);
        data[11] = (low + high + 9) & 0xFF;
        data[12] = 207; // 0xCF

        this.send(data);
    }

    setPageSum(sum) {
        const checksum = (sum + (sum >> 8) + 6) & 0xFF;

        const data = Buffer.alloc(13);
        data[0] = 86;  // 0x56
        data[1] = 171; // 0xAB
        data[2] = 6;
        data[3] = sum & 0xFF;
        data[4] = (sum >> 8) & 0xFF;
        data.writeUInt16BE(0, 5);
        data.writeUInt32BE(0, 7);
        data[11] = checksum;
        data[12] = 207; // 0xCF

        this.send(data);
    }

    setStartDownload_V1() {
        const data = Buffer.alloc(13);
        data[0] = 86;  // 0x56
        data[1] = 171; // 0xAB
        data[2] = 4;
        data.writeUInt32BE(0, 3);
        data.writeUInt32BE(0, 7);
        data[11] = 4;   // checksum
        data[12] = 207; // 0xCF

        this.send(data);
    }

    sendFileData_V1(pageIndex) {
        if (pageIndex >= this.pageSum) {
            this.downloadFinish = true;
            return;
        }

        const pageSize = 1024;
        const offset = pageSize * pageIndex;
        const isLastPage = pageIndex === this.pageSum - 1;

        const pageData = Buffer.alloc(pageSize);
        if (isLastPage) {
            this.binFileData.copy(pageData, 0, offset);
        } else {
            this.binFileData.copy(pageData, 0, offset, offset + pageSize);
        }

        let checksum = 0;
        for (let i = 0; i < pageData.length; i++) {
            checksum += pageData[i];
        }
        this.lastCheckSum = checksum & 0xFF;

        const low = pageIndex & 0xFF;
        const high = (pageIndex >> 8) & 0xFF;
        checksum = (checksum + low + high) & 0xFF;

        const data = Buffer.alloc(1029);
        data[0] = 86;  // 0x56
        data[1] = 171; // 0xAB
        data[2] = low;
        data[3] = high;
        pageData.copy(data, 4);
        data[1027] = checksum & 0xFF;
        data[1028] = 207; // 0xCF

        this.sendDataPacket(data);
    }

    downloadComplete() {
        if (this.downloadResendId) {
            clearTimeout(this.downloadResendId);
        }

        this.isDownloading = false;
        this.downloadFinish = false;
        this.downloadStep = 0;

        const duration = Date.now() - this.startTime;
        console.log(`Download completed in ${Math.floor(duration / 1000)} seconds`);
    }

    close() {
        if (this.socket) {
            this.socket.close();
        }
        if (this.downloadResendId) {
            clearTimeout(this.downloadResendId);
        }
    }
}

async function wifiUpload(opts) {
    const uploader = new WiFiUploader();

    try {
        console.log(`Connecting to ${opts.ip} with pairing code ${opts.code}...`);
        await uploader.connect(opts.ip, opts.code);

        console.log('Connected! Starting file upload...');
        await uploader.startDownload(`${opts.program}.bin`);

        return new Promise((resolve, reject) => {
            const checkComplete = () => {
                if (uploader.downloadFinish || !uploader.isDownloading) {
                    uploader.close();
                    resolve();
                } else {
                    setTimeout(checkComplete, 1000);
                }
            };
            checkComplete();

            setTimeout(() => {
                uploader.close();
                reject(new Error('Upload timeout'));
            }, 300000);
        });

    } catch (error) {
        uploader.close();
        throw error;
    }
}