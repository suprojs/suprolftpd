/*
 * Reloaded API code: channels control
 */

function suprolftpdChannels(ret, api, local, req, res, next){
var sh, chs = local.cfg.channels

    if(!local.url){// init
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


    switch(local.url.pathname){
        case '/get': ret.data = chs
            break
        /*case '/setup': ret.data = 'setup'
            setup_channels()
            break*/
        default:
            ret.success = !(ret.err = '!such_subapi: ' + local.url.pathname)
            log(ret.err)
            break
    }
    return setImmediate(ret_data)// async always

function ret_data(){
    return res.json(ret)
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
        throw new Error('Is not a directory: ' + path)
    }
    return callback()
}

function pad(n){
    return n < 10 ? '0' + n : n
}

function setup_channels(){
var chancfg, f

    sh = '/bin/sh ./etc/lftpd.sh'.split(' ')// './' -> "$PWD"
    // address script file using crossplatform relative path
    sh[1] = '../../..' + local.cfg.PWD + sh[1]

    if('GLOB' == local.cfg.OBJ){
        for(f in chs){
            if(!f) throw new Error('FATAL lftp: object id is not defined')
            if(!(chancfg = chs[f])) continue// skip undefined configs
            if(f != chancfg.id) chancfg.id = f// assign correct 'id'

            if(chancfg.autorun){
                make_cwd_spwan_lftp(chancfg)
            }
        }
    } else {// for a remote non GLOB object its only transport must run
        chancfg = chs[local.cfg.OBJ]
        if(chancfg.autorun){
            make_cwd_spwan_lftp(chancfg)
        } else throw new Error('FATAL lftp: object id is not autorun')
    }
}

function make_cwd_spwan_lftp(chancfg){
var cwd = local.cfg.data_path + chancfg.id// -> $PWD/data/suprolftpd/GLOB

    return local.require.mkdirp.mkdirp(cwd, spawn_lftp_there)

    function spawn_lftp_there(err){
    var cmd

        if(err) throw err

        cmd = chancfg.cmd = local.require.cp.spawn(
            process.cwd() + sh[0], sh.slice(1),{
                cwd:cwd,
                env:{
                    PATH: local.cfg.PATH,
                    SUPRO_OBJ: chancfg.id
                },
                detached: false,
                stdio:['pipe','pipe','pipe']
            }
        )
        if(!cmd.pid || cmd.exitCode){
            throw new Error('!FATAL spawn `lftp` exit code: ' + cmd.exitCode)
        }
        cmd.on('close',
        function on_lftp_close(code){
            console.log('$ `lftp` stop code: ', code)
            chancfg.sts = 'exit: ' + code
            chancfg.cmd = undefined
        })
        cmd.stdout.on('data',
        function(chunck){
            console.log('out: ' + chunck)
        })
        cmd.stderr.on('data',
        function(chunck){
            chancfg.sts = 'err'
            console.log('err:' + chunck)
        })
        chancfg.sts = 'pid: ' + cmd.pid
        console.log('^ `lftp` start pid:', cmd.pid)
    }
}
}
return suprolftpdChannels(ret, api, local, req, res, next) || true// async always
