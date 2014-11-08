/*
 * API load / reload
 */

module.exports = api_load

function api_load(api, cfg){
var url = require('url')
   ,fs = require('fs')
   ,qs = require('connect/node_modules/qs')
   ,path = require('path')
   ,ui_api, local, d

    local = {
        sh: '',// script runner
        url: null,// parsed url and query string
        cfg: cfg,// default app config
        wes:{// `wes` event object with dynamic `data` field
            store:'lftpd',
            data:[ ]
        },
        _cfg: { },// private config overwiting default one
        lftps:{
        /* active and configured `lftp` instances */
        },
        require:{
            cp: require('child_process'),
            fs: require('fs'),
            mkdirp: require('mkdirp')
        }
    }
    ui_api = {// add custom URLs and handlers here
        'cfg': undefined,// UI: `App.backend.req('/suprolftpd/lib/cfg')`
        'cnl': undefined,
        'dev': load_api // UI: `App.backend.req('/suprolftpd/lib/dev')`
    }
    load_api()

    d = __dirname + '/../../..'// $PWD/app_modules/suprolftpd/lib -> $PWD
    try {// private (from `git`) config used in specific tasks
        local._cfg = (new Function(
        'var    suprolftpd;' + fs.readFileSync(d + '/config/_suprolftpd.js','utf8') +
        'return suprolftpd;'
        ))()
    } catch(ex){ }

    local.cfg = cfg = ui_api['cfg'](null, api, local)// dynamic config direct API call
    //            $PWD/app_modules/suprolftpd/lib/ -> $PWD/data/suprolftpd/
    cfg.data_path = path.normalize(d + (cfg.data_path || '/data/suprolftpd/'))
    cfg.PATH && (cfg.PATH = path.normalize(d + (cfg.PATH || '/bin/')))

    ui_api['cnl'](null, api, local)// init: start channels, errors via `throw`

    return { mwAPI:mwAPI,cfg:cfg }
    // TODO?: make this load/reload part common (diffs: 'dev', 'devel', etc.)
    function mwAPI(req, res, next){
    var ret = { success: true, data: null, err: null }// for errors: `return next(err)`
       ,call//                                                        \.../
       ,m = req.url.slice(1, 4)// call from UI: App.backend.req('?/lib/dev')

        if(!req.session) return next('!session')
        __res = res

        if('dev' === m && false /*!req.session.can['App.view.Window->tools.refresh']*/){
            res.statusCode = 401// no auth
            return next('!auth')
        }//    leave '?/lib/api/log' -> '/log' for subapi call
        local.url = url.parse(req.url.slice(4))// parse into object, api has no `require()`
        local.url.query && (local.url.query = qs.parse(local.url.query))

        if((call = ui_api[m])){
            if(!call(ret, api, local, req, res, next)){// try/catch by `connect`
                return res.json(ret)// sync
            }// async
        } else {
            return next('!handler: ' + req.url)// sync no handler
        }
        return undefined
    }

    function load_api(ret){
    var m, tmp, err = '', done = '(re)loaded: '

        for(m in ui_api){
            if(0 != m.indexOf('dev')){
                tmp = ui_api[m]// save
                try {
                    ui_api[m] = new Function(
                       'ret, api, local, req, res, next',
                        fs.readFileSync(__dirname + '/' + m + '.js', 'utf8')
                    )
                    done += m + ' '
                } catch(ex){
                    log('exec fail:', ex.stack)
                    err += ex + '\n'
                    tmp && (ui_api[m] = tmp)// restore if error
                }
            }
        }
        if(ret){
            ret.data = done
        }
        return err && arguments[5] && (arguments[5](err) || true)// next(err), async subapi
    }
}
