const logger = require('./logger/index');
// read config
const config = require('./config.json');
const smpAuthFlow = require('./smp-auth-flow/index');

// eslint-disable-next-line import/no-extraneous-dependencies, import/no-unresolved
const electron = require('electron');
// Module to control application life.
const { app } = electron;
// Module to create native browser window.
const { BrowserWindow } = electron;
// session for manipulating things globally
const { session } = electron;

// setup various things from the config
const targetServer = `https://${config.targetServer.replace('%env%', config.env)}`;

try {
    // Keep a global reference of the window object, if you don't, the window will
    // be closed automatically when the JavaScript object is garbage collected.
    let win;

    const createWindow = () => {
        // Create the browser window.
        let title = 'Web eWorkplace';
        if (config.env !== 'prd') {
            title += ` - ${config.env.toUpperCase()}`;
        }
        win = new BrowserWindow({
            width: 400,
            height: 800,
            center: true,
            // don't show the menu bar unless alt is pressed
            autoHideMenuBar: true,
            // use our nice custom icons
            icon: `electron-src/icons/${config.env}.ico`,
            // and nice custom title
            title,
            // don't show for a sec
            show: false,
            webPreferences: {
                // make sure dev tools are enabled
                devTools: true,
                // disable node integration because it breaks Fiori
                nodeIntegration: false,
            },
        });
        win.maximize();
        win.show();
        // put in a loading page so nobody notices we're doing stuff in the background
        win.loadURL(`file://${__dirname}/pages/init.html`);

        // load the required URL
        if (config.gatewayDirect) {
            // is gateway - so just load directly
            const url = targetServer + config.targetPath;
            console.log(`opening gateway directly... ${url}`);
            win.loadURL(url);
        } else {
            // is smp - special flow handling
            console.log(`using smp... ${targetServer}`);
            smpAuthFlow(win, targetServer);
        }

        // Emitted when the window is closed.
        win.on('closed', () => {
            console.log('win.closed');
            // Dereference the window object, usually you would store windows
            // in an array if your app supports multi windows, this is the time
            // when you should delete the corresponding element.
            win = null;
        });
        win.on('close', () => {
            console.log('win.close');
            app.quit();
        });
    };

    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.on('ready', () => {
        // spoof UA to look like IE11 so that we can work around the missing whitelist chrome UA
        session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
            details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko';
            callback({
                cancel: false,
                requestHeaders: details.requestHeaders,
            });
        });
        // create our root window instance
        createWindow();
    });

    // Quit when all windows are closed.
    app.on('window-all-closed', () => {
        console.log('app.window-all-closed');
        app.quit();
    });
} catch (globalEx) {
    logger.error(JSON.stringify(globalEx));
}
