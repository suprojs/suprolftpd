/*
 * == Reliably distibute information across SUPRO network ==
 *
 * Topology is star. All traffic goes via Internet Server with SSH.
 * There are two channels with separate directories for every object in SUPRO:
 * - $PWD/data/suprolftpd/OBJ/upload
 * - $PWD/data/suprolftpd/OBJ/download
 *
 * Internet Server may have SUPRO running. But it is mainly a peering point.
 *
 * Central object which proxies all data thru itself is GLOB.
 * I.e. any object can send any info only for GLOB. Then GLOB decides what
 * to broadcast to others.
 *
 * In terms of retail GLOB is back-office and other objects are front-offices:
 * - GLOB is overall orders, stock, distribution, central warehouse;
 *   virtual warehouses like returns or defects don't need to be distributed;
 * - OBJ* are real life/off-line sell points, shops, stores, warehouses, etc.
 *
 * api for app modules:
 * ~~~~~~~~~~~~~~~~~~~
 * + api.lftp.send('moduleName', json): originating data to be sent
 *   1) prepare: { mod: 'moduleName', json: json}
 *   2) cache in memory
 *   3) write cache array JSON to data dir 'file.json'
 *   4) on `setInterval()` run `lftp` which does:
 *   4.1) TODO: `tar.gz`; now there are many files and names can NOT have spaces
 *   4.2) create flag file 'zzzzzzz.zzz' to be very last uploaded
 *        existance of this file is checked by peer to start downloading
 *   4.3) prepare list of processed file names in '.mv.lftp', see 4.7
 *   4.4) saves data in files per each module where names are without repetition:
 *   // TEST --> $PWD/data/suprolftpd/TEST/upload/_123123123-userman_TEST.json
 *   // GLOB <<> $PWD/data/suprolftpd/TEST/download/_123123123-userman_TEST.json
 *   file name: '_' + new Date().valueOf() + '-' + moduleName.CHANNEL
 *   so no remote file collision or rewrite is possible
 *   4.5) runs `lftp mput -c -O .proc *`: partial content is being (re)uploaded
 *        into transitional directory '.proc'
 *   NOTE: wildcards don't include '.dot_files' (POSIX)
 *   4.6) if `mput` returns successfully next or echo ERR to master node.js
 *   4.7) move full files from '.proc' into '../' which is 'upload' - final destination
 *   4.8) send exit status back to node.js master: OK
 *
 * + api.lftp.on('moduleName', function doEvent(json, doAfterCleanup){ }): receive data
 *   1) on `setInterval()` run `lftp`:
 *   1.1) `lftp mput -c -E *` NOTE: wildcards don't include '.dot_files' (POSIX)
 *   1.2) gunzip + tar -x
 *   2) processing for every '*.json' file:
 *   2.1) read it, for array item check 'moduleName'
 *   2.2) run 'moduleName' callback: doEvent(json, doEventCleanup)
 *   2.3) run `doEventCleanup()` there to remove/unlink event file
 *
 * + TODO other files: `lftp` can send any files; app modules must decide
 *   what and how to provide; common sense is to move/rename (not write!)
 *   into data dir files with some moduleName prefix in file names, which then
 *   can be read and passed into module's callbacks.
 *   NOTE: lftp's wildcards as shell tools don't include '.dot_files' (POSIX)
 *   TODO: use limits for non-JSON files: big_file_size/big_file_rate
 *
 *   `lftp` cycles will upload files in whole remembering and deleting
 *   processed files
 *
 * API load / reload (hot swap)
 */

module.exports = api_load

function api_load(api, cfg){
var url = require('url')
   ,fs = require('fs')
   ,qs = require('connect/node_modules/qs')
   ,path = require('path')
   ,app_modules = {
   /* modname: { on: cb(json, doEventCleanup(err)), send:[ ], json:'' } */
    }
   ,ui_api, local, d

    local = {
        sh: '',// script runner
        url: null,// parsed url and query string
        cfg: cfg,// default app config
        wes:{// `wes` event object with dynamic `data` field
            store:'lftpd',
            data:[ ]
        },
        app_modules: app_modules,
        _cfg: { },// private config overwiting default one
        lftps:{
       /* active and configured `lftp` instances
        * TEST: {
        *   sh_up: null,// for uploading (separate dir and lftp logs)
        *   sh_dn: null,// for downloading
        *   loop: null,// setInterval() for doing the job
        *   log: null// common app log
        * }
        */
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
            ui_api['cnl'](null, api, local)// reinit: start channels
        }
        return err && arguments[5] && (arguments[5](err) || true)// next(err), async subapi
    }
}
