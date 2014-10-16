/*
 * Reloaded API code: channels control
 */

function suprolftpdChannels(ret, api, local, req, res, next){
    switch(local.url.pathname){
        case '/cfg': ret.data = local.cfg
            break
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

return suprolftpdChannels(ret, api, local, req, res, next) || true// async always
