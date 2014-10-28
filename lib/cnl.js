/*
 * Reloaded / hot swap API code: `lftp` channels control
 *
 * SECURITY NOTE: do not let raw strings to be passed to `lftp`
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
    case '/get': ret.data = chs ;break
    case '/cmd': return cmd_channel()
    case '/do' : return do_channel()
    default:
        ret.success = !(ret.err = '!such_subapi: ' + local.url.pathname)
        log(ret.err)
    }
    return setImmediate(ret_data)// async always

function ret_data(){
    return res.json(ret)
}

function cmd_channel(){
var lftp = lftps[local.url.query.id]

    //log('local url:', )
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
     */
    switch(what.cmd){
    case 'echo':
        if(lftp && chancfg && chancfg.id){// use strong shell quotes
            return lftp.sh.stdin.write("echo '" + chancfg.id + "'\n", 'utf8', on_done)
        } else {
            err = '~lftp runs || no config || id in config'
            break
        }
    case 'quit':
        if(!lftp){
            err = '~channel `id`="' + what.id + '": was not found in `lftps`'
            break
        }
        lftp.sh.stdin.write('quit\n', 'utf8', on_done)//???if long process of up/down????
        return lftp = null// don't double `wes` from spawn and `on_done()` here
    case 'start':
        err = chancfg.sts.slice(0, 4)
        if(!lftp && chancfg && (!chancfg.sts || 'quit' == err || 'stop' == err)){
            return make_cwd_spwan_lftp(chancfg, on_done)
        } else {
            err = '~lftp runs || no config || status = "quit"'
            break
        }
    }
    if(err){// application error
        ret.success = false
        ret.data = ret.err = err
        return res.json(ret)
    }
    return next(new Error('!no such `do` action'))// programming error

    function on_done(){
        ret.data = chancfg
        lftp && api.wes.broadcast('wes4store', lftp.wes)

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
    // address script file using crossplatform relative path
    local.sh[1] = '../../..' + local.cfg.PWD + local.sh[1]

    if('GLOB' == local.cfg.OBJ){
        for(f in chs){
            if(!f) throw new Error('! lftp: object id is not defined')
            if(!(chancfg = chs[f])) continue// skip undefined configs
            if(f != chancfg.id) chancfg.id = f// assign correct 'id'

            if(chancfg.autorun){
                make_cwd_spwan_lftp(chancfg)
            } else {
                chancfg.sts = 'stop'
            }
        }
    } else {// for a remote non GLOB object its only transport must run
        chancfg = chs[local.cfg.OBJ]
        if(chancfg.autorun){
            make_cwd_spwan_lftp(chancfg)
        } else throw new Error('! lftp: object id is not autorun')
    }
}

function make_cwd_spwan_lftp(chancfg, cb){
var cwd = local.cfg.data_path + chancfg.id// -> $PWD/data/suprolftpd/GLOB
   ,lftp = lftps[chancfg.id] = {
       sh:  null,
       log: null,
       wes:{
            store:'lftpd',
            data:[ chancfg ]
        }
    }
   ,d = new Date

    return local.require.mkdirp.mkdirp(cwd, open_log)

    function open_log(){
        lftp.log = local.require.fs.createWriteStream(
            cwd + '/' + d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '.txt'
           ,{ flags: 'a' } //for some dumb reason flags craps all out
        )

        lftp.log.on('error',
        function on_error_log_file(err){
            lftp.log.end()
            lftp.log = null
            next(err = err || 'lftp.log')
            chancfg.sts = 'err: ' + err
            api.wes.broadcast('wes4store', lftp.wes)
        })

        lftp.log.on('data',
        function(chunck){
            log('log data:', chunck)
        })

        lftp.log.on('open', spawn_lftp_there)
    }

    function spawn_lftp_there(){
    var err

        log('^ spawn ' + chancfg.id + '\n' + d.toISOString())
        lftp.sh = local.require.cp.spawn(
            process.cwd() + local.sh[0], local.sh.slice(1),{
                cwd:cwd,
                env:{
                    PATH: local.cfg.PATH,
                    SUPRO_OBJ: chancfg.id
                },
                detached: false,
                stdio:['pipe','pipe','pipe']
            }
        )
        if(!lftp.sh.pid || lftp.sh.exitCode){
            err = new Error('!spawn `lftp` exit code: ' + lftp.sh.exitCode)
            if(cb) return cb(err)
            throw err
        }
        lftp.sh.on('close',
        function on_lftp_close(code){
            log('$ `lftp` quit code: ', String(code))
            chancfg.sts = 'quit: ' + code + '\n' + (new Date).toISOString() + '\n'
            api.wes.broadcast('wes4store', lftp.wes)
            lftp.log.write('$ ' + chancfg.sts)
            lftp.log.end()
            lftp.log = null
            lftps[chancfg.id] = void 0
        })

        lftp.sh.stdout.on('data',
        function(chunck){
            log('out: ' + chunck)//todo: api.wes.broadcast('wes4store', lftp.wes)
            lftp.log.write(chunck)
        })

        lftp.sh.stderr.on('data',
        function(chunck){
            chancfg.sts = 'err: '+ chunck
            log(chancfg.sts)
            lftp.log.write(chunck)
        })

        chancfg.sts = 'runs pid: ' + lftp.sh.pid  + '\n' + d.toISOString() + '\n'
        api.wes.broadcast('wes4store', lftp.wes)
        log('^ `lftp` ' + chancfg.sts)
        lftp.log.write('^ ' + chancfg.sts)

        return cb && cb()
    }
}
}
return suprolftpdChannels(ret, api, local, req, res, next) || true// async always
