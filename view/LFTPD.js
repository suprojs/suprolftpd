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
            records = me.down('#tools')
            records && records.bindGrid(me.down('grid'))

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
            value || (value = 'b')
            meta.tdAttr = 'data-qtip="' + l10n.lftpd.sts[value[0]] + '"'
            return '<img src="' + App.backendURL +
                   '/css/suprolftpd/' + value[0] + '.png">'
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
