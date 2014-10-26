#!/bin/sh
# uses work from v007 2013-04-19 of
#"The transportation daemon based on
#`lftp` - Sophisticated file transfer program"
# https://github.com/olecom/lftpd

set -e
#exec 1>>"log" 2>&1 && set -x && echo "$*" #debug

[ "$SUPRO_OBJ" ] || { echo '
Scripting of `lftp` under "windows-cygwin" or "linux-gnu" OSes
env: "$SUPRO_OBJ" is object this instance is runs for; it must be set

---- exit codes ----
= 1:  Unexpected Script Error
= 0:  Normal Exit
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


trap 'echo "
Unexpected Script Error! Use /bin/sh -x $0 to trace it.
"
set +e
trap "" 0
exit 1
' 0

_exit(){
trap "" 0
exit "$1"
}

_err(){
printf '%b' "[error] $*" >&2
#exit
}

echo "==$SUPRO_OBJ==== ok ==========="
#'open -u vito.supro_1,1234 sftp://86.57.246.51:443/lftp/' //+ auth + ' ' + host

#_err "No Config file $1 is there."


_date(){ # ISO date
date -u '+%Y-%m-%dT%H:%M:%SZ'
}

_con(){
printf "$@" >&7
}

exec lftp -e "$LFTP_OPT"
