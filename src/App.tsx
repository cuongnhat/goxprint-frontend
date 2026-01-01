import React, { useState, useEffect, useCallback } from 'react';
import {
    Monitor, Wifi, WifiOff, Printer, Download,
    RefreshCw, CheckCircle2, Globe,
    Lock, Users, Play, KeyRound, LogIn
} from 'lucide-react';

// ==================== TYPES ====================
interface Device {
    id: string;
    connectionCode: string;
    hostname: string;
    os: string;
    ip: string;
    subnet?: string;
    gateway?: string;
    printers: string[];
    connectedAt: string;
    isOnline: boolean;
}

interface Driver {
    id: string;
    name: string;
    manufacturer: string;
    models?: string[];
    defaultModel?: string;
}

interface InstallStatus {
    deviceId: string;
    deviceName: string;
    status: 'pending' | 'installing' | 'success' | 'error';
    message: string;
    progress?: number;
}

// ==================== WEBSOCKET HOOK ====================
function useWebSocket(enteredCode: string, onInstallResult?: (result: InstallStatus) => void) {
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [devices, setDevices] = useState<Device[]>([]);

    useEffect(() => {
        // Use relative path - nginx will proxy to backend
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.host;
        const socket = new WebSocket(`${wsProtocol}//${wsHost}/ws`);

        socket.onopen = () => {
            console.log('WebSocket connected');
            setIsConnected(true);
            // Register as admin with the entered code
            socket.send(JSON.stringify({ type: 'admin_connect', connectionCode: enteredCode }));
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('WS Message:', data.type);

            switch (data.type) {
                case 'devices_list':
                    setDevices(data.devices);
                    break;
                case 'device_online':
                    setDevices(prev => [...prev.filter(d => d.id !== data.device.id), data.device]);
                    break;
                case 'device_offline':
                    setDevices(prev => prev.map(d =>
                        d.id === data.deviceId ? { ...d, isOnline: false } : d
                    ));
                    break;
                case 'device_update':
                    setDevices(prev => prev.map(d =>
                        d.id === data.device.id ? data.device : d
                    ));
                    break;
                case 'command_result':
                    // Handle installation result from device
                    if (onInstallResult && data.deviceId) {
                        onInstallResult({
                            deviceId: data.deviceId,
                            deviceName: data.deviceName || data.deviceId,
                            status: data.success ? 'success' : 'error',
                            message: data.result || (data.success ? 'Cài đặt thành công!' : 'Cài đặt thất bại!')
                        });
                    }
                    break;
                case 'progress':
                    // Handle progress update
                    if (onInstallResult && data.deviceId) {
                        onInstallResult({
                            deviceId: data.deviceId,
                            deviceName: data.deviceName || data.deviceId,
                            status: 'installing',
                            message: data.status || 'Đang cài đặt...',
                            progress: data.progress
                        });
                    }
                    break;
            }
        };

        socket.onclose = () => {
            console.log('WebSocket disconnected');
            setIsConnected(false);
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        setWs(socket);

        return () => {
            socket.close();
        };
    }, [enteredCode, onInstallResult]);

    const sendCommand = useCallback((targetDeviceId: string, command: string, params: any) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'command',
                targetDeviceId,
                command,
                params
            }));
            return true;
        }
        return false;
    }, [ws]);

    return { isConnected, devices, sendCommand };
}

// ==================== CODE ENTRY SCREEN ====================
function CodeEntryScreen({ onSubmit }: { onSubmit: (code: string) => void }) {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [toolInfo, setToolInfo] = useState<{ toolName: string, toolVersion: string, downloadUrl: string, hasDownload: boolean } | null>(null);
    const [dailyPin, setDailyPin] = useState<{ pin: string, date: string, expiresAt: string } | null>(null);

    // Fetch tool download info and daily PIN on mount
    useEffect(() => {
        // Fetch tool info
        fetch('/api/tool-download')
            .then(res => res.json())
            .then(data => setToolInfo(data))
            .catch(() => setToolInfo(null));

        // Fetch daily PIN
        fetch('/api/daily-pin')
            .then(res => res.json())
            .then(data => setDailyPin(data))
            .catch(() => setDailyPin(null));
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (code.length !== 6 || !/^\d+$/.test(code)) {
            setError('Mã kết nối phải là 6 chữ số!');
            return;
        }
        onSubmit(code);
    };

    return (
        <div className="code-entry-screen">
            <div className="code-entry-card">
                <div className="code-entry-header">
                    <Globe size={48} className="code-entry-icon" />
                    <h1>GoXPrint Remote Control</h1>
                    <p>Nhập mã kết nối để điều khiển từ xa</p>
                </div>

                <form onSubmit={handleSubmit} className="code-entry-form">
                    <div className="code-input-wrapper">
                        <KeyRound size={20} />
                        <input
                            type="text"
                            maxLength={6}
                            placeholder="______"
                            value={code}
                            onChange={e => {
                                setCode(e.target.value.replace(/\D/g, ''));
                                setError('');
                            }}
                            className="code-input"
                            autoFocus
                        />
                    </div>

                    {error && <div className="code-error">{error}</div>}

                    <button type="submit" className="btn btn-primary btn-lg code-submit-btn">
                        <LogIn size={18} />
                        Kết nối
                    </button>
                </form>

                {/* Daily PIN Display */}
                {dailyPin && (
                    <div className="daily-pin-section">
                        <div className="daily-pin-label">🔐 Mã PIN hôm nay</div>
                        <div className="daily-pin-code">{dailyPin.pin}</div>
                        <div className="daily-pin-date">Ngày: {dailyPin.date}</div>
                        <div className="daily-pin-hint">Nhập mã này để mở phần mềm GoXTool</div>
                    </div>
                )}

                {/* Download Tool Button - Always show with default URL */}
                <a
                    href={toolInfo?.downloadUrl || 'https://github.com/AIforbetty/goxtool/releases'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="download-tool-btn"
                >
                    <Download size={18} />
                    <span>Tải {toolInfo?.toolName || 'GoXTool'} {toolInfo?.toolVersion ? `v${toolInfo.toolVersion}` : ''}</span>
                </a>

                <div className="code-entry-footer">
                    <Lock size={14} />
                    Mã kết nối được hiển thị trên ứng dụng GoXPrint
                </div>
            </div>
        </div>
    );
}

// ==================== MAIN DASHBOARD ====================
function Dashboard({ connectionCode }: { connectionCode: string }) {
    // Installation status tracking
    const [installStatuses, setInstallStatuses] = useState<Map<string, InstallStatus>>(new Map());
    const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

    // Callback to handle install results
    const handleInstallResult = useCallback((result: InstallStatus) => {
        setInstallStatuses(prev => {
            const newMap = new Map(prev);
            newMap.set(result.deviceId, result);
            return newMap;
        });

        // Show notification for final results
        if (result.status === 'success') {
            setNotification({ type: 'success', message: `✅ ${result.deviceName}: ${result.message}` });
        } else if (result.status === 'error') {
            setNotification({ type: 'error', message: `❌ ${result.deviceName}: ${result.message}` });
        }
    }, []);

    const { isConnected, devices, sendCommand } = useWebSocket(connectionCode, handleInstallResult);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
    const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
    const [printerName, setPrinterName] = useState('');
    const [printerIP, setPrinterIP] = useState('');
    const [printerPort, setPrinterPort] = useState('9100');
    const [installing, setInstalling] = useState(false);
    const [activeTab, setActiveTab] = useState<'devices' | 'install'>('devices');

    // Post-install options
    const [openPropertiesAfterInstall, setOpenPropertiesAfterInstall] = useState(true);
    const [printTestPageAfterInstall, setPrintTestPageAfterInstall] = useState(false);

    // Custom driver upload
    const [customDriverFile, setCustomDriverFile] = useState<File | null>(null);
    const [uploadingDriver, setUploadingDriver] = useState(false);
    const [customDriverId, setCustomDriverId] = useState<string | null>(null);

    // Filter devices by the entered connection code
    const filteredDevices = devices.filter(d => d.connectionCode === connectionCode);
    const onlineCount = filteredDevices.filter(d => d.isOnline).length;

    // Get first selected device for network info display
    const firstSelectedDevice = filteredDevices.find(d => selectedDevices.has(d.id));

    // Clear notification after 5 seconds
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Fetch drivers
    useEffect(() => {
        fetch('/api/drivers')
            .then(res => res.json())
            .then(data => setDrivers(data))
            .catch(err => console.error('Failed to fetch drivers:', err));
    }, []);

    // Toggle device selection
    const toggleDevice = (deviceId: string) => {
        const newSelected = new Set(selectedDevices);
        if (newSelected.has(deviceId)) {
            newSelected.delete(deviceId);
        } else {
            newSelected.add(deviceId);
        }
        setSelectedDevices(newSelected);
    };

    // Select all online devices
    const selectAll = () => {
        const newSelected = new Set(selectedDevices);
        filteredDevices.forEach(d => {
            if (d.isOnline) newSelected.add(d.id);
        });
        setSelectedDevices(newSelected);
    };

    // Upload custom driver
    const uploadCustomDriver = async () => {
        if (!customDriverFile) return;

        setUploadingDriver(true);
        try {
            const formData = new FormData();
            formData.append('driver', customDriverFile);
            formData.append('temporary', 'true'); // Mark as temporary (auto-delete after 1 hour)

            const response = await fetch('/api/drivers/upload-temp', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                setCustomDriverId(data.id);
                // Add to drivers list temporarily
                setDrivers(prev => [...prev, {
                    id: data.id,
                    name: customDriverFile.name.replace('.zip', ''),
                    manufacturer: 'Custom',
                    defaultModel: data.defaultModel || 'Custom Driver'
                }]);
                setSelectedDriver({
                    id: data.id,
                    name: customDriverFile.name.replace('.zip', ''),
                    manufacturer: 'Custom',
                    defaultModel: data.defaultModel || 'Custom Driver'
                });
                alert('✅ Upload driver thành công! Driver sẽ tự động xóa sau 1 giờ.');
            } else {
                alert('❌ Upload thất bại!');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('❌ Lỗi upload: ' + error);
        } finally {
            setUploadingDriver(false);
        }
    };

    // Install printer on selected devices
    const installPrinter = async () => {
        if (!selectedDriver || !printerName || !printerIP || selectedDevices.size === 0) {
            alert('Vui lòng điền đầy đủ thông tin và chọn ít nhất 1 thiết bị!');
            return;
        }

        setInstalling(true);

        // Initialize pending status for all selected devices
        const newStatuses = new Map<string, InstallStatus>();
        selectedDevices.forEach(deviceId => {
            const device = filteredDevices.find(d => d.id === deviceId);
            newStatuses.set(deviceId, {
                deviceId,
                deviceName: device?.hostname || deviceId,
                status: 'pending',
                message: 'Đang gửi lệnh...'
            });
        });
        setInstallStatuses(newStatuses);

        const params = {
            driverId: selectedDriver.id,
            driverName: selectedDriver.name,
            printerName,
            printerIP,
            port: printerPort,
            model: selectedDriver.defaultModel || selectedDriver.name,
            openPropertiesAfterInstall,
            printTestPageAfterInstall
        };

        let sentCount = 0;
        selectedDevices.forEach(deviceId => {
            const sent = sendCommand(deviceId, 'install_printer', params);
            if (sent) sentCount++;
        });

        // Show notification
        setNotification({
            type: 'info',
            message: `📤 Đã gửi lệnh cài đặt đến ${sentCount} thiết bị!`
        });

        // Auto-finish after timeout (will be updated by actual results)
        setTimeout(() => setInstalling(false), 3000);

        // Clear statuses after 30 seconds
        setTimeout(() => setInstallStatuses(new Map()), 30000);
    };

    return (
        <div className="app">
            {/* Header */}
            <header className="header">
                <div className="header-left">
                    <Globe className="header-icon" />
                    <h1>GoXPrint Remote Control</h1>
                </div>
                <div className="header-right">
                    <div className="connection-code-display">
                        <KeyRound size={14} />
                        Mã: <strong>{connectionCode}</strong>
                    </div>
                    <div className={`status-badge ${isConnected ? 'online' : 'offline'}`}>
                        {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </div>
                    <div className="stat-pill">
                        <Users size={14} />
                        {onlineCount} / {filteredDevices.length} Online
                    </div>
                </div>
            </header>

            {/* Notification Toast */}
            {notification && (
                <div className={`notification-toast ${notification.type}`}>
                    {notification.message}
                </div>
            )}

            {/* Installation Status Panel */}
            {installStatuses.size > 0 && (
                <div className="install-status-panel">
                    <div className="status-panel-header">
                        <Printer size={16} />
                        <span>Trạng thái cài đặt</span>
                    </div>
                    <div className="status-list">
                        {Array.from(installStatuses.values()).map(status => (
                            <div key={status.deviceId} className={`status-item ${status.status}`}>
                                <div className="status-device">{status.deviceName}</div>
                                <div className="status-message">
                                    {status.status === 'pending' && '⏳ '}
                                    {status.status === 'installing' && '🔄 '}
                                    {status.status === 'success' && '✅ '}
                                    {status.status === 'error' && '❌ '}
                                    {status.message}
                                </div>
                                {status.progress !== undefined && status.status === 'installing' && (
                                    <div className="status-progress">
                                        <div className="status-progress-bar" style={{ width: `${status.progress}%` }} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="main-content">
                {/* Tab Navigation */}
                <div className="tab-navigation">
                    <button
                        className={`tab-button ${activeTab === 'devices' ? 'active' : ''}`}
                        onClick={() => setActiveTab('devices')}
                    >
                        <Monitor size={18} /> Thiết bị đang kết nối
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'install' ? 'active' : ''}`}
                        onClick={() => setActiveTab('install')}
                    >
                        <Printer size={18} /> Cài đặt máy in từ xa
                    </button>
                </div>

                {/* Tab Content - Devices */}
                {activeTab === 'devices' && (
                    <aside className="sidebar">
                        <div className="sidebar-header">
                            <h2><Monitor size={18} /> Thiết bị đang kết nối</h2>
                        </div>

                        <div className="device-list">
                            {filteredDevices.length === 0 ? (
                                <div className="empty-state">
                                    <WifiOff size={40} />
                                    <p>Chưa có thiết bị nào với mã này</p>
                                    <small>Mở GoXPrint và bấm "Kết nối từ xa"</small>
                                </div>
                            ) : (
                                <div className="device-group">
                                    <div className="group-header">
                                        <span className="connection-code">{connectionCode}</span>
                                        <button
                                            className="btn btn-sm"
                                            onClick={selectAll}
                                            title="Chọn tất cả"
                                        >
                                            <CheckCircle2 size={12} /> Chọn tất cả
                                        </button>
                                    </div>
                                    {filteredDevices.map(device => (
                                        <div
                                            key={device.id}
                                            className={`device-item ${device.isOnline ? 'online' : 'offline'} ${selectedDevices.has(device.id) ? 'selected' : ''}`}
                                            onClick={() => device.isOnline && toggleDevice(device.id)}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedDevices.has(device.id)}
                                                disabled={!device.isOnline}
                                                onChange={() => toggleDevice(device.id)}
                                            />
                                            <div className="device-info">
                                                <div className="device-name">
                                                    {device.isOnline ? <Wifi size={12} className="status-icon online" /> : <WifiOff size={12} className="status-icon offline" />}
                                                    <strong>{device.hostname}</strong>
                                                </div>
                                                <div className="device-ip">
                                                    📍 {device.ip}
                                                </div>
                                                <div className="device-meta">
                                                    🖨️ {device.printers?.length || 0} máy in
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="sidebar-footer">
                            <div className="selected-count">
                                <CheckCircle2 size={14} />
                                {selectedDevices.size} thiết bị đã chọn
                            </div>
                        </div>
                    </aside>
                )}

                {/* Tab Content - Install */}
                {activeTab === 'install' && (
                    <main className="main-panel">
                        <div className="panel-card">
                            <div className="card-header">
                                <h2><Printer size={20} /> Cài đặt máy in từ xa</h2>
                            </div>

                            <div className="form-section">
                                {/* Custom Driver Upload */}
                                <div className="form-group custom-driver-upload">
                                    <label>📤 Upload Driver riêng (tự xóa sau 1 giờ)</label>
                                    <div className="upload-row">
                                        <input
                                            type="file"
                                            accept=".zip"
                                            onChange={e => setCustomDriverFile(e.target.files?.[0] || null)}
                                            className="form-input file-input"
                                        />
                                        <button
                                            className="btn btn-secondary"
                                            onClick={uploadCustomDriver}
                                            disabled={!customDriverFile || uploadingDriver}
                                        >
                                            {uploadingDriver ? '⏳ Đang upload...' : '📤 Upload'}
                                        </button>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Chọn Driver</label>
                                    <select
                                        className="form-input"
                                        value={selectedDriver?.id || ''}
                                        onChange={e => {
                                            const driver = drivers.find(d => d.id === e.target.value);
                                            setSelectedDriver(driver || null);
                                        }}
                                    >
                                        <option value="">-- Chọn driver --</option>
                                        {drivers.map(driver => (
                                            <option key={driver.id} value={driver.id}>
                                                {driver.name} ({driver.manufacturer})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {selectedDriver?.models && selectedDriver.models.length > 0 && (
                                    <div className="form-group">
                                        <label>Model máy in</label>
                                        <select className="form-input" defaultValue={selectedDriver.defaultModel}>
                                            {selectedDriver.models.map((model, i) => (
                                                <option key={i} value={model}>{model}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Tên máy in *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="VD: Máy in tầng 1"
                                            value={printerName}
                                            onChange={e => setPrinterName(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>IP máy in *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="VD: 192.168.1.100"
                                            value={printerIP}
                                            onChange={e => setPrinterIP(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group" style={{ maxWidth: '100px' }}>
                                        <label>Port</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="9100"
                                            value={printerPort}
                                            onChange={e => setPrinterPort(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Post-install Options */}
                                <div className="post-install-options">
                                    <label className="checkbox-option">
                                        <input
                                            type="checkbox"
                                            checked={openPropertiesAfterInstall}
                                            onChange={e => setOpenPropertiesAfterInstall(e.target.checked)}
                                        />
                                        <span>⚙️ Mở cấu hình máy in sau khi cài</span>
                                    </label>
                                    <label className="checkbox-option">
                                        <input
                                            type="checkbox"
                                            checked={printTestPageAfterInstall}
                                            onChange={e => setPrintTestPageAfterInstall(e.target.checked)}
                                        />
                                        <span>🖨️ In trang thử nghiệm tự động</span>
                                    </label>
                                </div>

                                <div className="action-bar">
                                    <button
                                        className="btn btn-primary btn-lg"
                                        onClick={installPrinter}
                                        disabled={installing || selectedDevices.size === 0}
                                    >
                                        {installing ? (
                                            <>
                                                <RefreshCw size={18} className="spin" />
                                                Đang cài đặt...
                                            </>
                                        ) : (
                                            <>
                                                <Play size={18} />
                                                Cài đặt cho {selectedDevices.size} thiết bị
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Info Cards */}
                        <div className="info-grid">
                            <div className="info-card">
                                <div className="info-icon"><KeyRound size={24} /></div>
                                <div className="info-content">
                                    <div className="info-value">{connectionCode}</div>
                                    <div className="info-label">Mã kết nối</div>
                                </div>
                            </div>
                            <div className="info-card">
                                <div className="info-icon"><Monitor size={24} /></div>
                                <div className="info-content">
                                    <div className="info-value">{onlineCount} / {filteredDevices.length}</div>
                                    <div className="info-label">Thiết bị Online</div>
                                </div>
                            </div>
                            <div className="info-card">
                                <div className="info-icon"><Globe size={24} /></div>
                                <div className="info-content">
                                    <div className="info-value" style={{ fontSize: '0.9rem' }}>{firstSelectedDevice?.subnet || '---'}</div>
                                    <div className="info-label">Subnet</div>
                                </div>
                            </div>
                            <div className="info-card">
                                <div className="info-icon"><Wifi size={24} /></div>
                                <div className="info-content">
                                    <div className="info-value" style={{ fontSize: '0.9rem' }}>{firstSelectedDevice?.gateway || '---'}</div>
                                    <div className="info-label">Gateway</div>
                                </div>
                            </div>
                        </div>
                    </main>
                )}
            </div>
        </div>
    );
}

// ==================== MAIN APP ====================
export default function App() {
    const [connectionCode, setConnectionCode] = useState<string | null>(null);

    if (!connectionCode) {
        return <CodeEntryScreen onSubmit={setConnectionCode} />;
    }

    return <Dashboard connectionCode={connectionCode} />;
}
