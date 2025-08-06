# Interview Audio Capture - Chrome Extension

A Manifest V3 Chrome extension that captures audio from video conferencing websites and sends it to the Interview Copilot backend for real-time transcription and AI analysis.

## 📁 Files Structure

```
extension/
├── manifest.json          # Manifest V3 configuration
├── background.js          # Service worker (background script)
├── content-script.js      # Content script for audio capture
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── options.html          # Settings/options page
├── options.js            # Options page functionality
├── icons/                # Extension icons (16, 32, 48, 128px)
└── README.md            # This file
```

## 🚀 Installation

### Developer Mode (Recommended for Testing)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `extension` folder from this project
5. The extension will appear in your toolbar

### Production Installation

1. Package the extension: `zip -r interview-capture.zip extension/`
2. Upload to Chrome Web Store Developer Dashboard
3. Follow Chrome Web Store review process

## 🎯 Supported Websites

The extension automatically activates on these video conferencing platforms:

- **Google Meet** (`meet.google.com`)
- **Zoom** (`zoom.us`, `*.zoom.us`)
- **Microsoft Teams** (`teams.microsoft.com`, `*.teams.microsoft.com`)
- **Cisco WebEx** (`*.webex.com`)
- **GoToMeeting** (`*.gotomeeting.com`)
- **Whereby** (`*.whereby.com`)
- **Discord** (`*.discord.com`)

## ⚙️ Features

### Manifest V3 Compliance
- ✅ Service Worker background script
- ✅ Declarative content scripts
- ✅ Host permissions model
- ✅ Action API (replaces browser action)
- ✅ Storage API for settings
- ✅ Commands API for keyboard shortcuts

### Audio Capture
- 🎤 Real-time microphone access
- 📡 WebSocket streaming to backend
- 🔄 Automatic reconnection
- 📤 HTTP fallback for audio upload
- 🎛️ Audio quality controls (noise suppression, echo cancellation)

### User Interface
- 🎮 Floating control panel
- 📊 Real-time status indicators
- 🎨 Draggable and customizable UI
- 🔔 Desktop notifications
- ⌨️ Keyboard shortcuts

### Settings & Configuration
- 🛠️ Backend URL configuration
- 🎚️ Audio capture settings
- 🎯 Auto-injection controls
- 📈 Usage statistics
- 💾 Import/export settings

## 🛠️ Configuration

### Backend Integration

The extension connects to your Interview Copilot backend:

```javascript
// Default configuration
{
  backendUrl: 'http://localhost:3000',
  wsUrl: 'ws://localhost:3000',
  captureInterval: 3000
}
```

### Audio Settings

```javascript
// Audio capture configuration
{
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 16000
}
```

## 🎮 Usage

### Basic Operation

1. **Install** the extension
2. **Visit** a supported video conferencing site
3. **Grant** microphone permissions when prompted
4. **Click** the extension icon or use the floating panel
5. **Start** recording with the record button
6. **Monitor** real-time transcription and AI suggestions

### Keyboard Shortcuts

- **Ctrl+Shift+R** (⌘+Shift+R on Mac) - Start recording
- **Ctrl+Shift+S** (⌘+Shift+S on Mac) - Stop recording  
- **Ctrl+Shift+T** (⌘+Shift+T on Mac) - Toggle recording

### Settings Access

- Click extension icon → Settings
- Or right-click on extension icon → Options
- Or visit `chrome://extensions/` → Extension details → Extension options

## 📡 Communication Flow

```
Web Page → Content Script → Background Script → Backend Server
                                     ↓
                          Storage API + WebSocket
                                     ↓
                            AI Analysis + Transcription
```

### Message Types

**From Content Script to Background:**
- `audio-captured` - Audio data ready
- `capture-status` - Recording state changes
- `get-settings` - Request current settings

**From Background to Content Script:**
- `interview-capture-command` - Control commands (start/stop/toggle)
- `settings-updated` - New configuration

**To Backend Server:**
- `audio-chunk` - Audio data for processing
- `session-start` - New recording session
- `session-end` - Recording completed

## 🔒 Permissions

### Required Permissions

- **`activeTab`** - Access current tab for script injection
- **`scripting`** - Inject content scripts dynamically
- **`storage`** - Save settings and statistics
- **`alarms`** - Periodic cleanup tasks
- **`notifications`** - Desktop notifications

### Host Permissions

- **`http://localhost:3000/*`** - Local backend access
- **Video conferencing sites** - For content script injection

### User Permissions

- **Microphone access** - Requested at runtime via getUserMedia()

## 🐛 Debugging

### Enable Debug Mode

1. Open `chrome://extensions/`
2. Find "Interview Audio Capture"
3. Click "Details"
4. Enable "Collect errors"
5. Check "Service worker" logs

### Common Issues

**Content Script Not Injecting:**
- Check site permissions
- Verify manifest content_scripts matches
- Try manual injection via popup

**WebSocket Connection Failed:**
- Verify backend server is running
- Check CORS settings
- Test connection in options page

**Microphone Access Denied:**
- Check browser permissions
- Reset site permissions
- Try incognito mode

**Audio Not Recording:**
- Check WebRTC settings
- Verify audio device selection
- Test microphone in other applications

## 🔄 Development

### Testing Locally

```bash
# Start the backend server
node server-socketio.js

# Load extension in Chrome
# 1. chrome://extensions/
# 2. Developer mode ON
# 3. Load unpacked → select extension folder

# Test on supported sites
# Visit meet.google.com, zoom.us, etc.
```

### Building for Production

```bash
# Create zip package
cd extension
zip -r ../interview-capture-extension.zip . -x "*.DS_Store" "*/.*"

# Or use build script
npm run build:extension
```

### Version Management

Update version in `manifest.json`:
```json
{
  "version": "1.0.1",
  "version_name": "1.0.1 Beta"
}
```

## 📊 Analytics & Privacy

### Data Collection

- **Audio data** - Sent to your local backend only
- **Usage statistics** - Stored locally in extension
- **Settings** - Stored in Chrome storage API
- **No external tracking** - Privacy-focused design

### Privacy Controls

- Audio processing happens on your server
- No data sent to third parties
- Local storage only
- User controls all settings

## 🚀 Future Enhancements

- [ ] Multi-language transcription support
- [ ] Custom audio filters and effects
- [ ] Advanced AI analysis features
- [ ] Integration with calendar apps
- [ ] Session recording and playback
- [ ] Team collaboration features

## 📝 License

This extension is part of the Interview Copilot project and follows the same license terms.
