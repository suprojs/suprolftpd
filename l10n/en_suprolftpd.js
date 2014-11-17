l10n.lftpd = { lang: 'en'
    ,modname: 'Data exchange'
    ,tooltip: "launch control of suprolftpd module"
    ,title: 'SUPROs use `lftp` for data exchange via Internet'
    ,refreshLog: 'Refresh log'
    ,noload: '== No log info loaded =='
    ,channels: 'data exchange channels'
    ,chaname: 'channel name'
    ,toolHelp: 'upload and download channels are independent but run and quit togather'
    ,go: 'Start: info exchange'
    ,stop: 'Finish: info exchange'
    ,run:  'Run <b>lftp</b>'
    ,quit: 'Quit <b>lftp</b>'
    ,test: 'Test'
    ,sts:{
        transport:'trasport',
        download:'lftp download',
        upload:'lftp upload',
        r:'Runs',
        q:'Quit',
        f:'Feeds files',
        g:'Go',
        s:'Configured, no autorun, stops',
        e:'Error',
        b:'Exists, is not configured'
    }
    // backend
    ,'~lftp_not_found': 'No lftp was found or wrong `id`'
    ,zzzz: 'warning: Remote peer (object) does not download data!'
    ,ENOENT: 'File not found'
}

l10n['~lftp:no_module_or_handler_for_file'] = "lftp: no module or handler for file"
l10n['~lftp:no_object_for_file'] = "~lftp: no object for file"
