(
    suprolftpdChannels(ret, api, local, req, res, next),
    "async"// async always
)
/*
 * Reloaded / hot swap API code: `lftp` channels control
 *
 * SECURITY NOTE: do not let raw strings from JSON/HTTP to be passed to `lftp`
 *                to prevent shell/exec injections
 *
 * TODO: max file size check
 * TODO: second channel for low priority/big files
 * TODO: TAR+ZIP => thus file names with spaces
 */

// GLOB -> $PWD/data/suprolftpd/TEST/dnload/_123123123-userman_TEST.json
//   RE: in `lftp_recv()`                             ^|     |^|  |^^^^^
var RE = /-([^_]+)_([^.]+)[.]json$/

function suprolftpdChannels(ret, api, local, req, res, next){
var lftps = local.lftps, chs = local.cfg.channels

    if(!local.url || !req){// init, if internal call
        api.lftp = {
            OBJ: local.cfg.OBJ,
            on: lftp_on_addCallback,
            send: lftp_send
        }
        return mkdirp(local.cfg.data_path, setup_channels)
    }
    if(!req.json) return next(new Error('arguments: JSON required'))

    switch(local.url.pathname){
    case '/get':
        if('GLOB' == local.cfg.OBJ){
            ret.data = chs
        } else {
            ret.data = { }
            ret.data[local.cfg.OBJ] = chs[local.cfg.OBJ]
        }
        wes(ret.data, true)// init `wes` for session
        break
    case '/log': return log_channel()
    case '/do' : return do_channel()
    default:
        ret.err = '!such_subapi: ' + local.url.pathname
        log(ret.err)
    }
    return setImmediate(ret_data)// async always

function ret_data(){
    return res.json(ret)
}

/* -- lftp API logic --
 * GLOB: sends to all, receives from all objects
 * OBJ:  sends only to GLOB, receives only from GLOB (by own channels)
 * 1) sending data queue is process by channel loops in `lftp_loop()`
 * 2) receiving data from lftp's stdout calls `lftp_recv(cwd, 'DN * .')`
 *    which runs handlers added here by any module
 */
function lftp_on_addCallback(modname, cb){
var m = local.app_modules[modname]

    if(!cb) return m ? m.cb : void 0// check what is in

    if(!m){
        local.app_modules[modname] = { on:cb, send: [ ], str:'' }
    } else {
        m.on && log('Overwrite of callback for app module "' + modname + '"!')
        m.on = cb// only one callback
    }
    return cb
}

function lftp_send(mod, json){
var m, d = { mod:mod,json:json }

    if((m = local.app_modules[mod])){
        m.send.push(d)
    } else {
        local.app_modules[mod] = { on: void 0, send:[d], str:'' }
    }
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
 *`chancfg.sts` status 3-chars for 3 status info:
 * [0]-  upload status:'r'un/'q'uit
 * [1]-download status:'r'un/'q'uit
 * [2]-transport queue:'g'o /'s'top
 *
 **/
function wes(data, force){
var lftp_wes = local.wes
   ,send = (0 == lftp_wes.data.length)

    if(force){// initial request of pending event after session was established
        return api.wes && api.wes.broadcast('wes4store', lftp_wes)
    }

    if(!data.id || !data.sts){// programming, contract error
        return next(new Error('!lftp_wes.data:no_id_or_sts'))
    }
    lftp_wes.data.push({// copy multiple data into one 'wes4store' event
        id:  data.id,
        sts: data.sts
    })
    if(send){// if data array was empty, then call `broadcast` to queue event
        api.wes && api.wes.broadcast('wes4store', lftp_wes)
    }// else don't queue same `wes4store` events
    return void 0
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
    // - lftp -
    case 'quit':
        if(!lftp){
            err = '~channel `id`="' + what.id + '": was not found in `lftps`'
            break
        }
        // NOTE: `lftp` ignores closing of `stdin.end()`; use propper `exit`:
        lftp.sh_up && lftp.sh_up.stdin.write('exit top kill 74\n', 'utf8', function(){
        lftp.sh_dn && lftp.sh_dn.stdin.write('exit top kill 75\n', 'utf8', on_done)
        lftp = null/* don't double `wes` from spawns and `on_done()` here */      })

        return lftp.log.write('write: exit top kill 75/74')
    case 'run':
        if((chancfg && (// run any of 'upload' or 'download' or 'both'
           !chancfg.sts || 'q' == chancfg.sts[0] || 'q' == chancfg.sts[1])) ||
           !lftp
        ){
            return make_cwd_spwan_up_down_lftps(chancfg, on_done)
        } else {
            err = '~lftp runs || no config || up/down status = "quit+quit"'
            break
        }
    // - app data transmission -
    case 'stop':// same as in test below
        if(chancfg && lftp && lftp.loop){
            clearInterval(lftp.loop)
            lftp.loop = null
            chancfg.sts = chancfg.sts.slice(0, 2) + 's| stop app data\n'

            return setImmediate(on_done)// no async calls here
        } else {
            err = '~stop fail: !chancfg || !lftp || !lftp.loop'
            break
        }
    case 'go':// same as in test below
        if(chancfg && lftp && !lftp.loop){
            lftp.loop = setInterval(lftp_loop, 1024 * (chancfg.interval || 4))
            chancfg.sts = chancfg.sts.slice(0, 2) + 'g| go app data transmission\n'

            return setImmediate(on_done)// no async calls here
        } else {
            err = '~go fail: !chancfg || !lftp || lftp.loop'
            break
        }
    case 'api.lftp.send':
        log('lftp: start of test loop run')
        api.lftp.send('suprolftpd', what)
        if(chancfg && lftp && !lftp.loop){// 'go' commands from above
            lftp.loop = setInterval(lftp_loop, 1024 * (chancfg.interval || 4))
            chancfg.sts = chancfg.sts.slice(0, 2) + 'g| go app data transmission\n'
        }//====
        return setImmediate(on_done)// no async calls here
    case 'api.lftp.on':
        api.lftp.on('suprolftpd',
        function test_api_lftp_on(obj, json, cb){
        var chancfg = chs[obj]

            if(!cb) throw new Error('~lftp:no_module.on_final_callback')

            if(chancfg && lftp && lftp.loop){// 'stop' commands from above
                clearInterval(lftp.loop)
                lftp.loop = null
                chancfg.sts = chancfg.sts.slice(0, 2) + 's| stop app data\n'
            }//====
            if(!chancfg){
                api.wes.broadcast('wes4store',{
                    err: chancfg = '~lftp:no_object_for_file',
                    obj: obj,
                    json:json
                })
                return cb(chancfg)// err
            } else {
                wes({
                    id: obj,
                    sts: chancfg.sts.slice(0, 4) + JSON.stringify(json)
                })
            }
            return cb(null)
        })

        if(lftp && lftp.sh_dn){
        // self test must take files from 'upload/' where they were sent
        // NOTE: same commands (except from 'upload/') as in lftp_loop() are used here
            what = 'GLOB' == local.cfg.OBJ ? 'dn' : 'up'
            return lftp.sh_dn.stdin.write('\
get -c -E ../' + what + 'load/zzzzzzz.zzz && (mget -c -E ../'
               + what + 'load/*suprolftpd*.json && !echo DN * . || echo ER)\n',
                on_done
            )
        } else {
            err = '~no lftp down runs for test'
            break
        }
    case 'dev':
        return ret.dev = (local.dev = !local.dev), setImmediate(on_done)// no async calls here
    default:
        if(lftp && lftp.sh_up &&
           req.session.can['App.suprolftpd.view.ControlTools'])
        {
            return lftp.sh_up.stdin.write(what.cmd + '\n', 'utf8', on_done)
        } else {
            err = '~no lftp runs || access denied'
        }
    }
    if(err){// application error
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

// TEST: an object by own channel sends only to GLOB, receives only from GLOB
// ~~~~
// GLOB: sends to all (i.e all configured channels), receives from all objects
// ~~~~  outcoming info goes via 'download' i.e. for object to *download*
//       incoming info goes via 'upload' i.e. gets what object *uploaded*
// -- OBJ to GLOB --
// TEST -> $PWD/data/suprolftpd/TEST/upload/_123123123-userman_TEST.json
// INET "up" sftp://1.2.3.4:567/lftp/upload
// GLOB <= $PWD/data/suprolftpd/TEST/upload/_123123123-userman_TEST.json
// -- GLOB to OBJ --
// GLOB -> $PWD/data/suprolftpd/TEST/dnload/_123123123-userman_TEST.json
// INET "dn" sftp://1.2.3.4:567/lftp/dnload
// TEST <= $PWD/data/suprolftpd/TEST/dnload/_123123123-userman_TEST.json
//
// NOTE: file names must NOT have spaces

function lftp_recv(dir, filestr){
var m, s, f, mod, obj, files

    files = filestr.split(' ')// output of 'echo DN * .' from `lftp` stdio below
    // first and last items are prefix && terminator; check RE
    for(f = 1; f < files.length - 1; ++f) if((mod = files[f].match(RE))){
        for(m in local.app_modules) if(m == mod[1]){
            obj = mod[2]
            mod = local.app_modules[m]
            mod.on && local.require.fs.readFile(
                s = dir + files[f],
                { encoding:'utf8'},
                lftp_recv_mkcb(mod, obj, s)
            )
            mod = null
        }
        if(mod){
            log('unhandled file (no module or handler): ', mod)
            api.wes.broadcast('wes4store',{
                err: '~lftp:no_module_or_handler_for_file',
                obj: obj
            })
        }
    }
}

// any error leaves file for another cycle
// if `unlink()` fails and file is left for another cycle then
// recv modules's handler must check for possible duplicate info, not this one
function lftp_recv_mkcb(mod, obj, filename){
    return function on_read(err, str){
        return !err && mod.on(obj, JSON.parse(str), on_event)

        function on_event(err){
            if(err) log('!Error lftp module: '+ mod +', obj: '+ obj +', err: '+ err)
            else local.require.fs.unlink(filename, lftp_loop_done)
        }
    }
}

function lftp_loop(){
var m, obj, fname, data

    /* == recv == NOTE: file names must NOT have spaces; TODO ZIP */
    for(obj in lftps) if((data = lftps[obj]) && data.sh_dn) data.sh_dn.stdin.write('\
get -c -E zzzzzzz.zzz && (mget -c -E * && !echo DN * . || echo ER)  \n\
',// this chain of commands gets all files and flag 'zzzzzzz.zzz'
  // getting *only* the flag file doesn't trigger any further processing
        lftp_loop_done
    )// stdout calls `lftp_recv(cwd, 'DN * .')` above
     // NOTE: test in 'do' 'api.lftp.on' uses this same commands

    /* == send == */
    for(m in local.app_modules){// cache
        data = local.app_modules[m]
        data.send.length && (data.str = JSON.stringify(data.send), fname = '@')
    }
    if(!fname) return// empty send queues

    fname = '/upload/_' + new Date().valueOf() + '-'
    for(obj in lftps) if(lftps[obj]){// object: one channel; GLOB: all channels
        for(m in local.app_modules){
            data = local.app_modules[m]
            data.str && local.require.fs.writeFile(
                local.cfg.data_path + obj + fname + m + '_' + obj + '.json',
                data.str,
                lftp_send_mkcb(obj, data)
            )
        }
    }
}

function lftp_send_mkcb(obj, data){
    return function lftp_send_cb(err){
        if(err){
            log(err)
            chs[obj].sts = 'e' + chs[obj].sts.slice(1, 4) + err

            return wes(chs[obj])
        }

        data.str = '', data.send.splice(0)
/* no ZIP: no spaces in filenames allowed, many files is less effective */
// upload parts into transitional './.proc/' directory
// use flag file 'zzzzzzz.zzz' to be very last uploaded
// thus signaling about full upload
        return lftps[obj].sh_up.stdin.write('\
!echo -n >zzzzzzz.zzz\n\
!for f in * ; do echo "mv .proc/$f ./" ; done >>.mv.lftp\n' +
' mput  -c -O .proc -E * && ' +
'(source .mv.lftp ; !rm .mv.lftp) && echo OK || (!sed -n p .mv.lftp ; echo ER)\n\
',
            'utf8', lftp_loop_done
        )
/* TODO: tar --totals -z gzip; find -size -cfg.max_file_size -type f -print */
    }
}

function lftp_loop_done(err){
    err && log('lftp loop err: ', err)
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

    local.sh = '/bin/lftp -e echo'.split(' ')// './' -> "$PWD"

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
   ,lftp = lftps[chancfg.id]
   ,d = new Date

    if(!chancfg.auth){
        chancfg.sts = 'ees| no auth'
        wes(chancfg)
        return cb && cb()
    }
    if(!chancfg.sts){
        chancfg.sts = 'qqs| initial starting'
    }
    if(!lftp) lftp = lftps[chancfg.id] = {
       sh_up: null,// for uploading (separate dir and lftp logs)
       sh_dn: null,// for downloading
       loop: null,// setInterval() for doing the job
       log: null// common app log
    }

    // one app log file for both channels, but `lftp` logs are in own up/down dirs
    return local.require.mkdirp.mkdirp(cwd + '/upload/', function(){
           local.require.mkdirp.mkdirp(cwd + '/dnload/', open_log)})

    function open_log(){
        if(lftp.log) return spwan_up_down_lftps()

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

        return void 0
    }

    function spwan_up_down_lftps(){
    var err, dir, st, sh

        if(!lftp.sh_up){
            dir = cwd + '/upload/'
            st = 'up'
        } else if(!lftp.sh_dn){
            dir = cwd + '/dnload/'
            st = 'dn'
        } else {// in case if one of channels didn't work
            return cb && cb()
        }

        log('^ spawn "' + chancfg.id + ':' + st + '" \n' + d.toISOString())
        sh = lftp['sh_' + st] = local.require.cp.spawn(// 'sh_up' || 'sh_dn'
            process.cwd() + local.sh[0], local.sh.slice(1),{
                cwd: dir,
                env:{
                    LANG: 'C',// expected `lftp` stdio messages
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

        if(!lftp.loop){
            lftp.loop = setInterval(lftp_loop, 1024 * (chancfg.interval || 4))
            chancfg.sts = chancfg.sts[0] + chancfg.sts[1] + 'g'
            //fs.closeSync(fs.openSync(remote_p + 'zog' + trans_objects[e] ,'a'))
        }

        sh.on('error', function(err){
            throw err// system or programming error
        })

        sh.on('close',(
        function(st, lftp, chancfg){
            return function on_lftp_close(code){
            log('$ `lftp` "'+ st + '" quit code: ', String(code))
            lftp['sh_' + st] = void 0
            chancfg.sts = (st == 'up'? 'q'  + chancfg.sts[1]:
                      chancfg.sts[0] + 'q') + chancfg.sts[2]+
                      '|"'+ st + '" quit: ' + code + '\n'
                          + new Date().toISOString()
            if('qq' == chancfg.sts.slice(0, 2)){// full stop of both channels
                clearInterval(lftp.loop)
                lftp.loop = null
                lftp.log.end()
                lftp.log = null
                chancfg.sts = 'qqs' + chancfg.sts.slice(3)
                lftps[chancfg.id] = void 0
            }
            wes(chancfg)
        };})(st, lftp, chancfg))

        sh.stdout.on('data',(
        function(st, lftp, chancfg, sh, dir){
        var buf = ''
            return function(chunck){
            chunck = '' + chunck

            // setup once and suppose there will be no such messages while working
            if(!buf && '\n' == chunck){// first message form `lftp -e echo` is: '\n'
                chunck = 'GLOB' == local.cfg.OBJ ? st == 'up' ? 'dn' : 'up' : st
//# Error messages on STDOUT must have prefix 'ER'
//# lftp> `set` && `lpwd`: setup and show local working directory
//# lftp> open connection
//# lftp> cd to remote working directory making it if not there yet
//# lftp> strip auth info form `pwd` by `sed`
                chunck = '\
set cache:enable false                               \n\
set cmd:interactive false                            \n\
set cmd:move-background false                        \n\
set cmd:long-running 4                               \n\
set net:max-retries 4                                \n\
set net:timeout 4                                    \n\
set net:reconnect-interval-base 4                    \n\
set net:reconnect-interval-multiplier 1              \n\
set xfer:disk-full-fatal true                        \n\
set xfer:clobber on                                  \n\
lpwd                                                 \n\
open -u ' + chancfg.auth + ' ' + local.cfg.host + ' && \
cd '      + chunck + 'load && cd .. || (mkdir -p '
          + chunck + 'load/.proc    && echo created) \n\
cd '      + chunck + 'load          && pwd | sed s_/[^@]*@_//_' +
                     '              || echo ER cd    \n\
'
                return sh.stdin.write(chunck)// issue initial channel commands
            }// end setup

            /* == recv data == */
            if('DN' == chunck.slice(0, 2)){
                buf += '+'// start collecting full output
            }
            if(buf){// collect full output with all received files
                buf += chunck// collect full output
                if(' .\n' == buf.slice(buf.length - 3, buf.length)){
                    lftp_recv(dir, buf)
                    chancfg.sts = chancfg.sts.slice(0, 4) + '"'+ st + '" ' + buf
                    buf = ''// stop collecting
                    wes(chancfg)
                }
                return lftp.log.write(chunck)
            }

            /* == other output == */
            //# Error messages on STDOUT must have prefix 'ER'
            if('ER' == chunck.slice(0, 2)){
                chancfg.sts = (st == 'up'? 'e'  + chancfg.sts[1]:
                          chancfg.sts[0] + 'e') + chancfg.sts[2]+
                                '|"'+ st + '" ' + chunck
            } else {
                chancfg.sts = chancfg.sts.slice(0, 4) +
                              local.cfg.OBJ +' "'+ st + '" ' + chunck
            }
            wes(chancfg)

            return lftp.log.write(chunck)
        };})(st, lftp, chancfg, sh, dir))

        sh.stderr.on('data',(
        function(st, lftp, chancfg){
        var buf = ''
            return function(chunck){
            buf += chunck
//debug: App.backend.req('/suprolftpd/lib/cnl/do',{ cmd:"dev"})
local.dev && lftp.log.write(buf)
            if('\n' != buf[buf.length - 1]) return// wait for full string

            if(buf && ~buf.indexOf('zzzzzzz.zzz')){
            // `dnload` no info to download: 'No such file (zzzzzzz.zzz)'
            // full text:  'get: Access failed: No such file (zzzzzzz.zzz) '
            // isn't an error, skip completely
            //
            // `upload` peer doesn't download: 'Failure (.proc/zzzzzzz.zzz)'
            // full text:   'mv: Access failed: Failure (.proc/zzzzzzz.zzz)'
            // isn't an error but warning about remote peer isn't downloading
                if(~buf.indexOf('No such file')){
                    buf = ''
                    return// skip completely
                }
                if(~buf.indexOf('Failure')){
                    chancfg.sts = chancfg.sts.slice(0, 4) + (buf = 'zzzz')
                }
            } else if(!~buf.indexOf('no files found') && // if fatal error
                      !~buf.indexOf('No such file')){    // change status
                // `lftp` can not check file/dir existance directly
                // trying commands is the only way;
                // thus such errors in that commands are not app errors
                chancfg.sts = (st == 'up'? 'e'  + chancfg.sts[1]:
                          chancfg.sts[0] + 'e') + chancfg.sts[2]+
                          '|"'+ st + '" err: ' + buf
            }
            wes(chancfg)
            lftp.log.write(buf)
            buf = ''
        };})(st, lftp, chancfg))

        if(st == 'up'){// upload status
            chancfg.sts = 'r' + chancfg.sts[1] + chancfg.sts[2]
        } else {       // download
            chancfg.sts = chancfg.sts[0] + 'r' + chancfg.sts[2]
        }
        chancfg.sts += '|"' + st + '" runs pid: ' + sh.pid  + '\nin: ' + dir + '\n'
                    + d.toISOString() + '\n'
        wes(chancfg)
        log('^ `lftp` ' + chancfg.sts)
        lftp.log.write('^ ' + chancfg.sts)

        if(!lftp.sh_dn){// initial upload, download runnnig
            return spwan_up_down_lftps()
        }
        return cb && cb()// probable single failed channel re-run
    }
}
}
