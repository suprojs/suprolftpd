/*
 * for RAD/hot swap/reloading move this back into main view
 */
Ext.define('App.suprolftpd.view.ControlTools',{
    extend: Ext.toolbar.Toolbar,
    dock: 'bottom',
    itemId: 'tools',
    bindGrid: null,
    initComponent: function initSuprolftpdView(){
    var me = this, SM, go, quit

        me.items = [
        { xtype: 'tbspacer', width: 74 },'-',
        {
            text: l10n.lftpd.go
           ,iconCls: 'ld-icon-go'
           ,disabled: true
           ,handler: doStartStop
        },'-','->','-',{
            text: l10n.lftpd.quit
           ,iconCls: 'ld-icon-quit'
           ,disabled: true
           ,handler: doStartStop
        },'-']
        me.bindGrid = bindGrid
        me.callParent()

        go = me.down('button[iconCls=ld-icon-go]')
        quit = me.down('button[iconCls=ld-icon-quit]')
        // todo add/edit channel
        return

        function bindGrid(grid){
            SM = grid.getSelectionModel()
            grid.on('select', select)
            grid.store.on('datachanged', datachanged)
        }

        function datachanged(){
        var chan = SM.getSelection()[0]
        /// apply possibly new tool's state
            chan && select(null, chan)
        }

        function select(sm, model){
            switch(model.data.sts[0]){
            case 's':
            case 'q': return quit.disable(), go.enable()// quit, stop -> 'go'
            case 'r': return quit.enable(), go.disable()// runs -> enable `quit`
            //todo: config existing
            default : return quit.disable(), go.disable()
            }
        }

        function doStartStop(btn){
        var chan = SM.getSelection()[0]

            return chan && App.backend.req(
                '/suprolftpd/lib/cnl/do',
                {
                    id: chan.data.id,
                    cmd: 'ld-icon-quit' == btn.iconCls ? 'quit' : 'start'
                },
            function(err, json){
                if(!err && json && json.success){
                    chan.set(json)
                    return
                }
                Ext.Msg.show({
                    title: l10n.errun_title,
                    buttons: Ext.Msg.OK,
                    icon: Ext.Msg.ERROR,
                    msg: l10n.errun_title
                })
            })
        }
    }
})
