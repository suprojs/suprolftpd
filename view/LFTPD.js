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
            store = Ext.create(App.store.WES,{
                storeId: 'lftpd',
                view: me,
                model: Model = App.model.LFTPD
            })
            records = [ ]
            for(i in lftpds.data){// open code loadData()
                records.push(new Model(lftpds.data[i] || { id: i }))
            }
            store.loadRecords(records)
            me.add(getItems(store))
            me.down('#tools').bindGrid(me.down('grid'))

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
                    dockedItems:[ Ext.create('App.suprolftpd.view.ControlTools')],
                    columns:[
                    {
                        dataIndex: 'sts', text:'<img src="' + App.backendURL +
                               '/css/suprolftpd/link_status.png"></img>&#160',
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
            switch(value){
            case 'feed': meta.tdAttr = 'data-qtip="Feeds/ data activity"';break
            case 'quit': meta.tdAttr = 'data-qtip="Quit, no lftp is running"';break
            case 'stop': meta.tdAttr = 'data-qtip="Configured, no autorun"';break
            case 'err' : meta.tdAttr = 'data-qtip="Error"';break
            case 'run' : meta.tdAttr = 'data-qtip="Runs"';break
            default    : meta.tdAttr = 'data-qtip="Exists, no config"';break//'b'lack
            }
            return '<img src="' + App.backendURL +
                   '/css/suprolftpd/' + (value[0] || 'b') + '.png">'
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

//for RAD/hot swap/reloading keep it here before final version
Ext.define('App.suprolftpd.view.ControlTools',{
    extend: Ext.toolbar.Toolbar,
    dock: 'top',
    itemId: 'tools',
    bindGrid: null,
    initComponent: function initSuprolftpdView(){
    var me = this, go, stop

        me.items = [{
            text: l10n.lftpd.go
           ,iconCls: 'ld-icon-go'
           ,disabled: true
           ,handler: todo
        },'-','->','-',{
            text: l10n.lftpd.stop
           ,iconCls: 'ld-icon-stop'
           ,disabled: true
           ,handler: todo
        }]
        me.bindGrid = bindGrid
        me.callParent()

        go = me.down('button[iconCls=ld-icon-go]')
        stop = me.down('button[iconCls=ld-icon-stop]')
        // todo add/edit channel
        return

        function bindGrid(grid){
            grid.on('select', select)
        }

        function select(sm, model){
            switch(model.data.sts[0]){
            case 'q': return stop.disable(), go.enable()// quit -> enable 'go'
            case 'r': return stop.enable(), go.disable()
            //todo: config existing
            default : return stop.disable(), go.disable()
            }
        }

        function todo(){
            Ext.Msg.show({
                title: l10n.errun_title,
                buttons: Ext.Msg.OK,
                icon: Ext.Msg.ERROR,
                msg: 'TODO'
            })
        }
    }
})
