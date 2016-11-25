const config = require('../config.json');

// we require cert store to validate our custom certs
const certStoreLoadPromise = require('../node-windows-certs/index');

const extend = require('extend');
const fetch = require('node-fetch');
const { BrowserWindow } = require('electron');

// see: http://help.sap.com/saphelp_smp3010sdk/helpdata/en/52/422ce1c499463784f80dcb4d2666fe/content.htm

function setCookieErrorHandler(err) {
    if (err) {
        throw err;
    }
}

// the connection ID that we eventually create in SMP
let appConnectionId = null;
const appId = config.appId;
// the connection entity endpoints
const connectionsUrlBase = `/odata/applications/{0}/${appId}/Connections`;
const connectionsUrls = {
    v1: connectionsUrlBase.replace('{0}', 'v1'),
    v2: connectionsUrlBase.replace('{0}', 'v2'),
    latest: connectionsUrlBase.replace('{0}', 'latest'),
};
const connDetailSetUrl = connectionsUrls.v1;
// the URL we use to create our connectionentity
const connDetailCreateUrl = `${connectionsUrls.v2}?$expand=FeatureVectorPolicy`;
// the url used to launch the SAML auth flow
const samlAuthLauncherUrl = '/SAMLAuthLauncher';
// the expected return URL that will be hit when the SAML auth flow finishes
const finishedSAMLLaunchUrlBase = `${samlAuthLauncherUrl}?finishEndpointParam`;

function handleFlow(win, smpUrl) {
    // wait for the certs to finish loading
    certStoreLoadPromise.then(() => {
        // open a modal window with the auth request
        let modal = new BrowserWindow({
            parent: win,
            modal: true,
            show: false,
        });

        // listen for various URLs finishing their load
        modal.webContents.on('did-stop-loading', () => {
            const currentUrl = modal.webContents.getURL();
            if (currentUrl.indexOf(connDetailSetUrl) !== -1) {
                // loaded the connection entity, which should have given us some cookies, now redirect to auth launcher
                modal.loadURL(`${smpUrl}${samlAuthLauncherUrl}`);
            } else if (currentUrl.indexOf(finishedSAMLLaunchUrlBase) !== -1) {
                // we got the saml response successfully
                modal.webContents.session.cookies.get({}, (error, cookies) => {
                    // grab the SMP cookies
                    const smpCookies = cookies.filter(c => c.name === 'X-SMP-SESSID' || c.name === 'X-SMP-SESSIDSSO');
                    // do a post request to create a session
                    fetch(`${smpUrl}${connDetailCreateUrl}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            // make sure to send our collection of cookies
                            Cookie: smpCookies.map(c => `${c.name}=${c.value}`).join('; '),
                        },
                        // tell smp what device we're using'
                        body: JSON.stringify({
                            DeviceType: 'Windows',
                        }),
                    })
                    .then(res => res.json())
                    .then((json) => {
                        const connection = json.d;
                        appConnectionId = connection.ApplicationConnectionId;
                        const session = win.webContents.session;
                        // add two cookies for our connection id
                        const connectionIdCookie1 = extend({}, smpCookies[0], {
                            name: 'X-SMP-APPCID',
                            value: appConnectionId,
                            url: smpUrl,
                        });
                        session.cookies.set(connectionIdCookie1, setCookieErrorHandler);
                        const connectionIdCookie2 = extend({}, smpCookies[0], {
                            name: 'X-SUP-APPCID',
                            value: appConnectionId,
                            url: smpUrl,
                        });
                        session.cookies.set(connectionIdCookie2, setCookieErrorHandler);
                        // make sure the cookies are on our main window
                        smpCookies
                            .map(c => extend({ url: smpUrl }, c))
                            .forEach(c => session.cookies.set(c, setCookieErrorHandler));

                        // redirect the window to the launchpad
                        win.loadURL(`${smpUrl}${config.targetPath}`);
                    })
                    .catch((err) => {
                        // todo - error handling
                        console.log(err);
                        debugger;
                    });

                    // that's everything we need from the modal
                    modal.close();
                    modal.destroy();
                    modal = null;
                });
            }
        });
        // load the saml auth launcher to get a connection id
        setTimeout(() => modal.loadURL(`${smpUrl}${connDetailSetUrl}`), 1000);
    });
}

module.exports = handleFlow;
