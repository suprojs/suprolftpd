/*
 * Setup API for `lftpd`
 **/

module.exports = suprolftpd

function suprolftpd(api, cfg){
var app = api.app, name = 'suprolftpd'
   ,lftpd = require('./lib/api_load.js')(api, cfg)// dynamic config

    return {
        css:['/css/' + name + '/css'],
        js: ['/' + name + '/app_front_' + name ],
        app_use: app_use,// call this *after* `mwBasicAuthorization()`
        cfg:{ rbac: lftpd.cfg.rbac, extjs: null }// do not share whole config
    }

    function app_use(){
        app.use('/' + name + '/lib/', lftpd.mwAPI)
        // order of priority; serve static files, css, l10n
        app.use('/' + name + '/', api.connect['static'](__dirname + '/'))
        app.use('/l10n/', api.mwL10n(api, __dirname, '_' + name + '.js'))
        app.use('/css/' + name + '/', api.connect['static'](__dirname + '/css/'))
        app.use('/css/' + name + '/css', api.connect.sendFile(
            __dirname + '/' + name + '.css', true)
        )
    }
}
