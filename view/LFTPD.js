/*
 * lftp channels controlling and status
 */
Ext.define('App.model.LFTPD',{
    extend: App.model.Base,
    fields:[
        // `chancfg.sts`: status 3-chars for 3 status info:
        // [0]-  upload status:'r'un/'q'uit
        // [1]-download status:'r'un/'q'uit
        // [2]-transport queue:'g'o /'s'top
        { name:'sts', persist: false },
        { name:'txt', persist: false },
        { name:'id',  persist: false }
    ]
})

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
        // common tools on bottom for both channels in grid rows and log tabs
        me.dockedItems = [ new App.suprolftpd.view.ControlTools ]

        me.callParent()
        setTimeout(function(){
            me.setLoading(true)
        },0)
        me.on('destroy', function(){
           App.backend.req('/suprolftpd/lib/dev')
        })
        // further setup using backend data
        return App.backend.req('/suprolftpd/lib/cnl/get',
        function(err, lftpds){
        var Model, store, i, m, records
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
                m = new Model(lftpds.data[i] || { id: i })
                m.on('datachanged', changedModel)
                records.push(m)
            }
            store.loadRecords(records)
            // setup UI
            me.add(getItems(store))
            records = me.down('#tools')// if allowed bind toolbar to grid
            records && records.bindGrid(me.down('grid'))
            tabs = me.down('tabpanel')

            return setTimeout(function(){
                me.setLoading(false)
            },0)
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
                    listeners:{ itemdblclick: itemdblclick, activate: activate },
                    columns:[
                    {
                        dataIndex: 'sts', text:'<img src="' + App.backendURL +
                        '/css/suprolftpd/upload.png" width="21" height="21"></img>',
                        tooltip: l10n.lftpd.sts.upload,
                        width: 34,
                        menuDisabled: true,
                        defaultRenderer: uploadRenderer
                    },
                    {
                        dataIndex: 'sts', text:'<img src="' + App.backendURL +
                        '/css/suprolftpd/download.png" width="21" height="21"></img>',
                        tooltip: l10n.lftpd.sts.download,
                        width: 34,
                        menuDisabled: true,
                        defaultRenderer: downloadRenderer
                    },
                    {
                        dataIndex: 'sts', text:'<img src="' + App.backendURL +
                        '/css/suprolftpd/feed.png"></img>',
                        tooltip: l10n.lftpd.sts.transport,
                        width: 29,
                        menuDisabled: true,
                        defaultRenderer: transportRenderer
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

        function uploadRenderer(value, meta){
            meta.tdAttr = 'data-qtip="' + l10n.lftpd.sts[value[0]] + '"'
            return '<img sts src="' + App.backendURL +
                   '/css/suprolftpd/' + value[0] + '.png">'
        }

        function downloadRenderer(value, meta){
            meta.tdAttr = 'data-qtip="' + l10n.lftpd.sts[value[1]] + '"'
            return '<img sts src="' + App.backendURL +
                   '/css/suprolftpd/' + value[1] + '.png">'
        }

        function transportRenderer(value, meta, model){
            meta.tdAttr = 'data-qtip="' + l10n.lftpd.sts[value[2]] + '"'
            return '<img sts src="' + App.backendURL +
                   '/css/suprolftpd/' + value[2] + '.png">'
        }

        function changedModel(m, updated){
        var panel, el, out = true

            if(~updated.indexOf('sts')){
                if(m.data.prests === m.data.sts[0]){
                    out = false// no real change -- don't do default highlight
                    // even with this filter highlighting is being done long
                    // after all changes are gone; this is because animation
                    // repetition is checked on element basis, but here row
                    // is updated by `renderer` thus all amin elements are new
                }
                m.data.prests = m.data.sts[0]
                panel = tabs.items.getByKey(m.data.id)
                if(panel){
                    el = document.createElement('div')
                    el.innerHTML = m.data.sts
                    panel.down('#log').getEl().dom.appendChild(el)
                    panel.body.scroll('b', 1 << 22)// 'autoScroll' is here
                    el = void 0
                }
            }
            return out
        }

        /*function unModel(){
            model.un('datachanged', changedModel)
        }*/

        function itemdblclick(view){
        var model = view.selModel.getSelection()[0]
           ,ch = model && model.data.id
           ,panel

            if(!ch) return

            if(!tabs.items.getByKey(ch)){
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
                    listeners:{ activate: selectModel },
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

            return

            function selectModel(){
                view.selModel.select(model)
            }

            function refreshLog(){
                App.backend.req('/suprolftpd/lib/cnl/log',{ id: ch },
                function(err, json){
                    if(!err && 'string' == typeof json){// expecting text
                        panel.down('#log').update(json)
                        activate(panel)
                        return
                    }
                    // json = { success: false, err: "foo" }
                    Ext.Msg.show({
                        title: l10n.errun_title,
                        buttons: Ext.Msg.OK,
                        icon: Ext.Msg.ERROR,
                        msg: l10n.errapi + '<br><b>' + l10n.lftpd[json.err] + '</b>'
                    })
                })
            }
            function cleanLog(){
                panel.down('#log').update('')
            }
        }

        function activate(panel){
            panel.scrollBy(0, 1 << 22, false)
        }
    }
}
