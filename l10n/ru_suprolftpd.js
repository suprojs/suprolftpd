l10n.lftpd = { lang: 'ru' //!!! локализация используется только в UI (для простоты обновления)
    ,modname: "Обмен данными"
    ,tooltip: "запуск управления модулем suprolftpd"
    ,title: 'СУПРО по Интернету обмениваЮтся данными через `lftp`'
    ,refreshLog: 'Обновить журнал'
    ,noload: '== Не загружен журнал =='
    ,channels: 'каналы обмена данными'
    ,toolHelp: 'каналы на передачу и на приём независимы но стартуют/останавливаются вместе'
    ,go:   'Включить: приём/передачу информации'
    ,stop: 'Завершить: приём/передачу информации'
    ,run:  'Стартовать <b>lftp</b>'
    ,quit: 'Остановить <b>lftp</b>'
    ,sts:{
        transport:'Транспорт: передача информации',
        download:'<b>lftp</b> на получение',
        upload:'<b>lftp</b> на отправку',
        r:'lftp Работает',
        q:'lftp Завершил работу',
        f:'Шлёт файлы',
        g:'Транспорт работает',
        s:'Транспорт остановлен (без автостарта или не запущен)',
        e:'Ошибка',
        b:'Присутствует, но не сконфигурирован'
    }
    // backend
    ,'~lftp_not_found': "Не запущен lftp или неверно задан `id`"
    ,ENOENT: 'Файл не найден'
}
