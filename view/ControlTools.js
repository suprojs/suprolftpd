Ext.define('App.suprolftpd.view.ControlTools',{
    extend: Ext.toolbar.Toolbar,
    dock: 'bottom',
    initComponent: function initSuprolftpdView(){
    var me = this

        /*this.items = ['-','suprolftpd: ',{
            text: l10n.stsEcho
           ,iconCls: 'sg-e'
           ,handler: todo
        },'->','-',{
            text: l10n.stsStopSystem
           ,iconCls: 'sg-s'
           ,handler: todo
        },'-',{
            text: l10n.stsRestart
           ,iconCls: 'sg-r'
           ,handler: todo
        },'-','->',{
            text: l10n.stsKill
           ,iconCls: 'sg-k'
           ,handler: todo
        }]*/
        me.callParent()

        return

        /*function todo(){
            Ext.Msg.show({
                title: l10n.errun_title,
                buttons: Ext.Msg.OK,
                icon: Ext.Msg.ERROR,
                msg: 'TODO'
            })
        }*/
    }
})
