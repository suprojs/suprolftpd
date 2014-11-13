#!/bin/sh
# example of creating users for SUPRO lftpd channels
#
users_placeholders(){ # "$1" -- if set, delete users and directories
    for i in `printf %b'
1,1234
2,2345
'`
#ID,password
    do
        n=${i%%,*}
        u=supro.$n

        [ "$1" ] && {
            deluser "$u"
            rm -r "$u" >&7
            continue
        }
        mkdir "./$u/" && {
            p=${i##*,}
            (
                printf %b "$p\n$p" | adduser \
                    --no-create-home \
                    --force-badname  \
                    --uid "201410$n" "$u" \
                    --ingroup 'supro' \
                    --shell '/bin/sh'
            ) || {
                echo 'Error `passwd`!' >&7
                exit 2
            }
            n="./$u/lftp/"
            mkdir "$n"
            chown -R "$u" "$n"
            chgrp -R "supro" "$u"
            chgrp -R "supro" "$n"
        }
    done 7>&1 1>./log.txt 2>&1
}

users_placeholders "$1"
exit
