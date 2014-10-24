App.cfg['App.suprolftpd.view.LFTPD'] = {
    __noctl: true,// view-only stuff uses fast init
    extend: App.view.Window,
    title: l10n.lftpd.title,
    wmTooltip: l10n.lftpd.modname,
    wmImg: App.backendURL + '/css/suprolftpd/crossroads.png',
    wmId: 'suprolftpd.view.LFTPD',
    id: 'suprolftpd-view-LFTPD',
    requires:['App.suprolftpd.view.ControlTools'],
    width: 777, height: 477,// initial
    layout: 'hbox',
    autoScroll: true,
    initComponent: function initSuproLFTPDViewComponent(){
    var me = this

        me.callParent()
        me.setLoading(true)
        me.on('destroy', function(){
           App.backend.req('/suprolftpd/lib/dev')
        })
        // further setup using backend data
        return App.backend.req('/suprolftpd/lib/cnl/get',
        function(err, lftpds){
        var store, i, records

            if(err) return Ext.Msg.alert({
                buttons: Ext.Msg.OK,
                icon: Ext.Msg.ERROR,
                title: 'lftpd load fail',
                msg: Ext.encode(lftpds).replace(/\\n/g, '<br>'),
                fn: function(btn){
                    //if('yes' == btn)...
                }
            })
            store = Ext.create(App.store.LFTPD,{
                storeId: 'lftpds'
            })
            records = [ ]
            for(i in lftpds.data){// open code loadData()
                records.push(store.createModel(lftpds.data[i] || { id: i }))
            }
            store.loadRecords(records)
            me.add(getItems(store))

            return me.setLoading(false)
        })

        function getItems(store){
            return [
            {
                xtype: 'component',
                html: '<img class="rotate" src="/css/suprolftpd/crossroads.png"></img>',
                padding: 7,
                width: 77,
                itemId:'log'
            },
            {
                xtype: 'tabpanel',
                height: '100%', border: 0, flex: 1,
                items:[
                {
                    closable: false, reorderable: false,
                    xtype: 'grid',
                    iconCls: 'ld-icon-chs',
                    title: l10n.lftpd.channels,
                    store:store,
                    columns:[
                    {
                        dataIndex: 'sts', text: '<img src="/css/suprolftpd/link_status.png"></img>&#160',
                        width: 29,
                        defaultRenderer: statusRenderer
                    },
                        { text: 'id',  dataIndex: 'id', width: 77 },
                        { text: 'txt', dataIndex: 'txt', flex: 1 },
                        { text: 'Phone', dataIndex: 'phone' }
                    ]
                }]
            }]
        }

        function statusRenderer(value, meta){
            if(0 == value.indexOf('exit')){
                meta.tdCls = 'ld-lsts-g'
                meta.tdAttr = 'data-qtip="Exit"'
            } else if(0 == value.indexOf('stop')){
                meta.tdCls = 'ld-lsts-b'
                meta.tdAttr = 'data-qtip="Configured"'
            } else if(0 == value.indexOf('err')){
                meta.tdCls = 'ld-lsts-e'
                meta.tdAttr = 'data-qtip="Error"'
            } else if(0 == value.indexOf('run')){
                meta.tdCls = 'ld-lsts-r'
                meta.tdAttr = 'data-qtip="Runs"'
            } else if(0 == value.indexOf('feed')){
                meta.tdCls = 'ld-lsts-f'
                meta.tdAttr = 'data-qtip="Feeds/ data activity"'
            } else {
                meta.tdCls = 'ld-lsts-k'
                meta.tdAttr = 'data-qtip="Exists, no config"'
            }
            return ''
        }

        /*this.dockedItems = [
        {
            xtype: 'toolbar',
            dock: 'top',
            items:['-',
            {
                xtype: 'component',
                html: l10n.lftpd.status,
                itemId: 'status'
            },'->','-',
            {
                text: l10n.lftpd.refreshLog
               ,iconCls: 'sm-rl'
               ,handler: function(toolbar){
                    App.backend.req('/suprolftpd/lib/api/log',
                    function(err, json){
                        if(!err && 'string' == typeof json){// expecting text
                            err = toolbar.up('panel')
                            err.down('#log').update(
                                '<pre>' + json + '</pre>'
                            )
                            err.scrollBy(0, 1 << 22, false)
                            return
                        }
                        // json = { success: false, err: "foo" }
                        Ext.Msg.show({
                            title: l10n.errun_title,
                            buttons: Ext.Msg.OK,
                            icon: Ext.Msg.ERROR,
                            msg: l10n.errapi + '<br><b>' + json.err + '</b>'
                        })
                    })
                }
            },
            {
                text: l10n.stsClean
               ,iconCls: 'sm-cl'
               ,handler: function(toolbar){
                    toolbar.up('panel').down('#log').update('')
                }
            }
            ]
        },
            Ext.create('App.suprolftpd.view.ControlTools')
        ]*/
    }
}

Ext.define('App.model.LFTPD',{
    extend: Ext.data.Model,
    fields:['id', 'sts', 'txt']
   ,constructor: function(cfg){
        App.cfg.modelBase.c9r.call(this, cfg)
    }
})

Ext.define('App.store.LFTPD',{
    extend: Ext.data.ArrayStore,
    model: App.model.LFTPD
})
