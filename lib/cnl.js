/*
 * Reloaded / hot swap API code: `lftp` channels control
 *
 * SECURITY NOTE: do not let raw strings from JSON/HTTP to be passed to `lftp`
 *                to prevent shell/exec injections
 */

function suprolftpdChannels(ret, api, local, req, res, next){
var lftps = local.lftps, chs = local.cfg.channels

    if(!local.url){// init, if internal call
        return mkdirp(local.cfg.data_path, setup_channels)
    }
//
//proto: repair go (without renaming)
//       go -wait-for- go_ok    change status
//       og -wait-for- og_ok    change status fire event on end
//stop:  stop -wait-for stop_ok change status fire event
/* GLOB not GLOB:

GLOB: send, receive from all

glob - for every obj put a file for send
 run send lftpd for every object not glob
 run receive lftpd for every object not glob

one code for all, one lftpd config for all, diff on OBJ

one any non glob obj -- run one in out transport for self

*/
    if(!req.json) return next(new Error('arguments: JSON required'))

    switch(local.url.pathname){
    case '/get': wes(ret.data = chs, true) ;break// init `wes` for session
    case '/cmd': return cmd_channel()
    case '/log': return log_channel()
    case '/do' : return do_channel()
    default:
        ret.success = !(ret.err = '!such_subapi: ' + local.url.pathname)
        log(ret.err)
    }
    return setImmediate(ret_data)// async always

function ret_data(){
    return res.json(ret)
}

/*
 * push new data into subapi local event object data array
 * broadcast will do `data.splice(0)`
 *
 * lftp_wes:{
 *      store:'lftpd',
 *      data:[ chancfg, 'message 2' ]
 * }
 *
 * `chancfg.sts`: status 3-chars for 3 status info:
 * [0]-  upload status:'r'un/'q'uit
 * [1]-download status:'r'un/'q'uit
 * [2]-transport queue:'g'o /'s'top
 *
 **/
function wes(data, force){
var lftp_wes = local.wes
   ,send = (0 == lftp_wes.data.length)

    if(force){// initial request of pending event after session was established
        return api.wes.broadcast('wes4store', lftp_wes)
    }

    if(!data.id || !data.sts){// programming, contract error
        return next(new Error('!lftp_wes.data:no_id_or_sts'))
    }
    lftp_wes.data.push({// copy multiple data into one 'wes4store' event
        id:  data.id,
        sts: data.sts
    })
    if(send){// if data array was empty, then call `broadcast` to queue event
        api.wes.broadcast('wes4store', lftp_wes)
    }// else don't queue same `wes4store` events
    return void 0
}

function cmd_channel(){
var lftp = lftps[local.url.query.id]

    //log('local url:', )
    return res.json(ret)
}

function log_channel(){
var lftp, d

    if((lftp = lftps[req.json.id])){
        lftp = lftp.log.path
    } else if((lftp = chs[req.json.id])){
        d = new Date
        lftp = local.cfg.data_path + lftp.id + '/' +
               d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '.txt'
    }
    if(lftp){
        return api.connect.sendFile(lftp, true)(req, res, next)
    }
    ret.success = false
    ret.data = ret.err = '~lftp_not_found'

    return res.json(ret)
}

function do_channel(){
var chancfg, lftp, what, err

    what = req.json
    chancfg = chs[what.id]
    lftp = lftps[what.id]
   /*
    * SECURITY NOTE: do not let raw strings to be passed to `lftp`
    *                to prevent shell/exec injections
    * Development via UI:
    * > App.backend.req('/suprolftpd/lib/cnl/do', {id:'LOOPBACK', cmd:'run'})
    */
    switch(what.cmd){
    case 'echo':
        if(lftp && chancfg && chancfg.id){// use strong shell quotes
            return lftp.sh_up.stdin.write("echo '" + chancfg.id + "'\n", 'utf8', on_done)
        } else {
            err = '~lftp runs || no config || id in config'
            break
        }
    case 'quit':
        if(!lftp){
            err = '~channel `id`="' + what.id + '": was not found in `lftps`'
            break
        }
        // NOTE: `lftp` ignores closing of `stdin.end()`; use propper `exit`:
        lftp.sh_up && lftp.sh_up.stdin.write('exit top kill 75\n', 'utf8', function(){
        lftp.sh_dn && lftp.sh_dn.stdin.write('exit top kill 74\n', 'utf8', on_done)
        lftp = null/* don't double `wes` from spawns and `on_done()` here*/          })

        return lftp.log.write('write: exit top kill 75/74')
    case 'run':
        if(!lftp && chancfg && (
            !chancfg.sts || 'qq' == (err = chancfg.sts.slice(0, 2)))
        ){
            return make_cwd_spwan_up_down_lftps(chancfg, on_done)
        } else {
            err = '~lftp runs || no config || up/down status = "quit+quit"'
            break
        }
    default:
        if(req.session.can['App.suprolftpd.view.ControlTools']){
            return lftp.sh.stdin.write(what.cmd + '\n', 'utf8', on_done)
        }
    }
    if(err){// application error
        ret.success = false
        ret.data = ret.err = err

        return res.json(ret)
    }
    return next(new Error('!no such `do` action'))// programming error

    function on_done(){
        lftp && wes(chancfg)
        ret.data = chancfg

        return res.json(ret)
    }
}

function mkdirp(path, callback){
var d

    try {
        d = local.require.fs.statSync(path)
    } catch(ex){
        return local.require.mkdirp.mkdirp(path,
        function mkdirp_data_dir(err){
            if(err) throw err

            return callback()
        })
    }
    if(!d.isDirectory()){
        throw new Error('!is not a directory: ' + path)
    }
    return callback()
}

function pad(n){
    return n < 10 ? '0' + n : n
}

function setup_channels(){
var chancfg, f

    local.sh = '/bin/sh ./etc/lftpd.sh'.split(' ')// './' -> "$PWD"
    // address script file using crossplatform relative path -> $PWD/data/suprolftpd/GLOB/upload
    local.sh[1] = '../../../..' + local.cfg.PWD + local.sh[1]

    if('GLOB' == local.cfg.OBJ){
        for(f in chs){
            if(!f) throw new Error('! lftp: object id is not defined')
            if(!(chancfg = chs[f])) continue// skip undefined configs
            if(f != chancfg.id) chancfg.id = f// assign correct 'id'

            if(chancfg.autorun){
                make_cwd_spwan_up_down_lftps(chancfg)
            } else {
                chancfg.sts = 'qqs| no autorun'
            }
        }
    } else {// for a remote non GLOB object only its own transport must be run
        chancfg = chs[local.cfg.OBJ]
        if(chancfg.autorun){
            make_cwd_spwan_up_down_lftps(chancfg)
        } else throw new Error('! lftp: object id is not autorun')
    }
}

function make_cwd_spwan_up_down_lftps(chancfg, cb){
var cwd = local.cfg.data_path + chancfg.id// -> $PWD/data/suprolftpd/GLOB
   ,lftp = lftps[chancfg.id] = {
       sh_up: null,
       sh_dn: null,
       log: null
    }
   ,d = new Date
    // one app log file for both channels, but `lftp` logs are in own up/down dirs
    return local.require.mkdirp.mkdirp(cwd + '/upload/', function(){
           local.require.mkdirp.mkdirp(cwd + '/download/', open_log)})

    function open_log(){
        lftp.log = local.require.fs.createWriteStream(
            cwd + '/' + d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '.txt'
           ,{ flags: 'a' } //for some dumb reason flags craps all out in spawn stdio
        )

        lftp.log.on('error',
        function on_error_log_file(err){
            lftp.log.end()
            lftp.log = null
            next(err = err || 'lftp.log')
            chancfg.sts = chancfg.sts.slice(0, 4) + 'err: ' + err
            wes(chancfg)
        })

        lftp.log.on('data',
        function(chunck){
            log('log data:', chunck)
        })

        lftp.log.on('open', spwan_up_down_lftps)
    }

    function spwan_up_down_lftps(){
    var err, dir, st, sh

        if(!lftp.sh_up){
            dir = cwd + '/upload/'
            st = 'up'
        } else {
            dir = cwd + '/download/'
            st = 'dn'
        }

        log('^ spawn "' + chancfg.id + ':' + st + '" \n' + d.toISOString())
        sh = lftp['sh_' + st] = local.require.cp.spawn(// 'sh_up' || 'sh_dn'
            process.cwd() + local.sh[0], local.sh.slice(1),{
                cwd: dir,
                env:{
                    PATH: local.cfg.PATH,
                    HOME: dir,
                    SUPRO_OBJ: chancfg.id
                },
                detached: false,
                stdio:['pipe','pipe','pipe']
            }
        )
        if(!sh.pid || sh.exitCode){
            err = new Error('!spawn `lftp` exit code: ' + sh.exitCode)
            if(cb) return cb(err)
            throw err
        }
        sh.on('close',(function(st){
        return function on_lftp_close(code){
            log('$ `lftp` "'+ st + '" quit code: ', String(code))
            log('$'+chancfg.sts)
            chancfg.sts = (st == 'up' ? 'q' + chancfg.sts[1]:
                                        chancfg.sts[0] + 'q') + chancfg.sts[2]

            chancfg.sts += '| "'+ st + '" quit: ' + code + '\n' + (new Date).toISOString() + '\n'
            log('$'+chancfg.sts)
            wes(chancfg)
            lftp.log.write('$ ' + chancfg.sts)
            if('qq' == chancfg.sts.slice(0, 2)){
                lftp.log.end()
                lftp.log = null
                lftps[chancfg.id] = void 0
            }
        };})(st))

        sh.stdout.on('data',(function(st){
        return function(chunck){
            chancfg.sts = chancfg.sts.slice(0, 4) + ' "'+ st + '" ' + chunck
            wes(chancfg)
            lftp.log.write(chunck)
        };})(st))

        sh.stderr.on('data',(function(st){
        return function(chunck){
log('sts pre:"' + chancfg.sts + '"')
            chancfg.sts = (st == 'up' ? 'e' + chancfg.sts[1]:
                                        chancfg.sts[0] + 'e') + chancfg.sts[2]
            chancfg.sts += '| err: '+ chunck
            log(chancfg.sts)
            wes(chancfg)
            log('' + chunck)
            lftp.log.write(chunck)
        };})(st))

        if(!lftp.sh_dn){// upload, first status init
            chancfg.sts = 'rqs'
        } else {        // download
            chancfg.sts = chancfg.sts[0] + 'r' + chancfg.sts[2]
        }
        chancfg.sts += '| "' + st + '" runs pid: ' + sh.pid  + '\nin: ' + dir + '\n'
                    + d.toISOString() + '\n'
        wes(chancfg)
        log('^ `lftp` ' + chancfg.sts)
        lftp.log.write('^ ' + chancfg.sts)

        if(!lftp.sh_dn){// download
            return spwan_up_down_lftps()
        }

        return cb && cb()
    }
}
}
return suprolftpdChannels(ret, api, local, req, res, next) || true// async always
