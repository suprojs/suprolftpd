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
    layout: 'fit',
    bodyStyle:
'font-family: "Terminus" monospace; font-size: 10pt;' +
'background-color: black; color: #00FF00;',
    autoScroll: true,
    initComponent: function initSuproMongoDBComponent(){
        this.items = [
        {
            xtype: 'component',
            html: l10n.lftpd.noload,
            itemId:'log'
        }
        ]
        this.dockedItems = [
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
        ]
        this.callParent()

        this.on('destroy', function(){
           App.backend.req('/suprolftpd/lib/dev')
        })
    }
}
