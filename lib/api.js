/*
 * Reloaded API code
 */

function suprolftpdAPI(ret, api, local, req, res, next){

    if(!local.url){// runs directly from `api_load` for `app_back_*`
        return config_default(local.cfg)// dynamic config
    }

    switch(local.url.pathname){
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

function config_default(cfg){
var defaults = {
    suprolftpd:{// copy from here into app config
    //  CWD:  'supro/'
        data_path: '/data/suprolftpd/',// local app module directory
        bin:       '/bin/lftp.exe',// cygwin provided by supro itself
        path:      '/bin/',// for exe search
        host: 'sftp://1.2.3.4:56789/lftp/',// remote host/directory/
        rbac: rbac_default(),
        channels:{
            ch0:{
                id: '',
                txt: ' first testing',
                autorun: true,
                auth: 'supro.1,1234'
            },
            chZ:{
                id: '',// remote peer object name
                txt: '== empty ==',// UI name: channel#: txt
                autorun: false,
                auth: 'supro.2,2345'
            }
        }
    }}

    if('boolean' == typeof cfg){// simple module enabler by 'true'
        cfg = defaults.suprolftpd
    }

    /* == admin/status UI && API: == */
    if(!cfg.rbac){
        cfg.rbac = defaults.suprolftpd.rbac
    } else if(!cfg.rbac.can){
        cfg.rbac.can = defaults.suprolftpd.rbac.can
    }
    return cfg
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

return suprolftpdAPI(ret, api, local, req, res, next) || true// async always
