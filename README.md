[![Version](https://img.shields.io/badge/version-2.3.3-blue.svg)](https://github.com/rikkeisoft/automation-test-execution)
[![License](https://img.shields.io/badge/license-PolyForm%20Noncommercial-lightgrey.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/electron-38.1.2-47848F.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/react-19.2.3-61DAFB.svg)](https://reactjs.org/)

<a href="https://automation-test.rikkei.org" style="text-decoration: none; display: block;">
  <div style="
    background: linear-gradient(135deg, #ffffff 0%, #ffffff 10%, #f8fafc 20%, #f0f9ff 35%, #e0f2fe 60%, #bae6fd 85%, #7dd3fc 100%);
    width: calc(100% + 100px);
    padding: 60px 30px;
    margin: 30px -50px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s, box-shadow 0.2s;
    cursor: pointer;
    text-align: center;
  " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 12px rgba(0, 0, 0, 0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px rgba(0, 0, 0, 0.1)'">
    <h2 class="hero-title" style="
      color: #0c4a6e;
      font-size: 36px;
      font-weight: 700;
      margin: 0 0 20px 0;
      line-height: 1.3;
    ">Optimize software testing processes with <span style="color: #0284c7;">Rinos</span></h2>
    <p class="hero-subtitle" style="
      color: #075985;
      font-size: 18px;
      font-weight: 400;
      margin: 0;
      line-height: 1.6;
    ">Enterprise-ready automated testing solution, seamlessly integrated into CI/CD processes.</p>
  </div>
</a>

> An Electron-based desktop application for automated testing with browser automation, database connections, and comprehensive test case management.

**Rinos** is a powerful desktop application that enables teams to create, manage, and execute automated test cases. Built with Electron and React, it provides a modern, cross-platform solution for test automation with support for browser automation, database testing, API requests, and more.

## Features

- **🎯 Test Case Recording & Execution**
  - Record browser interactions automatically
  - Execute test cases with Playwright
  - Support for multiple browsers (Chromium, Firefox, Edge)

- **🌐 Browser Automation**
  - Powered by Playwright 1.56.0
  - Cross-browser testing support
  - Browser storage management (cookies, localStorage, sessionStorage)
  - Custom browser variable management

- **💾 Database Connections**
  - Support for multiple database types:
    - MySQL
    - PostgreSQL
    - Microsoft SQL Server (MSSQL)
  - Test database connections
  - Execute SQL queries
  - Database-driven testing

- **📦 Test Suite Management**
  - Organize test cases into suites
  - Suite execution and scheduling
  - Test result tracking

- **🔧 Variables & Configuration**
  - Global and project-level variables
  - Dynamic variable substitution
  - Environment-specific configurations

- **🌐 API Request Testing**
  - Make HTTP requests within test cases
  - Test API endpoints
  - Validate API responses

- **🔐 Microsoft Authentication**
  - Microsoft Azure AD (MSAL) integration
  - Single Sign-On (SSO) support
  - Secure token management

- **📝 Code Editor**
  - Monaco Editor integration
  - Syntax highlighting
  - Test script editing and validation

## Tech Stack

- **Framework**: Electron 38.1.2
- **UI Library**: React 19.2.3
- **Language**: TypeScript 5.9.2
- **Build Tool**: Vite 6.3.6
- **Bundler**: esbuild 0.23.1
- **Testing**: Playwright 1.56.0
- **Authentication**: @azure/msal-node 3.7.4
- **Database Drivers**:
  - mysql2 3.16.0
  - pg 8.16.3
  - mssql 12.2.0

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 18.x or higher (recommended: LTS version)
- **npm**: Version 9.x or higher (comes with Node.js)
- **Git**: For cloning the repository

### System Requirements

- **Windows**: Windows 10 or later
- **macOS**: macOS 10.15 or later
- **Linux**: Ubuntu 18.04 or later, or equivalent distribution

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd rikkei-automation-test-script-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory based on `.env_example`:

```bash
cp .env_example .env
```

Edit the `.env` file with your configuration:

```env
VITE_DEV_SERVER_URL=
VITE_MSAL_CLIENT_ID=your-client-id
VITE_MSAL_TENANT_ID=your-tenant-id
VITE_MSAL_REDIRECT_URI=https://login.microsoftonline.com/common/oauth2/nativeclient
VITE_MSAL_SCOPES=openid profile email
VITE_DEBUG_MSAL=false
VITE_API_BASE_URL=http://testscripts.rikkei.org
VITE_API_TIMEOUT=30000
VITE_API_RETRY_ATTEMPTS=3
VITE_ACCESS_TOKEN_KEY=access_token
VITE_USER_DATA_KEY=user_data
VITE_REFRESH_TOKEN_KEY=refresh_token
```

### 4. Install Playwright Browsers

Playwright browsers are installed automatically when you run the application for the first time. However, you can also install them manually:

**Windows:**
```powershell
.\install.ps1
```

**Linux/macOS:**
```bash
npx playwright install chromium --with-deps
```

## Development

### Start Development Server

```bash
npm run dev
```

This command will:
- Start the Vite development server
- Watch and rebuild the main process
- Watch and rebuild the preload script
- Launch the Electron application

### Development with Detailed Logs

```bash
npm run dev:logs
```

This provides more verbose logging for debugging.

### Build for Production

```bash
npm run build
```

This builds all components:
- Main process (`dist/main.cjs`)
- Preload script (`dist/preload.cjs`)
- Renderer process (`dist/renderer/`)

### Run Production Build

```bash
npm run start:prod
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run dev:logs` | Start development with detailed logging |
| `npm run build` | Build all components for production |
| `npm run build:main` | Build only the main process |
| `npm run build:preload` | Build only the preload script |
| `npm run build:renderer` | Build only the renderer process |
| `npm run start:prod` | Run production build locally |
| `npm run dist` | Build and package for all platforms |
| `npm run dist:win` | Build Windows installer |
| `npm run dist:linux` | Build Linux packages |
| `npm run dist:mac` | Build macOS packages |
| `npm test` | Run Electron app (testing) |

## Building for Distribution

### Windows

**NSIS Installer:**
```bash
npm run dist:win-nsis
```

**Portable Version:**
```bash
npm run dist:win-portable
```

**All Windows Targets:**
```bash
npm run dist:win
```

Output files will be in the `release/` directory:
- `Rinos-win-x64-2.3.3.exe` (NSIS)
- `Rinos-portable-x64-2.3.3.exe` (Portable)

### Linux

**AppImage:**
```bash
npm run dist:linux-appimage
```

**DEB Package:**
```bash
npm run dist:linux-deb
```

**Snap Package:**
```bash
npm run dist:linux-snap
```

**All Linux Targets:**
```bash
npm run dist:linux
```

Output files:
- `Rinos-linux-x86_64-2.3.3.AppImage`
- `Rinos-linux-amd64-2.3.3.deb`
- `Rinos-linux-x86_64-2.3.3.snap`

### macOS

**Standard Build:**
```bash
npm run dist:mac
```

**Universal Build (x64 + arm64):**
```bash
npm run dist:mac-universal
```

Output files:
- `Rinos-mac-x64-2.3.3.dmg`
- `Rinos-mac-arm64-2.3.3.dmg`
- `Rinos-mac-x64-2.3.3.zip`
- `Rinos-mac-arm64-2.3.3.zip`

### Code Signing (macOS)

For macOS distribution, code signing is required. Use the provided `sign.sh` script:

1. Create a `.env.production` file with your signing identity:
```bash
SIGN_ID="Developer ID Application: Your Name (TEAM_ID)"
```

2. Run the signing script:
```bash
./sign.sh
```

The script will sign all executables, frameworks, and the app bundle for both x64 and arm64 architectures.

## Project Structure

```
rikkei-automation-test-script-app/
├── build/                  # Build configuration files
│   └── notarize.cjs       # macOS notarization script
├── build_mac/             # macOS-specific build files
│   ├── entitlements.mac.plist
│   └── entitlements.mac.inherit.plist
├── dist/                  # Build output directory
│   ├── main.cjs          # Compiled main process
│   ├── preload.cjs       # Compiled preload script
│   └── renderer/         # Compiled renderer process
├── images/                # Application icons
│   ├── icon.ico          # Windows icon
│   ├── icon.icns         # macOS icon
│   └── icon.png          # Linux icon
├── release/               # Distribution packages
├── sandbox/               # Test execution sandbox
│   ├── package.json      # Sandbox dependencies
│   ├── playwright.config.ts
│   └── test.spec.js      # Example test file
├── src/
│   ├── browser/          # Browser automation logic
│   │   ├── services/     # API services
│   │   ├── tracker/      # Action tracking
│   │   └── types/        # Type definitions
│   ├── main/             # Electron main process
│   │   ├── ipc/          # IPC handlers
│   │   ├── preload/      # Preload scripts
│   │   ├── services/     # Main process services
│   │   └── windowManager.ts
│   └── renderer/         # React UI
│       ├── main_app/     # Main application UI
│       │   ├── pages/    # Page components
│       │   ├── components/
│       │   ├── contexts/ # React contexts
│       │   └── services/ # API services
│       └── recorder/     # Test recorder UI
│           ├── components/
│           ├── pages/
│           └── types/
├── .env_example          # Environment variables template
├── package.json          # Project dependencies and scripts
├── sign.sh              # macOS code signing script
├── vite.config.ts       # Vite configuration
└── tsconfig.json        # TypeScript configuration
```

## Usage

### Getting Started

1. **Launch the Application**
   - Run `npm run dev` for development
   - Or use a built distribution package

2. **Login/Registration**
   - Use Microsoft account to sign in
   - Or register a new account if available

3. **Create a Project**
   - Navigate to Dashboard
   - Click "Create Project"
   - Enter project name and description

4. **Record Test Cases**
   - Open the test recorder
   - Navigate to your target website
   - Perform actions (clicks, inputs, etc.)
   - Actions are automatically recorded
   - Save the test case

5. **Manage Test Suites**
   - Create test suites to organize test cases
   - Add test cases to suites
   - Execute entire suites

6. **Database Connections**
   - Configure database connections in the Databases page
   - Test connections before use
   - Use database queries in test cases

7. **Variables Management**
   - Define global or project variables
   - Use variables in test cases with `${variableName}` syntax
   - Manage browser storage variables

8. **Run Tests**
   - Execute individual test cases
   - Run entire test suites
   - View test results and logs

### Supported Actions

The application supports various test actions:

- **Browser Actions**: click, double-click, right-click, input, select, scroll
- **Navigation**: navigate, reload, back, forward
- **Assertions**: text assertions, visibility checks, CSS property checks, URL/title checks
- **Database**: connect, execute queries
- **API**: make HTTP requests
- **Browser Storage**: set cookies, localStorage, sessionStorage
- **File Operations**: upload files
- **Wait Operations**: wait for elements, wait for time

## Troubleshooting

### Playwright Browsers Not Installing

If browsers fail to install automatically:

1. **Windows:**
   ```powershell
   $env:PLAYWRIGHT_BROWSERS_PATH = ".\playwright-browsers"
   npx playwright install chromium --with-deps
   ```

2. **Linux/macOS:**
   ```bash
   export PLAYWRIGHT_BROWSERS_PATH="./playwright-browsers"
   npx playwright install chromium --with-deps
   ```

### Build Errors

If you encounter build errors:

1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Clear build artifacts:
   ```bash
   rm -rf dist release
   ```

3. Rebuild:
   ```bash
   npm run build
   ```

### Electron App Not Starting

1. Check that all dependencies are installed:
   ```bash
   npm install
   ```

2. Verify environment variables are set correctly in `.env`

3. Check console for error messages:
   ```bash
   npm run dev:logs
   ```

### Database Connection Issues

1. Verify database credentials
2. Check network connectivity
3. Ensure database server is accessible
4. Verify firewall settings

### Authentication Issues

1. Verify MSAL configuration in `.env`:
   - `VITE_MSAL_CLIENT_ID`
   - `VITE_MSAL_TENANT_ID`
   - `VITE_MSAL_REDIRECT_URI`

2. Check that the redirect URI is registered in Azure AD

3. Enable debug mode:
   ```env
   VITE_DEBUG_MSAL=true
   ```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the **PolyForm Noncommercial License 1.0.0**.

See the [LICENSE](LICENSE) file for details.

## Homepage & Support

- **Homepage**: [https://automation-test.rikkei.rikkei.org](https://automation-test.rikkei.rikkei.org)
- **Contact**: pr@rikkeisoft.com
- **Author**: Rikkeisoft Corporation

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- Browser automation powered by [Playwright](https://playwright.dev/)
- UI built with [React](https://reactjs.org/)
- Authentication via [Microsoft Authentication Library](https://github.com/AzureAD/microsoft-authentication-library-for-js)

---

**Version**: 2.3.3  
**Last Updated**: 2024
