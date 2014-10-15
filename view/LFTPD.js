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
    initComponent: function initSuproMongoDBComponent(){
    var me = this

        me.items = [
        {
            xtype: 'component',
            html: '<img class="rotate" src="/css/suprolftpd/crossroads.png"></img>',//l10n.lftpd.noload,
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
            store:{
                fields:['s', 'name', 'obj', 'pingt', 'files', 'kbytes'],
                data:[
{ s:'r','name': 'Lisa',  "email":"lisa@simpsons.com",  "phone":"555-111-1224"  },//run arrow lftp executed and runs waiting for commands
{ s:'f','name': 'Homer', "email":"home@simpsons.com",  "phone":"555-222-1244"  },//feed lftpd with data
{ s:'e','name': 'Bart',  "email":"bart@simpsons.com",  "phone":"555-222-1234" },// error
{ s:'b','name': 'Homer', "email":"home@simpsons.com",  "phone":"555-222-1244"  },// blue some progress
{ s:'k','name': 'Homer', "email":"home@simpsons.com",  "phone":"555-222-1244"  },//black no object linked
{ s:'g','name': 'Marge', "email":"marge@simpsons.com", "phone":"555-222-1254"  }// green object connected
                ]
            },
            columns:[
            {
                dataIndex: 's', text: '<img src="/css/suprolftpd/link_status.png"></img>&#160',
                width: 29,
                defaultRenderer: function(value, meta){
                    meta.tdCls = 'ld-lsts-' + (value || 'r')
                    return ''
                }
            },
                { text: 'Name',  dataIndex: 'name' },
                { text: 'Email', dataIndex: 'email', flex: 1 },
                { text: 'Phone', dataIndex: 'phone' }
            ]}
            ]
        }
        ]

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
        this.callParent()

        this.on('destroy', function(){
           App.backend.req('/suprolftpd/lib/dev')
        })
    }
}
