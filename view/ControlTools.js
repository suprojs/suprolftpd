/*
 * for RAD/hot swap/reloading move this back into main view
 */
Ext.define('App.suprolftpd.view.ControlTools',{
    extend: Ext.toolbar.Toolbar,
    dock: 'bottom',
    itemId: 'tools',
    bindGrid: null,
    initComponent: function initControlTools(){
    var me = this, SM, udload, trans

        me.items = [
        { xtype: 'tbspacer', width: 74 },'-',
        '<img src="' +
            App.backendURL +
        '/css/suprolftpd/upload.png" width="21" height="21"></img><img src="' +
            App.backendURL +
        '/css/suprolftpd/download.png" width="21" height="21"></img>',
        {
            text: l10n.lftpd.run
           ,iconCls: 'ld-icon-run'// quit
           ,handler: doLFTP
        },'-',
        {
            xtype: 'tbtext',
            listeners:{
                afterrender:
                function bindTriggerTooltip(){
                    Ext.widget('tooltip',{
                        target: this.getEl(),
                        html: l10n.lftpd.toolHelp
                    })
                }
            },
            text: l10n.lftpd.toolHelp,
            style: 'overflow: hidden;',
            flex: 1
        },'-',
        {
            text: l10n.lftpd.go
           ,iconCls: 'ld-icon-go'// stop
           ,handler: doLFTP
        }]
        me.bindGrid = bindGrid
        me.callParent()

        udload = me.down('button[iconCls=ld-icon-run]')
        trans = me.down('button[iconCls=ld-icon-go]')
        if(!trans || !udload){
            throw new Error('Buttons not found: iconCls=ld-icon-run || ld-icon-go')
        }
        // todo add new/edit channel
        return

        function bindGrid(grid){
            SM = grid.getSelectionModel()
            grid.on('select', select)
            grid.store.on('datachanged', datachanged)
            SM.select(0)
        }

        function datachanged(){
        var chan = SM.getSelection()[0]
        /// apply possibly new tool's state
            chan && select(null, chan)
        }

        function select(sm, model){
            if('q' == model.data.sts[0] || 'q' == model.data.sts[1]){
                udload.setIconCls('ld-icon-run').setText(l10n.lftpd.run)
            } else if('b' == model.data.sts[0] && 'b' == model.data.sts[1]){
                udload.disable(), trans.disable()
                return
            } else {
                udload.setIconCls('ld-icon-quit').setText(l10n.lftpd.quit)
            }
            if('s' == model.data.sts[2] && 'b' != model.data.sts[2]){
                trans.setIconCls('ld-icon-go').setText(l10n.lftpd.go)
            } else {
                trans.setIconCls('ld-icon-stop').setText(l10n.lftpd.stop)
            }
            udload.enable(), trans.enable()
        }
        // common button handler for a channel; returned status is set into model
        function doLFTP(btn){
        var chan = SM.getSelection()[0]

            return chan && App.backend.req(
                '/suprolftpd/lib/cnl/do',
                {
                    id: chan.data.id,
                    cmd: btn.iconCls.slice(8)// 'ld-icon-run,quit,go,stop'
                },
            function(err, json){
                if(!err && json && json.success){
                    chan.set(json)
                    return
                }

                Ext.Msg.show({// window-constrained msgbox doesn't work
                    title: l10n.errun_title,
                    buttons: Ext.Msg.OK,
                    icon: Ext.Msg.ERROR,
                    msg: '<b>' + json.err.replace(/\r*\n/g, '<br>') + '</b>'
                })
            })
        }
    }
})
