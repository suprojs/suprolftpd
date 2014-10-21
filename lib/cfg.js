/*
 * Reloaded API code: dynamic config
 */

function suprolftpdCFG(ret, api, local, req, res, next){

    if(!local.url){// runs directly from `api_load` for `app_back_*`
        return config_check(local.cfg)// dynamic config
    }

    switch(local.url.pathname){
        case '/get': ret.data = local.cfg
            break//UI check: App.backend.req('/suprolftpd/lib/cfg/get')
        default:
            ret.success = !(ret.err = '!such_subapi: ' + local.url.pathname)
            log(ret.err)
            break
    }
    return setImmediate(ret_data)// async always
}

function ret_data(){
    return res.json(ret)
}

function config_check(modcfg){
var cfg = config_default().suprolftpd

    if('boolean' != typeof modcfg){// not simple module enabler by 'true'
        for(var f in modcfg){
            cfg[f] = modcfg[f]
        }
    }
    if(!cfg.rbac){
        cfg.rbac = rbac_default()
    } else if(!cfg.rbac.can){
        cfg.rbac.can = rbac_default().can
    }
    return cfg
}

function config_default(){
    return {
    // == app config template: copy from here
    suprolftpd:{
    //  CWD:  'supro/' = process.cwd
        data_path: '/data/suprolftpd/',// local app module directory
        PWD:       '/app_modules/suprolftpd/',
        PATH:      '/bin/',// `sh`,`lftp` in cygwin is provided by supro itself
        OBJ:       'OBJ_DUMMY',// supro instance name (in distributed setup)
        host:      'sftp://86.57.246.51:443/lftp/',// remote host/directory/
        rbac: rbac_default(),
        channels: channels()
    }
    // == app config template ==
    }
}

function rbac_default(){
    return {
        can:{// public `can` for toolbar with daemon handlers for other roles
            'App.suprolftpd.view.ControlTools': true,
            '/suprolftpd/lib/': true
        },
        roles:{
            'lftpd.role':[// new cans are merged
                'module.suprolftpd',
                '/suprolftpd/lib/',
                'App.suprolftpd.view.ControlTools',

                'App.um.wes',
                'App.um.controller.Chat',
                'App.um.view.Chat',
                '/um/lib/wes',
                '/um/lib/chat'
            ],
            'developer.local':[// add to existing role
                'module.suprolftpd',//it has '*' but anyway
                '/suprolftpd/lib/',// it has '*' but anyway
                'App.suprolftpd.view.ControlTools',
            ]
        },
        users:{
            'lftpd':{
                id: 'lftpd',
                // require('crypto').createHash('sha1').update(pass).digest('hex')
                pass: '9d4e1e23bd5b727046a9e3b4b7db57bd8d6ee684',
                roles:['lftpd.role'],
                name: 'lftpd role'
            }
        }
    }
}

function channels(){
//TODO: channels for low priority/big files for same objects
    return {
        /*GLOB:{// open -u vito.supro.1,1234 sftp://86.57.246.51:443/lftp/
            id: 'GLOB',
            txt: 'global object in the center',
            autorun: true,// runs: arrow status
            cmd: undefined,
            sts: undefined,
            auth: 'vito.supro.1,1234'
        },*/
        LOOPBACK:{// at least one distributed object is needed for this all to work
            id: 'LOOPBACK',// remote peer object name
            txt: 'loopback testing',// UI name: channel#: txt
            autorun: true,// configured: blue status, runs green status
            cmd: undefined,
            sts: undefined,
            auth: 'vito.supro.2,2345'
        },
        DUMMY:{
            id: 'DUMMY',// remote peer object name
            txt: 'dummy config',// UI name: channel#: txt
            autorun: false// configured: blue status
        },
        NULL: null// just exists: black status
    }
}

return suprolftpdCFG(ret, api, local, req, res, next) || true// async always
