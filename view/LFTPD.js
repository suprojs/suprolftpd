Ext.ns ('App.suprolftpd.view.LFTPD')    // define ns for class loader
App.cfg['App.suprolftpd.view.LFTPD'] = {// fast init
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
    var me = this, tabs
        // common tools for both channels in grid rows and tabs
        me.dockedItems = [ new App.suprolftpd.view.ControlTools ]

        me.callParent()
        me.setLoading(true)
        me.on('destroy', function(){
           App.backend.req('/suprolftpd/lib/dev')
        })
        // further setup using backend data
        return App.backend.req('/suprolftpd/lib/cnl/get',
        function(err, lftpds){
        var Model, store, i, records
            // connection or app logic errors
            if(err || !lftpds.success) return Ext.Msg.alert({
                buttons: Ext.Msg.OK,
                icon: Ext.Msg.ERROR,
                title: 'lftpd load fail',
                msg: Ext.encode(lftpds).replace(/\\n/g, '<br>'),
                fn: function(btn){
                    //if('yes' == btn)...
                }
            })
            store = Ext.create(App.store.WES,{// setup data
                storeId: 'lftpd',
                view: me,
                model: Model = App.model.LFTPD
            })
            records = [ ]
            for(i in lftpds.data){// open code loadData()
                records.push(new Model(lftpds.data[i] || { id: i }))
            }
            store.loadRecords(records)
            // setup UI
            me.add(getItems(store))
            records = me.down('#tools')// if allowed bind toolbar to grid
            records && records.bindGrid(me.down('grid'))
            tabs = me.down('tabpanel')

            return me.setLoading(false)
        })

        function getItems(store){
            return [
            {
                xtype: 'component',
                html:'<img class="rotate" src="' + me.wmImg + '"></img>',
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
                    listeners:{ itemdblclick: itemdblclick },
                    columns:[
                    {
                        dataIndex: 'sts', text:'<img src="' + App.backendURL +
                               '/css/suprolftpd/link_status.png"></img>&#160',
                        width: 29,
                        defaultRenderer: statusRenderer
                    },
                    {
                        dataIndex: 'id', text: '<img src="' + App.backendURL +
                                   '/css/suprolftpd/link_go.png"></img>&#160',
                        width: 77
                    },
                        { text: 'txt', dataIndex: 'txt', flex: 1 },
                        { text: 'Phone', dataIndex: 'phone' }
                    ]
                }]
            }]
        }

        function statusRenderer(value, meta){
            value || (value = 'b')
            meta.tdAttr = 'data-qtip="' + l10n.lftpd.sts[value[0]] + '"'
            return '<img src="' + App.backendURL +
                   '/css/suprolftpd/' + value[0] + '.png">'
        }

        function itemdblclick(view){
        var model = view.selModel.getSelection()[0]
           ,ch = model && model.data.id
           ,panel

            if(!ch) return

            if(!tabs.items.getByKey(ch)){
                model.on('datachanged', changedModel)
                panel = tabs.add(
                {
                    xtype: 'panel',
                    iconCls: 'ld-icon-chan',
                    title: ch + ': ' + model.data.txt,
                    itemId: ch,
                    closable: true,
                    bodyStyle:
                    'font-family: "Lucida Console" monospace; font-size: 10pt;' +
                    'background-color: black; color: #00FF00;',
                    autoScroll: true,
                    listeners:{ activate: selectModel, close: unModel },
                    dockedItems:[
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
                           ,handler: refreshLog
                        },
                        {
                            text: l10n.stsClean
                           ,iconCls: 'sm-cl'
                           ,handler: cleanLog
                        }
                        ]
                    }],
                    items:[
                    {
                        xtype: 'component',
                        style: 'white-space: pre-wrap',
                        html: l10n.lftpd.noload + '\n',
                        itemId:'log'
                    }
                    ]
                })
            }
            tabs.setActiveTab(ch)
            refreshLog()

            return

            function changedModel(m, updated){
                if(~updated.indexOf('sts') && tabs.items.getByKey(m.data.id)){
                    panel.down('#log').getEl().dom.innerHTML += m.data.sts
                    panel.body.scroll('b', 1 << 22)// 'autoScroll' is here
                }
            }

            function unModel(){
                model.un('datachanged', changedModel)
            }

            function selectModel(){
                view.selModel.select(model)
            }

            function refreshLog(){
                App.backend.req('/suprolftpd/lib/cnl/log',{ id: ch },
                function(err, json){
                    if(!err && 'string' == typeof json){// expecting text
                        panel.down('#log').update(json)
                        panel.scrollBy(0, 1 << 22, false)
                        return
                    }
                    // json = { success: false, err: "foo" }
                    Ext.Msg.show({
                        title: l10n.errun_title,
                        buttons: Ext.Msg.OK,
                        icon: Ext.Msg.ERROR,
                        msg: l10n.errapi +
                            '<br><b>' + l10n.lftpd[json.err] + '</b>'
                    })
                })
            }
            function cleanLog(){
                panel.down('#log').update('')
            }
        }
    }
}

Ext.define('App.model.LFTPD',{
    extend: App.model.Base,
    fields:[
        { name:'id',  persist: false },
        { name:'sts', persist: false },
        { name:'txt', persist: false }
    ]
})
