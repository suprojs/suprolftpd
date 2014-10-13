Ext.syncRequire( '/l10n/' + l10n.lang + '_suprolftpd')// require l10n first time

App.view.items_Shortcuts = Ext.Array.push(App.view.items_Shortcuts || [ ],[
{
    text:
'<img height="65" width="65" src="' + App.backendURL +
'/css/suprolftpd/crossroads.png"/>' +
'<br/><br/>' + l10n.lftpd.modname
   ,height: 110 ,minWidth: 92
   ,tooltip: l10n.lftpd.tooltip
   ,handler:
    function suprolftpd(btn){
    var tb = Ext.getCmp('wm').items.getByKey('suprolftpd.view.LFTPD')
        if(tb){
            tb.toggle(true)
        } else {
            App.create('suprolftpd.view.LFTPD', btn)
        }
    }
}
])
