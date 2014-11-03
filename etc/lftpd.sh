#!/bin/sh
# uses work from v007 2013-04-19 of
#"The transportation daemon based on
#`lftp` - Sophisticated file transfer program"
# https://github.com/olecom/lftpd

# devel:
: << '.'
,--[shell@i686-pc-msys mingw32 git]--
|olecom@U32U-RX007R_OLE /d/supro/git-repo/supro/app_modules/suprolftpd (master)
|$ SUPRO_OBJ='LOOPBACK' PATH=../../bin ../../bin/sh -c "$PWD/etc/lftpd.sh"
`-----------
.

trap 'echo "e:
Unexpected Script Error! Use /bin/sh -x $0 to trace it.
"
set +e
trap "" 0
exit 76
' 0
#exec 7>&1 1>>"lftpd.sh.log" 2>&1 && set -x && echo "$*" #debug
set -e
#
# STDOUT and STDERR messages must obey one-char status e.g.:
# `echo "r: runs ok"`
# `echo "e: errors "`
#
_err(){
    printf 'e:%b' "$*" >&2
}

_exit(){
    trap "" 0
    exit "$1"
}

[ "$SUPRO_OBJ" ] || { echo 's:
Scripting of `lftp` under "windows-cygwin" or "linux-gnu" OSes
env: "$SUPRO_OBJ" is object this instance is runs for; it must be set

---- exit codes ----
= 0:  Normal Exit/ Terminated (`command`      in MS Windows)
= 1:  Any error  / Terminated (`exec command` in MS Windows)
= 2:  No TTY error (used in console development)

= 75: Normal slave Exit by master quit command
= 76: Unexpected Script Error
= 77: No config, print help
'
exit 77
}

#debug 777 -o debug.txt
LFTP_OPT='
set cmd:interactive false
set net:timeout 4
set cmd:long-running 4
set net:max-retries 4
set net:reconnect-interval-base 4
set net:reconnect-interval-multiplier 1
set xfer:disk-full-fatal true
set xfer:clobber on'

_date(){ # ISO date
    date -u '+%Y-%m-%dT%H:%M:%SZ'
}

#exec lftp -e "$LFTP_OPT"

while read MASTERS_CMD
do case "$MASTERS_CMD" in
    'echo_sh')
        echo 'r: echo_sh'
    ;;
    'LFTP_OPT')
        echo "r: $LFTP_OPT"
    ;;
    'quit')
        _exit 0
    ;;
    *)
        echo 'r'"`$MASTERS_CMD`" || echo "e: error running:
====
$MASTERS_CMD
===
"
    ;;
    esac
done
# this line must be reached only in console (e.g. development)
tty && _exit 0 || _exit 2
